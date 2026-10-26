import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { models } from '../public/js/data/models.js';
import { store, whatsappUrl } from '../public/js/data/store.js';

const publicUrl = new URL('../public/', import.meta.url);
const publicRoot = fileURLToPath(publicUrl);
const html = readFileSync(new URL('index.html', publicUrl), 'utf8');
const css = readFileSync(new URL('styles.css', publicUrl), 'utf8');

function assertInsidePublic(filePath, reference) {
  const localPath = relative(publicRoot, filePath);
  assert.ok(
    localPath && !isAbsolute(localPath) && localPath !== '..' && !localPath.startsWith(`..${sep}`),
    `${reference} must resolve inside public/`
  );
  return localPath;
}

// Windows tolerates casing errors that would break the same URLs on Linux.
function assertPublicFile(reference) {
  const url = new URL(reference, publicUrl);
  assert.equal(url.protocol, 'file:', `${reference} must be a local public asset`);
  const filePath = fileURLToPath(url);
  const localPath = assertInsidePublic(filePath, reference);
  let directory = publicRoot;

  for (const segment of localPath.split(sep)) {
    assert.ok(
      readdirSync(directory).includes(segment),
      `${reference} must match the on-disk filename exactly, including case`
    );
    directory = join(directory, segment);
  }

  assertInsidePublic(realpathSync(filePath), reference);
  assert.ok(statSync(filePath).isFile(), `${reference} must resolve to a file`);
  return filePath;
}

test('the catalog has seven unique model identities', () => {
  assert.equal(models.length, 7);
  assert.equal(new Set(models.map(model => model.id)).size, models.length);
  assert.deepEqual(
    models.map(model => model.id).sort(),
    ['cappuccino', 'n9', 'suica', 'tank', 'x13', 'x16', 'x18']
  );
  for (const model of models) {
    assert.ok(model.name.trim(), `${model.id} needs a display name`);
  }
});

test('each gallery starts with its cover and retains all 34 ordered original photos', () => {
  let originals = 0;
  for (const model of models) {
    assert.ok(model.photos.length > 1, `${model.id} needs a cover and original photos`);
    assert.equal(model.photos[0].studio, true);
    const cover = new URL(model.photos[0].src, publicUrl);
    assert.ok(cover.pathname.endsWith(`/assets/models/${model.id}/cover.png`));

    const expectedFiles = ['cover.png'];
    for (const [index, photo] of model.photos.slice(1).entries()) {
      const filename = `original-${String(index + 1).padStart(2, '0')}.jpeg`;
      const url = new URL(photo.src, publicUrl);
      assert.equal(photo.studio, false, `${model.id}/${filename} is an original photo`);
      assert.ok(url.pathname.endsWith(`/assets/models/${model.id}/${filename}`));
      expectedFiles.push(filename);
      originals += 1;
    }

    const directory = new URL(`assets/models/${model.id}/`, publicUrl);
    assert.deepEqual(readdirSync(directory).sort(), expectedFiles.sort(), `${model.id} gallery must not omit files`);
  }
  assert.equal(originals, 34);
});

test('all gallery URLs resolve locally with exact filename casing, including versioned covers', () => {
  for (const model of models) {
    for (const photo of model.photos) {
      assertPublicFile(photo.src);
    }
  }
});

test('the published model directory contains galleries without old advertising posters', () => {
  const entries = readdirSync(new URL('assets/models/', publicUrl), { withFileTypes: true });
  assert.ok(entries.every(entry => entry.isDirectory()), 'old root-level poster images must stay outside public/');
  assert.deepEqual(entries.map(entry => entry.name).sort(), models.map(model => model.id).sort());
});

test('published fonts are used and the brand, store, and third-party licenses are present', () => {
  const fontReferences = [...css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)]
    .map(match => match[1])
    .filter(reference => /\.(?:ttf|otf|woff2?)(?:[?#]|$)/i.test(reference));
  assert.ok(fontReferences.length > 0, 'the stylesheet needs its local font');
  const referencedFonts = new Set(fontReferences.map(reference => assertPublicFile(reference)));
  const fontDirectory = new URL('assets/fonts/', publicUrl);
  const publishedFonts = readdirSync(fontDirectory)
    .filter(filename => /\.(?:ttf|otf|woff2?)$/i.test(filename));
  assert.equal(publishedFonts.length, referencedFonts.size, 'unused font files must stay outside public/');
  for (const filename of publishedFonts) {
    assert.ok(referencedFonts.has(fileURLToPath(new URL(filename, fontDirectory))), `${filename} must be used by CSS`);
  }

  for (const reference of [
    './assets/brand/favicon.svg',
    './assets/brand/fourbike.png',
    './assets/brand/whatsapp/whatsapp-white-official.svg',
    './assets/store/store-front.jpeg'
  ]) {
    assertPublicFile(reference);
    assert.ok(html.includes(reference), `${reference} must be used by the page`);
  }

  for (const reference of [
    './assets/fonts/manrope-OFL.txt',
    './assets/licenses/lucide-LICENSE.txt'
  ]) {
    const license = readFileSync(assertPublicFile(reference), 'utf8');
    assert.ok(license.trim().length > 100, `${reference} must contain the license text`);
  }
});

test('WhatsApp links keep Portuguese text, emoji, and reserved characters in a single message', () => {
  const message = 'Olá! Tenho interesse no Suíça & X18? #fourBike + retirada\nna loja 🛵';
  const link = new URL(whatsappUrl(message));
  assert.match(store.whatsappNumber, /^\d{10,15}$/);
  assert.equal(link.origin, 'https://wa.me');
  assert.equal(link.pathname, `/${store.whatsappNumber}`);
  assert.deepEqual([...link.searchParams.keys()], ['text']);
  assert.equal(link.searchParams.get('text'), message);
  assert.equal(link.hash, '');
  assert.ok(!link.href.includes(' '));
});
