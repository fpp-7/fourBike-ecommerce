import { createServer } from 'node:http';
import { realpathSync, statSync } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function hasHiddenSegment(relative) {
  return relative.split(/[\\/]/).some(segment => segment.startsWith('.'));
}

function reply(response, status, message, method, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...headers,
  });
  response.end(method === 'HEAD' ? undefined : message);
}

/** Local static preview. Only regular, non-hidden files inside root are served. */
export function createStaticServer({ root = publicRoot } = {}) {
  const resolvedRoot = realpathSync.native(path.resolve(root));
  if (!statSync(resolvedRoot).isDirectory()) {
    throw new TypeError('A pasta pública precisa ser um diretório.');
  }

  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-cache');
    if (!['GET', 'HEAD'].includes(request.method)) {
      reply(response, 405, 'Método não permitido.', request.method, { Allow: 'GET, HEAD' });
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      reply(response, 400, 'Endereço inválido.', request.method);
      return;
    }

    // Reject control characters, Windows separators and NTFS alternate streams.
    if (/[\u0000-\u001f\u007f\\:]/.test(pathname)) {
      reply(response, 400, 'Endereço inválido.', request.method);
      return;
    }

    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const target = path.resolve(resolvedRoot, relative);
    if (hasHiddenSegment(relative) || !isInside(resolvedRoot, target)) {
      reply(response, 404, 'Página não encontrada.', request.method);
      return;
    }

    try {
      const resolvedTarget = await realpath(target);
      const resolvedRelative = path.relative(resolvedRoot, resolvedTarget);
      if (!isInside(resolvedRoot, resolvedTarget) || hasHiddenSegment(resolvedRelative)) {
        reply(response, 404, 'Página não encontrada.', request.method);
        return;
      }
      const information = await stat(resolvedTarget);
      if (!information.isFile()) {
        reply(response, 404, 'Página não encontrada.', request.method);
        return;
      }

      const type = contentTypes[path.extname(resolvedTarget).toLowerCase()] || 'application/octet-stream';
      if (request.method === 'HEAD') {
        response.writeHead(200, { 'Content-Type': type, 'Content-Length': information.size });
        response.end();
        return;
      }

      const body = await readFile(resolvedTarget);
      response.writeHead(200, { 'Content-Type': type, 'Content-Length': body.length });
      response.end(body);
    } catch {
      reply(response, 404, 'Página não encontrada.', request.method);
    }
  });
}

function startPreview() {
  const portValue = process.env.PORT ?? '4173';
  if (!/^\d+$/.test(portValue) || !Number.isSafeInteger(Number(portValue)) || Number(portValue) > 65535) {
    console.error('PORT inválida. Use um número inteiro entre 0 e 65535 (padrão: 4173).');
    process.exitCode = 1;
    return;
  }

  try {
    const port = Number(portValue);
    const server = createStaticServer();
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE'
        ? `A porta ${port} já está em uso. Encerre a execução anterior ou escolha outra porta com PORT.`
        : `Não foi possível iniciar o fourBike: ${error.message}`);
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
      console.log(`fourBike: http://127.0.0.1:${server.address().port}`);
    });
  } catch (error) {
    console.error(`Não foi possível iniciar o fourBike: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && realpathSync.native(path.resolve(process.argv[1])) === fileURLToPath(import.meta.url)) {
  startPreview();
}
