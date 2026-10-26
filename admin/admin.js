const $ = selector => document.querySelector(selector);
const fields = ['name','character','description','motor','peak','range','charge','battery','capacity','weight','extra'];
let csrfToken = '';
let models = [];
let editing = null;
let photos = [];
let dirty = false;
let busy = false;
let uploading = false;
let resumeEditor = false;
let catalogGeneration = 0;

function message(id, text = '', kind = 'error') {
  const element = $(id);
  element.textContent = text;
  element.dataset.kind = kind;
  element.hidden = !text;
}
function showLogin(text = '') {
  csrfToken = '';
  $('#loading-message').hidden = true;
  $('#workspace').hidden = true;
  $('#session-actions').hidden = true;
  $('#login-view').hidden = false;
  message('#login-message', text);
}
async function api(path, { method = 'GET', data, file } = {}) {
  const headers = {};
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  if (file) headers['Content-Type'] = file.type;
  const response = await fetch(`/api/admin${path}`, {
    method, headers, credentials:'same-origin', cache:'no-store',
    body:file || (data === undefined ? undefined : JSON.stringify(data)),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/login') {
      resumeEditor ||= !$('#workspace').hidden && !$('#editor-view').hidden;
      showLogin('Sua sessão terminou. Entre novamente para continuar. Seu formulário será preservado.');
    }
    const error = new Error(result.error || 'Não foi possível concluir. Confira sua conexão e tente novamente.');
    error.status = response.status;
    throw error;
  }
  return result;
}
function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function button(text, className, action) {
  const element = create('button', className, text);
  element.type = 'button';
  element.addEventListener('click', action);
  return element;
}
function confirmAction(title, text, accept, danger = false) {
  const dialog = $('#confirmation-dialog');
  $('#confirmation-title').textContent = title;
  $('#confirmation-message').textContent = text;
  const confirmation = $('#confirmation-accept');
  confirmation.textContent = accept;
  confirmation.className = `button ${danger ? 'button-danger' : 'button-primary'}`;
  return new Promise(resolve => {
    dialog.returnValue = '';
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), {once:true});
    dialog.showModal();
  });
}
$('#confirmation-cancel').addEventListener('click', () => $('#confirmation-dialog').close('cancel'));
$('#confirmation-accept').addEventListener('click', () => $('#confirmation-dialog').close('confirm'));

