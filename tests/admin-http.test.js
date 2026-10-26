import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApplicationServer } from '../server/application.mjs';
import { setupAdmin } from '../server/auth.mjs';
import { models as initialModels } from '../public/js/data/models.js';

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const adminRoot = fileURLToPath(new URL('../admin/', import.meta.url));
const username = 'http-test-admin';
const password = 'Fixture-only-http-password-123!';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZNsAAAAASUVORK5CYII=', 'base64');

async function removeFixtureDirectory(directory) {
  const target = path.resolve(directory);
  assert.equal(path.dirname(target), path.resolve(tmpdir()));
  assert.ok(path.basename(target).startsWith('fourbike-admin-http-'));
  await rm(target, { recursive:true, force:true });
}

async function fixture({ configured = true, ...options } = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'fourbike-admin-http-'));
  let server;
  let origin;

  async function start() {
    server = await createApplicationServer({ publicRoot, adminRoot, dataDir, trustProxy:false, publicOrigin:null, ...options });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    origin = `http://127.0.0.1:${server.address().port}`;
  }

  async function stop() {
    if (!server?.listening) return;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }

  function request(urlPath, { method = 'GET', body, raw, headers = {}, cookie, csrf, sendOrigin = true, chunked = false } = {}) {
    let payload;
    const requestHeaders = { ...(sendOrigin ? { Origin:origin } : {}), ...headers };
    if (body !== undefined) {
      payload = Buffer.from(JSON.stringify(body));
      requestHeaders['Content-Type'] = 'application/json';
    } else if (raw !== undefined) {
      payload = raw;
    }
    if (chunked) requestHeaders['Transfer-Encoding'] = 'chunked';
    else if (payload) requestHeaders['Content-Length'] = payload.length;
    if (cookie) requestHeaders.Cookie = cookie;
    if (csrf !== undefined) requestHeaders['X-CSRF-Token'] = csrf;
    return new Promise((resolve, reject) => {
      const req = httpRequest({
        hostname:'127.0.0.1', port:server.address().port, path:urlPath,
        method, headers:requestHeaders, agent:false
      }, response => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('error', reject);
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const text = buffer.toString('utf8');
          let json;
          try { json = JSON.parse(text); } catch {}
          resolve({ status:response.statusCode, headers:response.headers, text, buffer, json });
        });
      });
      req.setTimeout(10000, () => req.destroy(new Error('HTTP fixture timeout')));
      req.on('error', reject);
      req.end(payload);
    });
  }

  async function login() {
    const response = await request('/api/admin/login', { method:'POST', body:{ username,password } });
    assert.equal(response.status, 200, response.text);
    assert.equal(response.json.authenticated, true);
    assert.ok(response.json.csrfToken);
    const header = response.headers['set-cookie']?.find(value => value.startsWith('fourbike_admin='));
    assert.ok(header, 'Successful login must set the administrative session cookie');
    return { cookie:header.split(';')[0], csrf:response.json.csrfToken, header, response };
  }

  try {
    if (configured) await setupAdmin({ dataDir,username,password });
    await start();
    return {
      dataDir, request, login, get origin() { return origin; },
      restart:async () => { await stop(); await start(); },
      close:async () => {
        await stop();
        await removeFixtureDirectory(dataDir);
      }
    };
  } catch (error) {
    await stop();
    await removeFixtureDirectory(dataDir);
    throw error;
  }
}

async function usingFixture(callback, options) {
  const app = await fixture(options);
  try { await callback(app); } finally { await app.close(); }
}

function draft(name = 'Modelo de teste HTTP') {
  return { ...structuredClone(initialModels[0]), id:undefined, name, published:false };
}

async function createModel(app, auth, changes = {}) {
  const response = await app.request('/api/admin/models', {
    method:'POST', ...auth, body:{ ...draft(), ...changes }
  });
  assert.equal(response.status, 201, response.text);
  assert.ok(response.json.model.id);
  assert.ok(Number.isInteger(response.json.model.revision));
  return response.json.model;
}

