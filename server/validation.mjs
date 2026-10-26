export class ValidationError extends Error {
  constructor(message, status = 400, code = 'invalid_model') {
    super(message);
    this.name = 'ValidationError';
    this.status = status;
    this.code = code;
  }
}

export function modelId(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(value)) {
    throw new ValidationError('Identificador de modelo inválido.');
  }
  return value;
}

export function slugify(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70).replace(/-$/, '') || 'modelo';
}

function text(value, field, maximum, { required = false, nullable = false } = {}) {
  if (nullable && (value === null || value === undefined || value === '')) return null;
  if (value === undefined && !required) return '';
  if (typeof value !== 'string') throw new ValidationError(`Preencha ${field} com texto.`);
  const result = value.trim();
  if ((required && !result) || result.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result)) {
    throw new ValidationError(`Confira o campo ${field} (até ${maximum} caracteres).`);
  }
  return result;
}

export function normalizePhotoSource(value) {
  if (typeof value !== 'string' || value.length > 300) throw new ValidationError('Foto inválida.');
  const src = value.startsWith('./') ? value.slice(1) : value;
  const [pathname, query] = src.split('?');
  if (src.split('?').length > 2 || (query !== undefined && !/^v=[a-zA-Z0-9-]{1,80}$/.test(query))) {
    throw new ValidationError('Endereço de foto inválido.');
  }
  if (!/^\/(?:assets|media)\/[a-zA-Z0-9/_.-]+$/.test(pathname)
      || pathname.split('/').some(segment => segment.startsWith('.'))
      || !/\.(?:png|jpe?g|webp)$/i.test(pathname)) {
    throw new ValidationError('Use uma foto enviada ou uma imagem existente do catálogo.');
  }
  if (pathname.startsWith('/media/') && (!/^\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpg|webp)$/.test(pathname) || query)) {
    throw new ValidationError('Arquivo de mídia inválido.');
  }
  return src;
}

export function validateModel(input, { id } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ValidationError('Modelo inválido.');
  const result = {
    id: modelId(id ?? input.id),
    name: text(input.name, 'nome', 80, { required:true }),
    character: text(input.character, 'chamada', 160),
    description: text(input.description, 'descrição', 3000, { required:true }),
    motor: text(input.motor, 'motor', 100, { required:true }),
    range: text(input.range, 'autonomia', 100, { required:true }),
    battery: text(input.battery, 'bateria', 180, { required:true }),
    charge: text(input.charge, 'tempo de carga', 100, { nullable:true }),
    capacity: text(input.capacity, 'capacidade de carga', 100, { nullable:true }),
    published: input.published === undefined ? true : input.published,
  };
  if (typeof result.published !== 'boolean') throw new ValidationError('A publicação precisa ser verdadeira ou falsa.');
  for (const [key, label] of [['peak','potência de pico'], ['weight','peso'], ['extra','observações']]) {
    if (input[key] !== undefined && input[key] !== null && input[key] !== '') result[key] = text(input[key], label, key === 'extra' ? 800 : 100);
  }
  if (input.features !== undefined && !Array.isArray(input.features)) throw new ValidationError('Recursos precisam ser uma lista.');
  if ((input.features ?? []).length > 16) throw new ValidationError('Use até 16 recursos por modelo.');
  result.features = (input.features ?? []).map(value => text(value, 'recurso', 160, { required:true }));
  if (!Array.isArray(input.photos) || input.photos.length < 1 || input.photos.length > 20) {
    throw new ValidationError('Inclua entre 1 e 20 fotos. A primeira será a principal.');
  }
  result.photos = input.photos.map((photo, index) => {
    if (!photo || typeof photo !== 'object' || Array.isArray(photo)) throw new ValidationError('Foto inválida.');
    if (photo.studio !== undefined && typeof photo.studio !== 'boolean') throw new ValidationError('Tipo de foto inválido.');
    return { src:normalizePhotoSource(photo.src), studio:photo.studio ?? index === 0 };
  });
  return result;
}
