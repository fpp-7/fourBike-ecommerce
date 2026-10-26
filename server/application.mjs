import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { createStaticHandler } from './static.mjs';
import { createAuth } from './auth.mjs';
import { createCatalogStore, MAX_UPLOAD_BYTES } from './catalog-store.mjs';
import { models as seedModels } from '../public/js/data/models.js';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const cookieName = 'fourbike_admin';
const sessionSeconds = 8 * 60 * 60;

async function resolvedPath(value) {
  const target = path.resolve(value);
  try { return await realpath(target); }
  catch (error) {
    const parent = path.dirname(target);
    if (error.code !== 'ENOENT' || parent === target) throw error;
    return path.join(await resolvedPath(parent), path.basename(target));
  }
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function httpError(message, status = 400) { return Object.assign(new Error(message), { status }); }
function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type':'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}
function sessionId(request) {
  const raw = (request.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`));
  return raw?.slice(cookieName.length + 1);
}
function body(request, maximum) {
  return new Promise((resolve, reject) => {
    let oversized = Number(request.headers['content-length']) > maximum;
    let size = 0; let done = false; const chunks = [];
    request.on('data', chunk => {
      if (done) return;
      size += chunk.length;
      if (size > maximum) oversized = true;
      // Consume rejected uploads without buffering them. Ending the response while
      // the client is still sending can reset the socket before it receives 413.
      if (oversized) { chunks.length = 0; return; }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (done) return;
      done = true;
      if (oversized) reject(httpError('O arquivo ou formulário ultrapassa o tamanho permitido.', 413));
      else resolve(Buffer.concat(chunks));
    });
    request.on('error', () => { if (!done) { done = true; reject(httpError('Não foi possível ler o envio.')); } });
    request.on('aborted', () => { if (!done) { done = true; reject(httpError('Envio interrompido.')); } });
  });
}
async function jsonBody(request) {
  if ((request.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') throw httpError('Envie o formulário no formato esperado.', 415);
  try {
    const value = JSON.parse((await body(request, 64 * 1024)).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error();
    return value;
  } catch (error) { if (error.status) throw error; throw httpError('Formulário inválido.'); }
}

export async function createApplicationServer({
  publicRoot = path.join(projectRoot, 'public'),
  adminRoot = path.join(projectRoot, 'admin'),
  dataDir = process.env.FOURBIKE_DATA_DIR || path.join(projectRoot, 'data'),
  trustProxy = process.env.FOURBIKE_TRUST_PROXY === '1',
  publicOrigin = process.env.FOURBIKE_PUBLIC_ORIGIN || null,
} = {}) {
  const [privateDirectory, publicDirectory, adminDirectory] = await Promise.all([
    resolvedPath(dataDir), realpath(publicRoot), realpath(adminRoot)
  ]);
  if ([publicDirectory, adminDirectory].some(root => isInside(root, privateDirectory))) {
    throw new TypeError('Os dados privados precisam ficar fora das pastas pública e administrativa.');
  }
  const publicHandler = createStaticHandler({ root:publicRoot });
  const adminHandler = createStaticHandler({ root:adminRoot });
  const auth = await createAuth({ dataDir });
  const catalog = await createCatalogStore({ dataDir, publicRoot, seedModels });
  const configuredOrigin = publicOrigin ? new URL(publicOrigin).origin : null;
  if (configuredOrigin && !/^https?:/.test(configuredOrigin)) throw Error('Origem pública inválida.');

  function requestOrigin(request) {
    const forwarded = trustProxy && request.headers['x-forwarded-proto']?.split(',')[0].trim() === 'https';
    return `${request.socket.encrypted || forwarded ? 'https' : 'http'}://${request.headers.host}`;
  }
  function verifyOrigin(request) {
    const incoming = request.headers.origin;
    let origin;
    try { origin = new URL(incoming).origin; } catch { throw httpError('Origem da solicitação inválida.', 403); }
    if (origin !== (configuredOrigin || requestOrigin(request)) || request.headers['sec-fetch-site'] === 'cross-site') throw httpError('Origem da solicitação inválida.', 403);
  }
  function setCookie(request, response, id, clear = false) {
    const secure = (configuredOrigin || requestOrigin(request)).startsWith('https:');
    response.setHeader('Set-Cookie', `${cookieName}=${clear ? '' : id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : sessionSeconds}${secure ? '; Secure' : ''}`);
  }
  function requireSession(request) {
    const session = auth.getSession(sessionId(request));
    if (!session) throw httpError('Entre novamente para continuar.', 401);
    return session;
  }
  function sessionPayload(session) { return { authenticated:true, username:session.username, csrfToken:session.csrfToken }; }

  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    let url;
    try { url = new URL(request.url, 'http://localhost'); } catch { sendJson(response, 400, {error:'Endereço inválido.'}); return; }
    const pathname = url.pathname;
    try {
      if (pathname === '/api/models') {
        response.setHeader('Cache-Control', 'no-store');
        if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); throw httpError('Método não permitido.', 405); }
        sendJson(response, 200, { models:await catalog.list({ publishedOnly:true }) }); return;
      }
      if (pathname.startsWith('/api/admin/')) {
        response.setHeader('Cache-Control', 'no-store');
        if (!['GET','HEAD'].includes(request.method)) verifyOrigin(request);
        if (pathname === '/api/admin/session' && request.method === 'GET') {
          const session = auth.getSession(sessionId(request));
          sendJson(response, 200, session ? sessionPayload(session) : { authenticated:false, setupRequired:!auth.isConfigured() }); return;
        }
        if (pathname === '/api/admin/login' && request.method === 'POST') {
          const input = await jsonBody(request);
          const previous = sessionId(request);
          const session = await auth.login({ username:input.username, password:input.password, clientId:request.socket.remoteAddress });
          if (previous) auth.logout(previous);
          setCookie(request, response, session.id);
          sendJson(response, 200, sessionPayload(session)); return;
        }
        const session = requireSession(request);
        if (!['GET','HEAD'].includes(request.method) && !auth.verifyCsrf(session, request.headers['x-csrf-token'])) throw httpError('Sua sessão precisa ser atualizada. Entre novamente.', 403);
        if (pathname === '/api/admin/logout' && request.method === 'POST') {
          auth.logout(session.id); setCookie(request, response, '', true); sendJson(response, 200, { ok:true }); return;
        }
        if (pathname === '/api/admin/models' && request.method === 'GET') { sendJson(response, 200, { models:await catalog.list() }); return; }
        if (pathname === '/api/admin/models' && request.method === 'POST') { sendJson(response, 201, { model:await catalog.create(await jsonBody(request)) }); return; }
        const match = pathname.match(/^\/api\/admin\/models\/([a-z0-9][a-z0-9-]{0,79})$/);
        if (match && request.method === 'PUT') { sendJson(response, 200, { model:await catalog.update(match[1], await jsonBody(request)) }); return; }
        if (match && request.method === 'DELETE') { await catalog.remove(match[1], await jsonBody(request)); sendJson(response, 200, { ok:true }); return; }
        if (pathname === '/api/admin/uploads' && request.method === 'POST') {
          const photo = await catalog.upload(await body(request, MAX_UPLOAD_BYTES), { contentType:request.headers['content-type'] });
          sendJson(response, 201, { photo }); return;
        }
        throw httpError('Operação não encontrada.', 404);
      }
      if (pathname.startsWith('/api/')) throw httpError('Operação não encontrada.', 404);
      if (pathname.startsWith('/media/')) {
        if (!['GET','HEAD'].includes(request.method)) throw httpError('Método não permitido.', 405);
        const session = auth.getSession(sessionId(request));
        const image = await catalog.readMedia(pathname.slice('/media/'.length), { publishedOnly:!session });
        response.writeHead(200, { 'Content-Type':image.contentType, 'Content-Length':image.data.length, 'Cache-Control':'no-store' });
        response.end(request.method === 'HEAD' ? undefined : image.data); return;
      }
      if (pathname === '/admin' || pathname.startsWith('/admin/')) {
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('X-Robots-Tag', 'noindex, nofollow');
        response.setHeader('X-Frame-Options', 'DENY');
        response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
        request.url = pathname === '/admin' || pathname === '/admin/' ? '/' : pathname.slice('/admin'.length) + url.search;
        await adminHandler(request, response); return;
      }
      await publicHandler(request, response);
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
      response.setHeader('Cache-Control', 'no-store');
      if (error.retryAfter) response.setHeader('Retry-After', String(error.retryAfter));
      if (status === 500) console.error('Falha na aplicação:', error);
      sendJson(response, status, { error:status === 500 ? 'Não foi possível concluir a operação. Tente novamente.' : error.message });
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  return server;
}