test('admin HTML is separate from the public navigation and exposes no credentials', async () => {
  await usingFixture(async app => {
    const publicPage = await app.request('/');
    assert.equal(publicPage.status, 200);
    assert.doesNotMatch(publicPage.text, /href=["'][^"']*\/admin(?:[/?#"'])/i);
    const page = await app.request('/admin');
    assert.equal(page.status, 200, page.text);
    assert.match(page.headers['content-type'], /text\/html/);
    assert.match(page.headers['cache-control'], /no-store/);
    assert.match(page.headers['x-robots-tag'] ?? '', /noindex/);
    assert.ok(page.headers['content-security-policy']?.includes("frame-ancestors 'none'") || page.headers['x-frame-options'] === 'DENY');
    assert.doesNotMatch(page.text, new RegExp(password));
    const publicModels = await app.request('/api/models');
    assert.equal(publicModels.status, 200);
    assert.equal(publicModels.json.models.length, 7);
  });
});

test('unconfigured administration requires setup instead of providing a public registration route', async () => {
  await usingFixture(async app => {
    const session = await app.request('/api/admin/session');
    assert.equal(session.status, 200);
    assert.equal(session.json.authenticated, false);
    assert.equal(session.json.setupRequired, true);
    const registration = await app.request('/api/admin/setup', { method:'POST', body:{ username,password } });
    assert.ok([401,404,405].includes(registration.status), registration.text);
    const login = await app.request('/api/admin/login', { method:'POST', body:{ username,password } });
    assert.notEqual(login.status, 200);
  }, { configured:false });
});

test('private catalog and upload endpoints reject requests without a session', async () => {
  await usingFixture(async app => {
    for (const [url, options] of [
      ['/api/admin/models', {}],
      ['/api/admin/models', { method:'POST', body:draft() }],
      ['/api/admin/models/x18', { method:'PUT', body:draft() }],
      ['/api/admin/models/x18', { method:'DELETE', body:{ revision:1 } }],
      ['/api/admin/uploads', { method:'POST', raw:png, headers:{ 'Content-Type':'image/png' } }]
    ]) {
      const response = await app.request(url, options);
      assert.equal(response.status, 401, `${url}: ${response.text}`);
      assert.equal(typeof response.json.error, 'string');
    }
    for (const url of ['/data/catalog.json','/data/admin-user.json','/admin-user.json','/server/auth.mjs','/.env']) {
      assert.equal((await app.request(url)).status, 404, url);
    }
  });
});

