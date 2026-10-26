import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, unlink, realpath, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ValidationError, validateModel, modelId, normalizePhotoSource, slugify } from './validation.mjs';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const defaultPublicRoot = fileURLToPath(new URL('../public/', import.meta.url));

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function mediaType(buffer) {
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.toString('ascii', 12, 16) === 'IHDR') return { type:'image/png', extension:'png' };
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff && buffer.at(-2) === 0xff && buffer.at(-1) === 0xd9) return { type:'image/jpeg', extension:'jpg' };
  if (buffer.length >= 16 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' && ['VP8 ','VP8L','VP8X'].includes(buffer.toString('ascii', 12, 16))) return { type:'image/webp', extension:'webp' };
  throw new ValidationError('O arquivo precisa ser uma imagem JPEG, PNG ou WebP válida.', 400, 'invalid_image');
}

export async function createCatalogStore({ dataDir, publicRoot = defaultPublicRoot, seedModels = [] } = {}) {
  if (!dataDir) throw new TypeError('dataDir is required');
  const publicDirectory = await realpath(publicRoot);
  const directory = path.resolve(dataDir);
  if (isInside(publicDirectory, directory)) throw new TypeError('Os dados privados precisam ficar fora da pasta pública.');
  await mkdir(directory, { recursive:true, mode:0o700 });
  const resolvedDirectory = await realpath(directory);
  if (isInside(publicDirectory, resolvedDirectory)) throw new TypeError('Os dados privados precisam ficar fora da pasta pública.');
  const uploadDirectory = path.join(resolvedDirectory, 'uploads');
  await mkdir(uploadDirectory, { recursive:true, mode:0o700 });
  const uploadRoot = await realpath(uploadDirectory);
  if (!isInside(resolvedDirectory, uploadRoot)) throw new TypeError('A pasta de uploads precisa ficar dentro dos dados privados.');
  const filename = path.join(resolvedDirectory, 'catalog.json');
  let state;
  let queue = Promise.resolve();

  async function atomicSave(next) {
    const temporary = path.join(resolvedDirectory, `.catalog-${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, JSON.stringify(next, null, 2) + '\n', { flag:'wx', mode:0o600 });
      await rename(temporary, filename);
    } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
    state = next;
  }

  async function checkPhotos(photos, snapshot = state) {
    for (const photo of photos) {
      const src = normalizePhotoSource(photo.src);
      const pathname = src.split('?')[0];
      if (pathname.startsWith('/media/')) {
        const mediaFilename = pathname.slice('/media/'.length);
        if (!snapshot.uploads[mediaFilename]) throw new ValidationError('Uma das fotos enviadas não foi encontrada.');
        const actual = await realpath(path.join(uploadRoot, mediaFilename)).catch(() => null);
        if (!actual || !isInside(uploadRoot, actual) || !(await stat(actual)).isFile()) throw new ValidationError('Uma das fotos enviadas não foi encontrada.');
      } else {
        const actual = await realpath(path.resolve(publicDirectory, '.' + pathname)).catch(() => null);
        if (!actual || !isInside(publicDirectory, actual) || path.relative(publicDirectory, actual).split(/[\\/]/).some(part => part.startsWith('.')) || !(await stat(actual)).isFile()) {
          throw new ValidationError('Uma das fotos existentes não foi encontrada.');
        }
      }
    }
  }

  try {
    state = JSON.parse(await readFile(filename, 'utf8'));
    if (state?.version !== 1 || !Array.isArray(state.models) || !state.uploads || typeof state.uploads !== 'object' || Array.isArray(state.uploads)) throw new Error('invalid catalog');
    const ids = new Set();
    for (const entry of state.models) {
      validateModel(entry, { id:entry.id });
      if (!Number.isSafeInteger(entry.revision) || entry.revision < 1 || ids.has(entry.id)) throw new Error('invalid model revision');
      ids.add(entry.id);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Não foi possível carregar o catálogo salvo. Restaure uma cópia válida dos dados.', { cause:error });
    const timestamp = new Date().toISOString();
    state = { version:1, models:[], uploads:{}, updatedAt:timestamp };
    for (const entry of seedModels) {
      const model = validateModel({ ...entry, published:true }, { id:entry.id });
      if (state.models.some(current => current.id === model.id)) throw new ValidationError('Identificador duplicado nos modelos iniciais.');
      await checkPhotos(model.photos, state);
      state.models.push({ ...model, revision:1, createdAt:timestamp, updatedAt:timestamp });
    }
    await atomicSave(state);
  }

  function serialize(operation) {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }

  const clone = value => structuredClone(value);
  return {
    async list({ publishedOnly = false } = {}) {
      await queue;
      return clone(state.models.filter(model => !publishedOnly || model.published));
    },
    async create(input) {
      return serialize(async () => {
        let id = input?.id;
        if (!id) {
          const base = slugify(input?.name ?? 'modelo');
          id = base;
          for (let suffix = 2; state.models.some(model => model.id === id); suffix += 1) id = `${base}-${suffix}`;
        }
        modelId(id);
        if (state.models.some(model => model.id === id)) throw new ValidationError('Já existe um modelo com esse identificador.', 409, 'duplicate_model');
        const model = validateModel(input, { id });
        await checkPhotos(model.photos);
        const timestamp = new Date().toISOString();
        const record = { ...model, revision:1, createdAt:timestamp, updatedAt:timestamp };
        const next = clone(state);
        next.models.push(record);
        next.updatedAt = timestamp;
        await atomicSave(next);
        return clone(record);
      });
    },
    async update(id, input) {
      return serialize(async () => {
        modelId(id);
        const index = state.models.findIndex(model => model.id === id);
        if (index < 0) throw new ValidationError('Modelo não encontrado.', 404, 'model_not_found');
        const previous = state.models[index];
        if (input?.revision !== previous.revision) throw new ValidationError('Este modelo foi alterado. Atualize a página antes de salvar.', 409, 'revision_conflict');
        const model = validateModel(input, { id });
        await checkPhotos(model.photos);
        const timestamp = new Date().toISOString();
        const record = { ...model, revision:previous.revision + 1, createdAt:previous.createdAt, updatedAt:timestamp };
        const next = clone(state);
        next.models[index] = record;
        next.updatedAt = timestamp;
        await atomicSave(next);
        return clone(record);
      });
    },
    async remove(id, { revision } = {}) {
      return serialize(async () => {
        modelId(id);
        const model = state.models.find(entry => entry.id === id);
        if (!model) throw new ValidationError('Modelo não encontrado.', 404, 'model_not_found');
        if (revision !== model.revision) throw new ValidationError('Este modelo foi alterado. Atualize a página antes de excluir.', 409, 'revision_conflict');
        const next = clone(state);
        next.models = next.models.filter(entry => entry.id !== id);
        next.updatedAt = new Date().toISOString();
        await atomicSave(next);
        return true;
      });
    },
    async upload(buffer, { contentType } = {}) {
      return serialize(async () => {
        if (!Buffer.isBuffer(buffer) || !buffer.length) throw new ValidationError('Envie uma imagem.');
        if (buffer.length > MAX_UPLOAD_BYTES) throw new ValidationError('Cada foto pode ter até 5 MB.', 413, 'image_too_large');
        const image = mediaType(buffer);
        if (contentType && contentType.toLowerCase().split(';')[0].trim() !== image.type) throw new ValidationError('O tipo informado não corresponde ao arquivo de imagem.', 400, 'invalid_image_type');
        const mediaFilename = `${randomUUID()}.${image.extension}`;
        const target = path.join(uploadRoot, mediaFilename);
        await writeFile(target, buffer, { flag:'wx', mode:0o600 });
        const next = clone(state);
        next.uploads[mediaFilename] = { contentType:image.type, size:buffer.length, createdAt:new Date().toISOString() };
        try { await atomicSave(next); }
        catch (error) { await unlink(target).catch(() => {}); throw error; }
        return { src:`/media/${mediaFilename}`, studio:false };
      });
    },
    async readMedia(mediaFilename, { publishedOnly = false } = {}) {
      await queue;
      if (typeof mediaFilename !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpg|webp)$/.test(mediaFilename)) {
        throw new ValidationError('Imagem não encontrada.', 404, 'image_not_found');
      }
      const metadata = state.uploads[mediaFilename];
      if (!metadata || (publishedOnly && !state.models.some(model => model.published && model.photos.some(photo => photo.src === `/media/${mediaFilename}`)))) {
        throw new ValidationError('Imagem não encontrada.', 404, 'image_not_found');
      }
      const target = await realpath(path.join(uploadRoot, mediaFilename)).catch(() => null);
      if (!target || !isInside(uploadRoot, target) || !(await stat(target)).isFile()) throw new ValidationError('Imagem não encontrada.', 404, 'image_not_found');
      return { data:await readFile(target), contentType:metadata.contentType };
    },
  };
}
