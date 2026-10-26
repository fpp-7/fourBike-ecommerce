import { whatsappUrl as whatsapp } from './data/store.js';

const $ = (selector) => document.querySelector(selector);

function makePhoto(model, eager = false, photoIndex = 0) {
  const photo = model.photos[photoIndex];
  const img = document.createElement('img');
  img.src = photo.src;
  img.alt = `${model.name}, foto ${photoIndex + 1} de ${model.photos.length}`;
  img.loading = eager ? 'eager' : 'lazy';
  img.decoding = 'async';
  img.draggable = false;
  const frame = document.createElement('span');
  frame.className = `product-photo${photo.studio ? ' studio-photo' : ' original-photo'}`;
  frame.append(img);
  return frame;
}

function addDefinition(list, label, value) {
  const row = document.createElement('div');
  const dt = document.createElement('dt'); dt.textContent = label;
  const dd = document.createElement('dd'); dd.textContent = value;
  row.append(dt,dd); list.append(row);
}

const announcer = document.createElement('p');
announcer.className = 'visually-hidden'; announcer.setAttribute('role','status');
document.body.append(announcer);

let models = [];
let activeModel = null;
let activePhotoIndex = 0;
let dialogOpener = null;
const photoDialog = $('#photo-dialog');

function updateDialogPhoto() {
  if (!activeModel) return;
  const photo = makePhoto(activeModel,true,activePhotoIndex);
  photo.id = 'dialog-photo';
  $('#dialog-photo').replaceWith(photo);
  $('#dialog-title').textContent = activeModel.name;
  $('#dialog-photo-status').textContent = `Foto ${activePhotoIndex + 1} de ${activeModel.photos.length}.`;
}

function showPhoto(index) {
  if (!activeModel) return;
  activePhotoIndex = (index + activeModel.photos.length) % activeModel.photos.length;
  const photo = makePhoto(activeModel,true,activePhotoIndex);
  photo.id = 'model-photo'; photo.classList.add('model-photo');
  $('#model-photo').replaceWith(photo);
  $('#gallery-kind').textContent = `Fotos da ${activeModel.name}`;
  $('#gallery-count').textContent = `${activePhotoIndex + 1} / ${activeModel.photos.length}`;
  $('#gallery-status').setAttribute('aria-label',`Foto ${activePhotoIndex + 1} de ${activeModel.photos.length} do ${activeModel.name}.`);
  $('#gallery-open').setAttribute('aria-label',`Ampliar foto ${activePhotoIndex + 1} de ${activeModel.photos.length} do ${activeModel.name}`);
  document.querySelectorAll('[data-photo-index]').forEach(button => {
    button.setAttribute('aria-pressed',String(Number(button.dataset.photoIndex) === activePhotoIndex));
  });
  const thumbnails = $('#gallery-thumbnails');
  const activeThumbnail = thumbnails.querySelector(`[data-photo-index="${activePhotoIndex}"]`);
  if(activeThumbnail) {
    const offset = activeThumbnail.offsetLeft - thumbnails.offsetLeft;
    if(offset < thumbnails.scrollLeft || offset + activeThumbnail.offsetWidth > thumbnails.scrollLeft + thumbnails.clientWidth) {
      thumbnails.scrollTo({ left:Math.max(0,offset - (thumbnails.clientWidth - activeThumbnail.offsetWidth) / 2), behavior:'instant' });
    }
  }
  if(photoDialog.open) updateDialogPhoto();
}

function makeThumbnails() {
  const thumbnails = $('#gallery-thumbnails'); thumbnails.replaceChildren();
  activeModel.photos.forEach((photo,index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'gallery-thumbnail';
    button.dataset.photoIndex = String(index);
    button.setAttribute('aria-pressed',String(index === 0));
    button.setAttribute('aria-label',`Ver foto ${index + 1} de ${activeModel.photos.length} do ${activeModel.name}`);
    button.setAttribute('aria-controls','model-photo');
    const preview = makePhoto(activeModel,false,index);
    preview.querySelector('img').alt = '';
    button.append(preview);
    button.addEventListener('click',() => showPhoto(index));
    thumbnails.append(button);
  });
  thumbnails.scrollLeft = 0;
}

