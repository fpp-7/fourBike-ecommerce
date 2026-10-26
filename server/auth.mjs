import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile, rename, link, unlink } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const credentialsFilename = 'admin-user.json';
const parameters = Object.freeze({ N:32768, r:8, p:1, maxmem:64 * 1024 * 1024 });

export class AuthError extends Error {
  constructor(message, status = 401, code = 'invalid_credentials', retryAfter) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
    if (retryAfter) this.retryAfter = retryAfter;
  }
}

function validateCredentialsFile(data) {
  if (data?.version !== 1 || typeof data.id !== 'string'
      || typeof data.username !== 'string' || !/^[a-zA-Z0-9._-]{3,64}$/.test(data.username)
      || !/^[0-9a-f]{64}$/.test(data.salt) || !/^[0-9a-f]{128}$/.test(data.passwordHash)) {
    throw new AuthError('Configuração do administrador indisponível.', 503, 'admin_unavailable');
  }
  return data;
}

function constantTimeText(first, second) {
  if (typeof first !== 'string' || typeof second !== 'string') return false;
  const left = Buffer.from(first);
  const right = Buffer.from(second);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function setupAdmin({ dataDir, username, password, reset = false }) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9._-]{3,64}$/.test(username.trim())) {
    throw new AuthError('Use um usuário com 3 a 64 letras, números, pontos, hífens ou sublinhados.', 400, 'invalid_username');
  }
  if (typeof password !== 'string' || password.length < 12 || password.length > 128 || /[\u0000-\u001f\u007f]/.test(password)) {
    throw new AuthError('Use uma senha entre 12 e 128 caracteres, sem quebras de linha.', 400, 'invalid_password');
  }
  await mkdir(dataDir, { recursive:true, mode:0o700 });
  const target = path.join(dataDir, credentialsFilename);
  if (!reset) {
    try {
      await readFile(target);
      throw new AuthError('Já existe um administrador. Use --reset para substituir o acesso.', 409, 'admin_exists');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const salt = randomBytes(32).toString('hex');
  const passwordHash = (await scrypt(password, salt, 64, parameters)).toString('hex');
  const credentials = { version:1, id:randomUUID(), username:username.trim(), salt, passwordHash, updatedAt:new Date().toISOString() };
  const temporary = path.join(dataDir, `.admin-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, JSON.stringify(credentials, null, 2) + '\n', { flag:'wx', mode:0o600 });
    if (reset) await rename(temporary, target);
    else {
      try { await link(temporary, target); }
      catch (error) {
        if (error.code === 'EEXIST') throw new AuthError('Já existe um administrador. Use --reset para substituir o acesso.', 409, 'admin_exists');
        throw error;
      }
      await unlink(temporary);
    }
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  return { username:credentials.username };
}

export async function createAuth({
  dataDir,
  sessionTTL = 8 * 60 * 60 * 1000,
  clock = Date.now,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
  globalMaxAttempts = 50,
} = {}) {
  if (!dataDir) throw new TypeError('dataDir is required');
  const filename = path.join(dataDir, credentialsFilename);
  const sessions = new Map();
  const attempts = new Map();
  let globalAttempts = [];
  let credentials = null;
  let inFlight = 0;

  function refreshCredentials() {
    let next = null;
    try { next = validateCredentialsFile(JSON.parse(readFileSync(filename, 'utf8'))); }
    catch (error) {
      if (error.code !== 'ENOENT') {
        if (error instanceof AuthError) throw error;
        throw new AuthError('Configuração do administrador indisponível.', 503, 'admin_unavailable');
      }
    }
    if (next?.id !== credentials?.id) sessions.clear();
    credentials = next;
    return credentials;
  }

  function prune() {
    const now = clock();
    for (const [id, session] of sessions) if (session.expiresAt <= now) sessions.delete(id);
    for (const [id, values] of attempts) {
      const current = values.filter(timestamp => timestamp > now - windowMs);
      if (current.length) attempts.set(id, current); else attempts.delete(id);
    }
    globalAttempts = globalAttempts.filter(timestamp => timestamp > now - windowMs);
  }

  function throttle(clientId) {
    prune();
    const values = attempts.get(clientId) ?? [];
    if (inFlight >= 3 || values.length >= maxAttempts || globalAttempts.length >= globalMaxAttempts) {
      const first = values.length >= maxAttempts ? values[0] : globalAttempts[0];
      const retryAfter = first ? Math.max(1, Math.ceil((first + windowMs - clock()) / 1000)) : 1;
      throw new AuthError('Muitas tentativas. Aguarde um pouco e tente novamente.', 429, 'rate_limited', retryAfter);
    }
    values.push(clock());
    attempts.set(clientId, values);
    globalAttempts.push(clock());
  }

  refreshCredentials();
  return {
    isConfigured() { return Boolean(refreshCredentials()); },
    async login({ username, password, clientId = 'local' } = {}) {
      const current = refreshCredentials();
      if (!current) throw new AuthError('O administrador ainda não foi configurado.', 503, 'admin_not_configured');
      const client = String(clientId).slice(0, 200);
      throttle(client);
      inFlight += 1;
      try {
        if (typeof username !== 'string' || username.length > 64 || typeof password !== 'string' || password.length > 128) {
          throw new AuthError('Usuário ou senha inválidos.');
        }
        const calculated = await scrypt(password, current.salt, 64, parameters);
        const passwordValid = timingSafeEqual(calculated, Buffer.from(current.passwordHash, 'hex'));
        const usernameValid = constantTimeText(username.trim().toLowerCase(), current.username.toLowerCase());
        if (!usernameValid || !passwordValid) throw new AuthError('Usuário ou senha inválidos.');
        // A concurrent CLI reset cannot grant a session for the previous credential.
        if (refreshCredentials()?.id !== current.id) throw new AuthError('Usuário ou senha inválidos.');
        attempts.delete(client);
        prune();
        while (sessions.size >= 32) sessions.delete(sessions.keys().next().value);
        const session = { id:randomBytes(32).toString('hex'), csrfToken:randomBytes(32).toString('hex'), username:current.username, expiresAt:clock() + sessionTTL };
        sessions.set(session.id, session);
        return { ...session };
      } finally { inFlight -= 1; }
    },
    getSession(id) {
      refreshCredentials();
      prune();
      if (typeof id !== 'string' || !/^[0-9a-f]{64}$/.test(id)) return null;
      const session = sessions.get(id);
      return session ? { ...session } : null;
    },
    logout(id) { sessions.delete(id); },
    verifyCsrf(session, token) {
      if (!session || session.expiresAt <= clock() || !sessions.has(session.id)) return false;
      return constantTimeText(session.csrfToken, token);
    },
  };
}
