import { photoVariants } from '../data/photo-variants.js';

const sizes = {
  thumbnail:'96px',
  card:'(max-width: 580px) calc(100vw - 44px), (max-width: 900px) 44vw, 30vw',
  detail:'(max-width: 800px) calc(100vw - 44px), (max-width: 1440px) 46vw, 620px',
  hero:'(max-width: 800px) 100vw, 50vw',
  dialog:'(max-width: 800px) calc(100vw - 32px), 1000px',
};

/** Unrecognized photos, including admin uploads, retain their original source. */
export function photoSource(source, role = 'detail') {
  const path = source.startsWith('./') ? source.slice(1) : source;
  const variants = photoVariants[path.split('?')[0]];
  if (!variants) return {src:source};
  const preferred = role === 'thumbnail' ? variants.sources[0] : variants.sources.find(item => item.width >= 960) || variants.sources.at(-1);
  return {
    src:preferred.src,
    srcset:variants.sources.map(item => `${item.src} ${item.width}w`).join(', '),
    sizes:sizes[role] || sizes.detail,
    width:variants.width,
    height:variants.height,
  };
}

export function applyPhotoSource(image, source, role) {
  const attributes = photoSource(source, role);
  // Avoid retaining candidates from the previous model when the next photo is an upload.
  for (const name of ['srcset','sizes','width','height']) image.removeAttribute(name);
  for (const name of ['width','height','sizes','srcset']) {
    if (attributes[name] !== undefined) image.setAttribute(name,String(attributes[name]));
  }
  image.setAttribute('src',attributes.src);
}