$('#gallery-previous').addEventListener('click',() => showPhoto(activePhotoIndex - 1));
$('#gallery-next').addEventListener('click',() => showPhoto(activePhotoIndex + 1));
$('#dialog-previous').addEventListener('click',() => showPhoto(activePhotoIndex - 1));
$('#dialog-next').addEventListener('click',() => showPhoto(activePhotoIndex + 1));
$('#gallery-open').addEventListener('click',event => {
  if (!activeModel) return;
  dialogOpener = event.currentTarget;
  updateDialogPhoto();
  photoDialog.showModal();
});
$('#dialog-close').addEventListener('click',() => photoDialog.close());
photoDialog.addEventListener('close',() => { dialogOpener?.focus({ preventScroll:true }); });
photoDialog.addEventListener('click',event => {
  if(event.target !== photoDialog) return;
  const bounds = photoDialog.getBoundingClientRect();
  if(event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) photoDialog.close();
});
function handleGalleryKeys(event) {
  if(event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault(); showPhoto(activePhotoIndex + (event.key === 'ArrowRight' ? 1 : -1));
}
$('#model-gallery').addEventListener('keydown',handleGalleryKeys);
photoDialog.addEventListener('keydown',handleGalleryKeys);

function enablePhotoSwipe(surface, acceptsStart = () => true) {
  let start = null;
  surface.addEventListener('touchstart', event => {
    if(event.touches.length !== 1 || !acceptsStart(event)) { start = null; return; }
    const touch = event.touches[0];
    start = { id:touch.identifier, x:touch.clientX, y:touch.clientY };
  }, { passive:true });
  surface.addEventListener('touchmove', event => {
    if(!start || event.touches.length !== 1) { start = null; return; }
    const touch = event.touches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if(Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.35 && event.cancelable) event.preventDefault();
  }, { passive:false });
  surface.addEventListener('touchend', event => {
    if(!start) return;
    const touch = Array.from(event.changedTouches).find(item => item.identifier === start.id);
    if(!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    start = null;
    // A drag must not produce the tap/click that opens the enlarged viewer.
    if((Math.abs(dx) > 12 || Math.abs(dy) > 12) && event.cancelable) event.preventDefault();
    if(Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      showPhoto(activePhotoIndex + (dx < 0 ? 1 : -1));
    }
  }, { passive:false });
  surface.addEventListener('touchcancel', () => { start = null; }, { passive:true });
}
enablePhotoSwipe($('#gallery-open'));
enablePhotoSwipe(photoDialog, event => event.target instanceof Element && Boolean(event.target.closest('#dialog-photo')));

function selectModel(id, announce = true) {
  const model = models.find(item => item.id === id);
  if(!model) return;
  if(photoDialog.open) photoDialog.close();
  activeModel = model;
  makeThumbnails(); showPhoto(0);
  $('#model-gallery').setAttribute('aria-label',`Fotos do ${model.name}`);
  $('#model-character').textContent = model.character;
  $('#model-name').textContent = model.name;
  $('#model-description').textContent = model.description;
  const stats = $('#model-stats'); stats.replaceChildren();
  addDefinition(stats,'Motor informado',model.motor);
  addDefinition(stats,'Velocidade anunciada','32 km/h');
  addDefinition(stats,'Autonomia anunciada',model.range);
  const features = $('#model-features'); features.replaceChildren();
  for(const item of model.features) { const li = document.createElement('li'); li.textContent = item; features.append(li); }
  const specs = $('#technical-specs'); specs.replaceChildren();
  addDefinition(specs,'Motor informado',model.motor);
  if(model.peak) addDefinition(specs,'Potência de pico anunciada',model.peak);
  addDefinition(specs,'Velocidade anunciada','32 km/h');
  addDefinition(specs,'Bateria',model.battery);
  addDefinition(specs,'Autonomia anunciada',model.range);
  addDefinition(specs,'Tempo de carga',model.charge || 'Consultar a equipe');
  addDefinition(specs,'Peso suportado anunciado',model.capacity || 'Consultar a equipe');
  if(model.weight) addDefinition(specs,'Peso do veículo informado',model.weight);
  if(model.extra) addDefinition(specs,'Observação',model.extra);
  $('.technical-details').open = false;
  $('#model-contact').href = whatsapp(`Olá! Conheci o ${model.name} no site da fourBike e gostaria de saber mais para visitar a loja.`);
  document.querySelectorAll('[data-model]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.model === id)));
  if(announce) announcer.textContent = `Modelo ${model.name} selecionado. Foto e ficha técnica atualizadas.`;
}

function renderCatalog() {
 const grid = $('#model-grid'); grid.replaceChildren();
 const switcher = $('.model-switcher'); switcher.replaceChildren();
 for(const model of models) {
  const selector = document.createElement('button'); selector.type = 'button';
  selector.dataset.model = model.id; selector.textContent = model.name; selector.setAttribute('aria-pressed','false');
  switcher.append(selector);
  const article = document.createElement('article'); article.className = 'model-card';
  const photo = makePhoto(model);
  const heading = document.createElement('div'); heading.className = 'model-card-name';
  const title = document.createElement('h3'); title.textContent = model.name;
  const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Ver modelo'; button.dataset.selectModel = model.id;
  button.setAttribute('aria-label',`Ver detalhes do ${model.name}`);
  const caption = document.createElement('p'); caption.textContent = model.id === 'cappuccino' ? 'Estilo retrô' : model.features[0] || model.character || model.motor;
  heading.append(title,button); article.append(photo,heading,caption); grid.append(article);
 }
 switcher.hidden = !models.length;
 $('#modelo').hidden = !models.length;
 $('.collection').hidden = !models.length;
 const first = models[0];
 const hero = $('.hero-photo');
 const image = hero.querySelector('img');
 image.src = first?.photos[0].src || './assets/store/store-front.jpeg';
 image.alt = first ? `${first.name}, autopropelido da fourBike` : 'Conheça a loja fourBike em Leme';
 hero.classList.toggle('studio-photo',Boolean(first?.photos[0].studio));
 hero.classList.toggle('original-photo',!first?.photos[0].studio);
 $('.hero-caption span').textContent = first ? `Conheça o ${first.name}` : 'Venha conhecer a fourBike';
 const link = $('.hero-caption a');
 link.href = first ? '#modelo' : '#loja';
 link.setAttribute('aria-label',first ? `Ver detalhes do ${first.name}` : 'Conhecer a loja');
 if(first) { link.dataset.selectModel = first.id; selectModel(first.id,false); }
 else { delete link.dataset.selectModel; activeModel = null; }
}

document.addEventListener('click',event => {
  const button = event.target.closest('[data-model]');
  if(button) selectModel(button.dataset.model);
  const control = event.target.closest('[data-select-model]');
  if(!control) return;
  event.preventDefault(); selectModel(control.dataset.selectModel);
  const target = $('#modelo');
  target.focus({preventScroll:true});
  target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'start'});
});
document.querySelectorAll('[data-whatsapp]').forEach(link => link.href = whatsapp('Olá! Conheci a fourBike pelo site e gostaria de conversar com a equipe.'));

const menuButton = $('.menu-toggle');
const menu = $('#menu');
function closeMenu() { menu.classList.remove('is-open'); menuButton.setAttribute('aria-expanded','false'); }
menuButton.addEventListener('click',() => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded',String(open)); menu.classList.toggle('is-open',open);
});
menu.querySelectorAll('a').forEach(link => link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event => { if(event.key === 'Escape' && menu.classList.contains('is-open')) { closeMenu(); menuButton.focus(); } });
matchMedia('(min-width: 801px)').addEventListener('change',event => { if(event.matches) closeMenu(); });

async function loadCatalog() {
  const status = $('#catalog-status');
  status.textContent = 'Carregando modelos…'; status.hidden = false;
  $('#catalog-retry').hidden = true;
  try {
    const response = await fetch('/api/models',{cache:'no-store'});
    if(!response.ok) throw Error();
    const data = await response.json();
    if(!Array.isArray(data.models)) throw Error();
    models = data.models;
    renderCatalog();
    status.textContent = models.length ? '' : 'Estamos atualizando nossos modelos. Converse com a equipe pelo WhatsApp ou visite nossa loja.';
    status.hidden = models.length > 0;
  } catch {
    models = []; renderCatalog();
    status.textContent = 'Não foi possível carregar os modelos. Tente novamente ou converse com a equipe pelo WhatsApp.';
    $('#catalog-retry').hidden = false;
  }
}
$('#catalog-retry').addEventListener('click',loadCatalog);
loadCatalog();
