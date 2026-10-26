import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { photoSource } from '../public/js/domain/photo-sources.js';
import { photoVariants } from '../public/js/data/photo-variants.js';
import { models } from '../public/js/data/models.js';

test('every initial product photo has smaller, correctly ordered responsive resources',() => {
  let coversBefore = 0; let coversAfter = 0;
  for (const model of models) {
    for (const [index,photo] of model.photos.entries()) {
      const canonical = photo.src.replace(/^\./,'').split('?')[0];
      const entry = photoVariants[canonical];
      assert.ok(entry,`Missing responsive resources: ${canonical}`);
      assert.ok(entry.width > 0 && entry.height > 0);
      let width = 0;
      for (const variant of entry.sources) {
        assert.ok(variant.width > width && variant.width <= entry.width,'Never enlarge the source');
        width = variant.width;
        assert.ok(statSync(fileURLToPath(new URL(`../public${variant.src}`,import.meta.url))).size > 0);
      }
      if (index === 0) {
        coversBefore += statSync(fileURLToPath(new URL(`../public${canonical}`,import.meta.url))).size;
        coversAfter += statSync(fileURLToPath(new URL(`../public${entry.sources.at(-1).src}`,import.meta.url))).size;
      }
    }
  }
  assert.ok(coversAfter < coversBefore * 0.4,'High-resolution covers should save at least 60% of bytes');
});

test('versioned canonical covers use responsive images without changing the saved catalog',() => {
  const photo = models.find(model => model.id === 'tank').photos[0];
  assert.match(photo.src,/cover\.png\?v=/);
  const thumbnail = photoSource(photo.src,'thumbnail');
  assert.match(thumbnail.src,/\.webp$/);
  assert.match(thumbnail.srcset,/240w/);
  assert.equal(thumbnail.sizes,'96px');
  assert.match(photo.src,/cover\.png\?v=/);
});

test('new uploads and unknown images keep their actual source and have no stale candidates',() => {
  for (const source of ['/media/123-test.webp','/assets/custom-photo.jpg','https://example.com/photo.png']) {
    assert.deepEqual(photoSource(source,'hero'),{src:source});
  }
});