function renderModels() {
  const search = $('#model-search').value.trim().toLocaleLowerCase('pt-BR');
  const visible = models.filter(model => model.name.toLocaleLowerCase('pt-BR').includes(search));
  const list = $('#model-list');
  list.replaceChildren();
  const published = models.filter(model => model.published).length;
  $('#catalog-count').textContent = `${models.length} modelos cadastrados, ${published} no site.`;
  $('#empty-models').hidden = visible.length > 0;
  $('#empty-models').textContent = models.length ? 'Nenhum modelo encontrado. Tente outro nome.' : 'Nenhum modelo cadastrado. Adicione o primeiro modelo para começar.';
  for (const model of visible) {
    const row = create('article','model-row');
    const image = create('img','model-thumbnail');
    image.src = model.photos[0].src; image.alt = model.name; image.loading = 'lazy';
    const summary = create('div','model-summary');
    const status = create('span','model-status',model.published ? 'Visível no site' : 'Oculto no site');
    status.dataset.hidden = String(!model.published);
    summary.append(create('h2','',model.name),create('p','',model.character || model.motor),status);
    const visibility = create('label','visibility-choice');
    const checkbox = create('input'); checkbox.type = 'checkbox'; checkbox.checked = model.published;
    checkbox.setAttribute('aria-label',`Mostrar ${model.name} no site`);
    checkbox.addEventListener('change', async () => {
      checkbox.disabled = true;
      message('#catalog-message');
      try {
        const { model:updated } = await api(`/models/${model.id}`, {method:'PUT',data:{...model,published:checkbox.checked}});
        ++catalogGeneration;
        models = models.map(item => item.id === updated.id ? updated : item);
        renderModels();
        message('#catalog-message',`${updated.name} ${updated.published ? 'está visível' : 'foi ocultado'} no site.`, 'success');
      } catch (error) { checkbox.checked = model.published; checkbox.disabled = false; message('#catalog-message',error.message); }
    });
    visibility.append(checkbox,document.createTextNode('Mostrar no site'));
    const edit = button('Editar','button button-secondary',() => openEditor(model));
    edit.setAttribute('aria-label',`Editar ${model.name}`);
    row.append(image,summary,visibility,edit); list.append(row);
  }
}
async function loadModels() {
  const generation = ++catalogGeneration;
  const {models:items} = await api('/models');
  if (generation !== catalogGeneration) return;
  models = items;
  renderModels();
}
async function enterWorkspace(session) {
  csrfToken = session.csrfToken;
  $('#session-name').textContent = session.username;
  $('#loading-message').hidden = true;
  $('#login-view').hidden = true;
  $('#workspace').hidden = false;
  $('#session-actions').hidden = false;
  $('#list-view').hidden = resumeEditor;
  $('#editor-view').hidden = !resumeEditor;
  resumeEditor = false;
  try { await loadModels(); } catch (error) { message('#catalog-message',error.message); }
}
function renderPhotos() {
  $('#photo-empty').hidden = photos.length > 0;
  const list = $('#photo-list'); list.replaceChildren();
  photos.forEach((photo,index) => {
    const item = create('div','photo-item'); item.dataset.principal = String(index === 0);
    const image = create('img'); image.src = photo.src; image.alt = `Foto ${index + 1} do modelo`; image.loading = 'lazy';
    const actions = create('div','photo-actions');
    const mutate = operation => { operation(); dirty = true; renderPhotos(); };
    const principal = button('Usar como principal','photo-action photo-action-wide',() => mutate(() => photos.unshift(...photos.splice(index,1))));
    principal.disabled = index === 0 || uploading;
    const previous = button('←','photo-action photo-action-icon',() => mutate(() => [photos[index-1],photos[index]] = [photos[index],photos[index-1]]));
    previous.setAttribute('aria-label',`Mover foto ${index + 1} para antes`); previous.disabled = index === 0 || uploading;
    const next = button('→','photo-action photo-action-icon',() => mutate(() => [photos[index+1],photos[index]] = [photos[index],photos[index+1]]));
    next.setAttribute('aria-label',`Mover foto ${index + 1} para depois`); next.disabled = index === photos.length - 1 || uploading;
    const remove = button('Remover','photo-action',() => mutate(() => photos.splice(index,1)));
    remove.dataset.danger = 'true'; remove.disabled = uploading;
    actions.append(principal,previous,next,remove);
    item.append(image,create('p','photo-position',index === 0 ? 'Foto principal' : `Foto ${index + 1}`),actions);
    list.append(item);
  });
}
function openEditor(model = null) {
  editing = model ? structuredClone(model) : null;
  photos = model ? structuredClone(model.photos) : [];
  $('#model-form').reset();
  for (const field of fields) $(`#model-${field}`).value = model?.[field] || '';
  $('#model-features').value = model?.features.join('\n') || '';
  $('#model-published').checked = model?.published ?? true;
  $('#editor-title').textContent = model ? `Editar ${model.name}.` : 'Adicionar modelo.';
  $('#delete-model').hidden = !model;
  $('#list-view').hidden = true; $('#editor-view').hidden = false;
  dirty = false; message('#editor-message'); renderPhotos();
  $('#model-name').focus();
  window.scrollTo({top:0});
}
async function backToList() {
  if (busy || uploading) return;
  if (dirty && !await confirmAction('Descartar alterações?', 'As alterações deste formulário ainda não foram salvas.', 'Descartar')) return;
  dirty = false; $('#editor-view').hidden = true; $('#list-view').hidden = false;
  $('#new-model').focus();
}
function setBusy(value) {
  busy = value;
  $('#model-form').querySelectorAll('button,input,textarea').forEach(element => element.disabled = value);
  $('#delete-model').disabled = value;
  $('#save-model').textContent = value ? 'Salvando…' : 'Salvar modelo';
  if (!value) renderPhotos();
}
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); $('#login-submit').disabled = true; message('#login-message');
  try {
    const session = await api('/login',{method:'POST',data:{username:$('#username').value.trim(),password:$('#password').value}});
    $('#password').value = ''; await enterWorkspace(session);
  } catch (error) { message('#login-message',error.message); }
  finally { $('#login-submit').disabled = false; }
});
$('#logout-button').addEventListener('click',async () => {
  if (busy || uploading) return;
  if (dirty && !await confirmAction('Sair sem salvar?', 'As alterações deste formulário serão descartadas.', 'Sair')) return;
  try { await api('/logout',{method:'POST'}); dirty = false; resumeEditor = false; ++catalogGeneration; models = []; photos = []; showLogin(); }
  catch(error) { message($('#editor-view').hidden ? '#catalog-message' : '#editor-message',error.message); }
});
$('#new-model').addEventListener('click',() => openEditor());
$('#model-search').addEventListener('input',renderModels);
$('#refresh-models').addEventListener('click',async () => {
  $('#refresh-models').disabled = true; message('#catalog-message');
  try { await loadModels(); } catch(error) { message('#catalog-message',error.message); }
  finally { $('#refresh-models').disabled = false; }
});
$('#back-to-list').addEventListener('click',backToList);
$('#cancel-edit').addEventListener('click',backToList);
$('#model-form').addEventListener('input',() => { dirty = true; });
$('#photo-upload').addEventListener('change',async event => {
  const files = [...event.target.files]; event.target.value = '';
  if (!files.length) return;
  message('#editor-message');
  if (photos.length + files.length > 20) { message('#editor-message','Use até 20 fotos por modelo.'); return; }
  if (files.some(file => !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024)) {
    message('#editor-message','Escolha fotos JPG, PNG ou WebP de até 5 MB cada.'); return;
  }
  uploading = true; $('#save-model').disabled = true; $('#photo-upload').disabled = true; renderPhotos();
  const progress = $('#upload-progress'); progress.hidden = false;
  try {
    for (const [index,file] of files.entries()) {
      progress.textContent = `Enviando foto ${index + 1} de ${files.length}…`;
      const {photo} = await api('/uploads',{method:'POST',file}); photos.push(photo); dirty = true;
    }
  } catch(error) { message('#editor-message',error.message); }
  finally { uploading = false; progress.hidden = true; $('#save-model').disabled = false; $('#photo-upload').disabled = false; renderPhotos(); }
});
$('#model-form').addEventListener('submit',async event => {
  event.preventDefault(); if (busy || uploading) return;
  message('#editor-message');
  if (!photos.length) { message('#editor-message','Adicione pelo menos uma foto ao modelo.'); $('#photo-upload').focus(); return; }
  const data = Object.fromEntries(fields.map(field => [field,$(`#model-${field}`).value.trim()]));
  data.features = $('#model-features').value.split('\n').map(line => line.trim()).filter(Boolean);
  if (data.features.length > 16 || data.features.some(line => line.length > 160)) { message('#editor-message','Inclua até 16 recursos, com até 160 caracteres por linha.'); return; }
  data.photos = photos; data.published = $('#model-published').checked;
  if (editing) data.revision = editing.revision;
  setBusy(true);
  try {
    const {model} = await api(editing ? `/models/${editing.id}` : '/models',{method:editing ? 'PUT' : 'POST',data});
    ++catalogGeneration;
    models = editing ? models.map(item => item.id === model.id ? model : item) : [...models,model];
    dirty = false; renderModels(); $('#editor-view').hidden = true; $('#list-view').hidden = false;
    message('#catalog-message',`${model.name} salvo. ${model.published ? 'Já está disponível no site.' : 'Permanece oculto no site.'}`,'success');
    $('#catalog-message').scrollIntoView({block:'center'});
  } catch(error) { message('#editor-message',error.message); $('#editor-message').scrollIntoView({block:'center'}); }
  finally { setBusy(false); }
});
$('#delete-model').addEventListener('click',async () => {
  if (!editing || busy || uploading) return;
  if (!await confirmAction(`Excluir ${editing.name}?`, 'O modelo será removido do catálogo. Para apenas retirá-lo do site, desmarque “Mostrar este modelo no site”.', 'Excluir modelo',true)) return;
  setBusy(true);
  try {
    await api(`/models/${editing.id}`,{method:'DELETE',data:{revision:editing.revision}});
    ++catalogGeneration;
    models = models.filter(model => model.id !== editing.id); dirty = false; renderModels();
    $('#editor-view').hidden = true; $('#list-view').hidden = false;
    message('#catalog-message','Modelo excluído do catálogo.','success');
  } catch(error) { message('#editor-message',error.message); }
  finally { setBusy(false); }
});
window.addEventListener('beforeunload',event => { if (dirty || busy || uploading) { event.preventDefault(); event.returnValue = ''; } });
try {
  const session = await api('/session');
  if (session.authenticated) await enterWorkspace(session);
  else {
    showLogin(session.setupRequired ? 'O acesso administrativo precisa ser configurado pelo responsável pelo site.' : '');
    $('#login-submit').disabled = session.setupRequired;
  }
} catch(error) { showLogin(error.message); }