test('login protects its origin and accepts only the configured administrator', async () => {
  await usingFixture(async app => {
    const wrongOrigin = await app.request('/api/admin/login', {
      method:'POST', body:{ username,password }, headers:{ Origin:'https://other-site.invalid' }
    });
    assert.equal(wrongOrigin.status, 403, wrongOrigin.text);
    const missingOrigin = await app.request('/api/admin/login', { method:'POST', body:{ username,password }, sendOrigin:false });
    assert.equal(missingOrigin.status, 403, missingOrigin.text);
    const wrongPassword = await app.request('/api/admin/login', { method:'POST', body:{ username,password:'wrong-test-password' } });
    assert.equal(wrongPassword.status, 401, wrongPassword.text);
    const auth = await app.login();
    assert.match(auth.header, /HttpOnly/i);
    assert.match(auth.header, /SameSite=Strict/i);
    assert.match(auth.header, /Path=\//i);
    assert.doesNotMatch(auth.header, /;\s*Secure(?:;|$)/i, 'Local HTTP must remain usable');
    assert.match(auth.response.headers['cache-control'], /no-store/);
    const session = await app.request('/api/admin/session', auth);
    assert.equal(session.json.authenticated, true);
    assert.equal(session.json.username, username);
    assert.equal(session.json.csrfToken, auth.csrf);
    assert.doesNotMatch(JSON.stringify(session.json), /passwordHash|"salt"/);
  });
});

test('authenticated mutations require matching origin and the session CSRF token', async () => {
  await usingFixture(async app => {
    const auth = await app.login();
    const missing = await app.request('/api/admin/models', { method:'POST', cookie:auth.cookie, body:draft() });
    assert.equal(missing.status, 403, missing.text);
    const bad = await app.request('/api/admin/models', { method:'POST', ...auth, csrf:'wrong-test-token', body:draft() });
    assert.equal(bad.status, 403, bad.text);
    const crossSite = await app.request('/api/admin/models', {
      method:'POST', ...auth, body:draft(), headers:{ Origin:'https://other-site.invalid' }
    });
    assert.equal(crossSite.status, 403, crossSite.text);
    const catalog = await app.request('/api/admin/models', auth);
    assert.equal(catalog.status, 200);
    assert.equal(catalog.json.models.length, 7);
  });
});

test('HTTPS cookies honor only an explicitly trusted proxy or configured public origin', async () => {
  await usingFixture(async app => {
    const response = await app.request('/api/admin/login', {
      method:'POST', body:{ username,password }, headers:{ 'X-Forwarded-Proto':'https' }
    });
    assert.equal(response.status, 200, response.text);
    assert.doesNotMatch(response.headers['set-cookie'].join(';'), /;\s*Secure(?:;|$)/i);
  });
  await usingFixture(async app => {
    const response = await app.request('/api/admin/login', {
      method:'POST', body:{ username,password },
      headers:{ Origin:app.origin.replace('http:', 'https:'), 'X-Forwarded-Proto':'https' }
    });
    assert.equal(response.status, 200, response.text);
    assert.match(response.headers['set-cookie'].join(';'), /;\s*Secure(?:;|$)/i);
  }, { trustProxy:true });
  await usingFixture(async app => {
    const internal = await app.request('/api/admin/login', { method:'POST', body:{ username,password } });
    assert.equal(internal.status, 403, internal.text);
    const response = await app.request('/api/admin/login', {
      method:'POST', body:{ username,password }, headers:{ Origin:'https://fourbike.example' }
    });
    assert.equal(response.status, 200, response.text);
    assert.match(response.headers['set-cookie'].join(';'), /;\s*Secure(?:;|$)/i);
  }, { publicOrigin:'https://fourbike.example' });
});

test('create, edit, publish, hide and delete affect the real public catalog', async () => {
  await usingFixture(async app => {
    const auth = await app.login();
    let model = await createModel(app, auth);
    let visible = await app.request('/api/models');
    assert.ok(!visible.json.models.some(item => item.id === model.id));
    let update = await app.request(`/api/admin/models/${model.id}`, {
      method:'PUT', ...auth, body:{ ...model, name:'Modelo atualizado HTTP', published:true }
    });
    assert.equal(update.status, 200, update.text);
    model = update.json.model;
    assert.equal(model.name, 'Modelo atualizado HTTP');
    visible = await app.request('/api/models');
    assert.ok(visible.json.models.some(item => item.id === model.id && item.name === model.name));
    update = await app.request(`/api/admin/models/${model.id}`, { method:'PUT', ...auth, body:{ ...model, published:false } });
    assert.equal(update.status, 200, update.text);
    model = update.json.model;
    visible = await app.request('/api/models');
    assert.ok(!visible.json.models.some(item => item.id === model.id));
    const removal = await app.request(`/api/admin/models/${model.id}`, { method:'DELETE', ...auth, body:{ revision:model.revision } });
    assert.equal(removal.status, 200, removal.text);
    assert.equal(removal.json.ok, true);
    const catalog = await app.request('/api/admin/models', auth);
    assert.ok(!catalog.json.models.some(item => item.id === model.id));
  });
});

test('stale updates and deletes return conflict without overwriting current data', async () => {
  await usingFixture(async app => {
    const auth = await app.login();
    const original = await createModel(app, auth);
    const update = await app.request(`/api/admin/models/${original.id}`, {
      method:'PUT', ...auth, body:{ ...original, description:'Versão atual, sem sobrescrita.' }
    });
    assert.equal(update.status, 200, update.text);
    const staleUpdate = await app.request(`/api/admin/models/${original.id}`, {
      method:'PUT', ...auth, body:{ ...original, description:'Versão antiga que deve ser recusada.' }
    });
    assert.equal(staleUpdate.status, 409, staleUpdate.text);
    const staleDelete = await app.request(`/api/admin/models/${original.id}`, {
      method:'DELETE', ...auth, body:{ revision:original.revision }
    });
    assert.equal(staleDelete.status, 409, staleDelete.text);
    const catalog = await app.request('/api/admin/models', auth);
    assert.equal(catalog.json.models.find(item => item.id === original.id).description, 'Versão atual, sem sobrescrita.');
  });
});

test('concurrent updates from the same revision cannot overwrite each other', async () => {
  await usingFixture(async app => {
    const auth = await app.login();
    const original = await createModel(app, auth);
    const updates = await Promise.all(['Primeira edição concorrente.','Segunda edição concorrente.'].map(description =>
      app.request(`/api/admin/models/${original.id}`, { method:'PUT', ...auth, body:{ ...original,description } })
    ));
    assert.deepEqual(updates.map(response => response.status).sort(), [200,409]);
    const saved = updates.find(response => response.status === 200).json.model;
    const catalog = await app.request('/api/admin/models', auth);
    assert.deepEqual(catalog.json.models.find(item => item.id === original.id), saved);
    assert.equal(saved.revision, original.revision + 1);
  });
});

test('server-side validation rejects unsafe model content and malformed payloads', async () => {
  await usingFixture(async app => {
    const auth = await app.login();
    for (const changes of [
      { name:'' },
      { photos:[] },
      { published:'false' },
      { photos:[{ src:'javascript:alert(1)', studio:true }] },
      { photos:[{ src:'https://other-site.invalid/photo.png', studio:true }] },
      { photos:[{ src:'/assets/models/../../.env', studio:true }] },
      { photos:[{ src:'/media/not-an-upload.png', studio:true }] }
    ]) {
      const response = await app.request('/api/admin/models', { method:'POST', ...auth, body:{ ...draft(), ...changes } });
      assert.ok([400,422].includes(response.status), `${JSON.stringify(changes)}: ${response.status} ${response.text}`);
    }
    const malformed = await app.request('/api/admin/models', {
      method:'POST', ...auth, raw:Buffer.from('{'), headers:{ 'Content-Type':'application/json' }
    });
    assert.equal(malformed.status, 400, malformed.text);
  });
});

test('uploaded photos are private until published and can be previewed after login', async () => {
  await usingFixture(async app => {
    const auth = await app.login();
    const upload = await app.request('/api/admin/uploads', {
      method:'POST', ...auth, raw:png, headers:{ 'Content-Type':'image/png' }
    });
    assert.equal(upload.status, 201, upload.text);
    const photo = upload.json.photo;
    assert.match(photo.src, /^\/media\/[a-zA-Z0-9-]+\.png$/);
    assert.equal((await app.request(photo.src)).status, 404);
    const preview = await app.request(photo.src, auth);
    assert.equal(preview.status, 200, preview.text);
    assert.match(preview.headers['content-type'], /^image\/png/);
    assert.match(preview.headers['x-content-type-options'], /nosniff/);
    assert.deepEqual(preview.buffer, png);
    let model = await createModel(app, auth, { photos:[photo], published:true });
    assert.equal((await app.request(photo.src)).status, 200);
    const hidden = await app.request(`/api/admin/models/${model.id}`, { method:'PUT', ...auth, body:{ ...model, published:false } });
    assert.equal(hidden.status, 200, hidden.text);
    assert.equal((await app.request(photo.src)).status, 404);
    assert.equal((await app.request(photo.src, auth)).status, 200);
  });
});

test('image uploads reject SVG, spoofed types and files over 5 MiB', async () => {
  await usingFixture(async app => {
    const auth = await app.login();
    for (const [type, raw] of [
      ['image/svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
      ['image/png', Buffer.from('<html>not an image</html>')],
      ['image/jpeg', png]
    ]) {
      const response = await app.request('/api/admin/uploads', { method:'POST', ...auth, raw, headers:{ 'Content-Type':type } });
      assert.ok([400,415,422].includes(response.status), `${type}: ${response.status} ${response.text}`);
    }
    for (const chunked of [false, true]) {
      const oversized = await app.request('/api/admin/uploads', {
        method:'POST', ...auth, raw:Buffer.alloc(5 * 1024 * 1024 + 1), headers:{ 'Content-Type':'image/png' }, chunked
      });
      assert.equal(oversized.status, 413, `${chunked ? 'chunked' : 'Content-Length'}: ${oversized.text}`);
    }
  });
});

test('logout clears the cookie and revokes the server-side session', async () => {
  await usingFixture(async app => {
    const auth = await app.login();
    const response = await app.request('/api/admin/logout', { method:'POST', ...auth });
    assert.equal(response.status, 200, response.text);
    assert.match(response.headers['set-cookie']?.join(';') ?? '', /Max-Age=0|Expires=/i);
    const session = await app.request('/api/admin/session', auth);
    assert.equal(session.json.authenticated, false);
    const catalog = await app.request('/api/admin/models', auth);
    assert.equal(catalog.status, 401);
  });
});

test('resetting the administrator credentials revokes previously issued sessions', async () => {
  await usingFixture(async app => {
    const auth = await app.login();
    await setupAdmin({ dataDir:app.dataDir,username,password,reset:true });
    const session = await app.request('/api/admin/session', auth);
    assert.equal(session.json.authenticated, false);
    const catalog = await app.request('/api/admin/models', auth);
    assert.equal(catalog.status, 401, catalog.text);
    await app.login();
  });
});

test('catalog changes persist after restart, including an intentionally empty catalog', async () => {
  await usingFixture(async app => {
    let auth = await app.login();
    const model = await createModel(app, auth, { name:'Persistência HTTP', published:true });
    await app.restart();
    auth = await app.login();
    let catalog = await app.request('/api/admin/models', auth);
    assert.ok(catalog.json.models.some(item => item.id === model.id));
    for (const item of catalog.json.models) {
      const response = await app.request(`/api/admin/models/${item.id}`, { method:'DELETE', ...auth, body:{ revision:item.revision } });
      assert.equal(response.status, 200, response.text);
    }
    await app.restart();
    auth = await app.login();
    catalog = await app.request('/api/admin/models', auth);
    assert.deepEqual(catalog.json.models, []);
    assert.deepEqual((await app.request('/api/models')).json.models, []);
    const credentialFile = await readFile(path.join(app.dataDir, 'admin-user.json'), 'utf8');
    assert.ok(!credentialFile.includes(password), 'Only a password hash may be persisted');
  });
});

test('repeated invalid login attempts are throttled', async () => {
  await usingFixture(async app => {
    let throttled;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const response = await app.request('/api/admin/login', { method:'POST', body:{ username,password:'invalid-http-test-password' } });
      if (response.status === 429) { throttled = response; break; }
      assert.equal(response.status, 401, response.text);
    }
    assert.ok(throttled, 'Repeated invalid passwords must receive HTTP 429');
    assert.ok(Number(throttled.headers['retry-after']) > 0);
    assert.equal(typeof throttled.json.error, 'string');
  });
});

test('private data cannot be placed inside either served directory or an alias of it', async context => {
  const directory = await mkdtemp(path.join(tmpdir(), 'fourbike-admin-http-'));
  try {
    const publicDirectory = path.join(directory, 'public');
    const adminDirectory = path.join(directory, 'admin');
    await Promise.all([mkdir(publicDirectory), mkdir(adminDirectory)]);
    for (const served of [publicDirectory, adminDirectory]) {
      for (const dataDir of [served, path.join(served, 'private', 'nested')]) {
        await assert.rejects(createApplicationServer({ publicRoot:publicDirectory, adminRoot:adminDirectory, dataDir }), /dados privados.*fora/i);
      }
    }
    const alias = path.join(directory, 'admin-alias');
    try { await symlink(adminDirectory, alias, 'junction'); }
    catch (error) {
      if (!['EPERM','EACCES','ENOSYS'].includes(error.code)) throw error;
      context.diagnostic(`Alias check unavailable in this environment: ${error.code}`);
      return;
    }
    await assert.rejects(createApplicationServer({
      publicRoot:publicDirectory, adminRoot:adminDirectory, dataDir:path.join(alias, 'not-yet-created', 'private')
    }), /dados privados.*fora/i);
  } finally {
    await removeFixtureDirectory(directory);
  }
});
