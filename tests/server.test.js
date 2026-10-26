import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/serve.mjs';

const script = fileURLToPath(new URL('../scripts/serve.mjs', import.meta.url));

function request(server, urlPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: '127.0.0.1',
      port: server.address().port,
      path: urlPath,
      method,
      agent: false,
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
      response.on('error', reject);
    });
    request.setTimeout(3000, () => request.destroy(new Error('Request timeout')));
    request.on('error', reject);
    request.end();
  });
}

describe('local public-file server', () => {
  let directory;
  let root;
  let outside;
  let server;
  const html = '<!doctype html><title>fourBike fixture</title>';

  before(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'fourbike-server-'));
    root = path.join(directory, 'public');
    outside = path.join(directory, 'private');
    await mkdir(path.join(root, '.git'), { recursive: true });
    await mkdir(path.join(root, '.hidden'), { recursive: true });
    await mkdir(path.join(root, 'images'), { recursive: true });
    await mkdir(outside);
    await Promise.all([
      writeFile(path.join(root, 'index.html'), html),
      writeFile(path.join(root, '.env'), 'FIXTURE_ONLY=hidden'),
      writeFile(path.join(root, '.git', 'config'), 'fixture git metadata'),
      writeFile(path.join(root, '.hidden', 'secret.txt'), 'hidden fixture'),
      writeFile(path.join(outside, 'secret.txt'), 'outside fixture'),
      writeFile(path.join(root, 'café.txt'), 'Olá!'),
      ...['photo.JPG', 'photo.webp', 'photo.avif', 'font.woff2'].map(name =>
        writeFile(path.join(root, 'images', name), 'fixture bytes')),
    ]);
    server = createStaticServer({ root });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
  });

  after(async () => {
    if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (directory) {
      const resolved = path.resolve(directory);
      const intendedParent = path.resolve(tmpdir()) + path.sep;
      assert.ok(resolved.startsWith(intendedParent) && path.basename(resolved).startsWith('fourbike-server-'));
      await rm(resolved, { recursive: true, force: true });
    }
  });

  it('serves the public index with safe headers', async () => {
    const response = await request(server, '/?preview=1');
    assert.equal(response.status, 200);
    assert.equal(response.body, html);
    assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['cache-control'], 'no-cache');
  });

  it('returns HEAD metadata without a response body', async () => {
    const response = await request(server, '/', 'HEAD');
    assert.equal(response.status, 200);
    assert.equal(response.body, '');
    assert.equal(Number(response.headers['content-length']), Buffer.byteLength(html));
    const missing = await request(server, '/missing', 'HEAD');
    assert.equal(missing.status, 404);
    assert.equal(missing.body, '');
  });

  it('serves supported image and font MIME types and encoded Unicode paths', async () => {
    for (const [name, type] of Object.entries({
      'photo.JPG': 'image/jpeg',
      'photo.webp': 'image/webp',
      'photo.avif': 'image/avif',
      'font.woff2': 'font/woff2',
    })) {
      const response = await request(server, `/images/${name}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers['content-type'], type);
    }
    const unicode = await request(server, '/caf%C3%A9.txt');
    assert.equal(unicode.status, 200);
    assert.equal(unicode.body, 'Olá!');
  });

  it('does not list directories or expose hidden and internal files', async () => {
    for (const urlPath of ['/images/', '/missing', '/.env', '/%2eenv', '/.git/config', '/%2egit/config', '/.hidden/secret.txt', '/docs/discovery/03-catalogo-inicial.md', '/scripts/serve.mjs']) {
      const response = await request(server, urlPath);
      assert.equal(response.status, 404, urlPath);
      assert.equal(response.body, 'Página não encontrada.');
    }
  });

  it('rejects traversal, malformed encoding, controls and NTFS stream syntax', async () => {
    for (const urlPath of ['/..%2fprivate%2fsecret.txt', '/..%5cprivate%5csecret.txt']) {
      const response = await request(server, urlPath);
      assert.ok([400, 404].includes(response.status), urlPath);
      assert.ok(!response.body.includes('outside fixture'));
    }
    for (const urlPath of ['/%', '/%E0%A4%A', '/index.html%00', '/index.html%3Astream']) {
      const response = await request(server, urlPath);
      assert.equal(response.status, 400, urlPath);
    }
  });

  it('rejects requests that could mutate resources', async () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const response = await request(server, '/', method);
      assert.equal(response.status, 405);
      assert.equal(response.headers.allow, 'GET, HEAD');
    }
  });

  it('does not follow junctions or symlinks outside the public root or into hidden directories', async context => {
    try {
      await symlink(outside, path.join(root, 'outside-link'), 'junction');
      await symlink(path.join(root, '.hidden'), path.join(root, 'visible-alias'), 'junction');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) {
        context.skip(`This environment does not allow symlinks/junctions: ${error.code}`);
        return;
      }
      throw error;
    }
    for (const urlPath of ['/outside-link/secret.txt', '/visible-alias/secret.txt']) {
      const response = await request(server, urlPath);
      assert.equal(response.status, 404, urlPath);
      assert.equal(response.body, 'Página não encontrada.');
    }
  });

  it('explains an invalid CLI port and exits without starting a server', () => {
    for (const port of ['abc', '-1', '65536', '1.5', '']) {
      const result = spawnSync(process.execPath, [script], {
        env: { ...process.env, PORT: port },
        encoding: 'utf8',
        timeout: 3000,
        windowsHide: true,
      });
      assert.equal(result.status, 1, port);
      assert.match(result.stderr, /PORT inválida/);
      assert.doesNotMatch(result.stderr, /\n\s+at /);
    }
  });

  it('explains an occupied CLI port without killing the existing listener', async () => {
    const result = spawnSync(process.execPath, [script], {
      env: { ...process.env, PORT: String(server.address().port) },
      encoding: 'utf8',
      timeout: 3000,
      windowsHide: true,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /já está em uso/);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
    assert.equal((await request(server, '/')).status, 200);
  });
});
