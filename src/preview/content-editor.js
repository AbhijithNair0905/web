import { groups, validateContent } from './content-schema.js';
import { cloudConfigured } from './cloud-config.js';
import { cloud, ownerSession, loadCloudDraft, saveCloudDraft, uploadCloudFile, previewCloudAsset, clearCloudPreviews, publishCloudDraft } from './cloud-studio.js';

const labels = { projects: 'Projects', reels: 'Reels', animations: 'Motion explorations', social: 'Social designs', logos: 'Client logos' };
const guides = {
  projects: ['Cover: 1400 × 800 px · 7:4', 'Use JPG or WebP for covers, ideally under 1 MB. Keep essential text away from the edges.', 'Inside the popup: images around 1600–2000 px wide; tall e-commerce tiles keep their full height. Videos: MP4 (H.264) or WebM. Put the logo-reveal video first to autoplay.'],
  reels: ['Video: 1080 × 1920 px · 9:16', 'MP4 (H.264) is a good export choice; WebM also works. Aim for under 20 MB for fast previews.', 'Optional cover: 1080 × 1920 px. The grid fills a portrait frame; playback in the popup keeps the original proportions.'],
  animations: ['Video: 1920 × 1080 px · 16:9', 'Use MP4 (H.264) or WebM, ideally under 20 MB. Different proportions also work without cropping the video.', 'Optional cover: 1600 × 1000 px · 8:5, matching the landscape preview tile.'],
  social: ['Image: 1080 × 1080 px or 1080 × 1350 px', 'JPG or WebP is best for fast loading; PNG works well for crisp graphics. Aim for under 1 MB.', 'Portrait artwork fits inside the square grid without cropping. The popup shows the whole image. The first six items appear on the homepage.'],
  logos: ['Logo: about 600 × 300 px · transparent background', 'Use PNG or WebP, ideally under 200 KB. Light or monochrome logos work well on the dark background.', 'Keep similar breathing room around each logo. Leave the file empty to keep a placeholder shape.']
};
const $ = selector => document.querySelector(selector);
const online = cloudConfigured || new URLSearchParams(location.search).has('online');
let doc, revision, token, selectedGroup = 'projects', selectedId, dirty = false, busy = false, connected = false, publishedRevision = -1, recovering = false, authEpoch = 0;
const make = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const button = (text, handler, className = 'secondary') => { const node = make('button', className, text); node.type = 'button'; node.addEventListener('click', handler); return node; };
const selected = () => doc?.[selectedGroup].find(item => item.id === selectedId);
function message(text, isError = false) { $('#studio-status').textContent = text; $('#studio-status').dataset.error = String(isError); }
function syncState() {
  $('#save-content').disabled = !connected || !dirty || busy;
  $('#save-content').textContent = busy ? 'Working…' : online ? 'Save draft' : 'Save changes';
  $('#save-state').textContent = !connected ? online ? cloudConfigured ? 'Private studio · sign in required' : 'Preview only · sign-in not connected' : 'Editor not connected' : dirty ? 'Unsaved changes' : online ? revision === publishedRevision ? 'Published · draft saved' : 'Draft saved · not yet published' : 'All changes saved on this computer';
  $('#publish-content').hidden = !online || !connected;
  $('#publish-content').disabled = !connected || dirty || busy || revision === publishedRevision;
  $('#sign-out').hidden = !online || !connected;
  $('#sign-out').disabled = busy;
  $('#editing-fields').disabled = busy;
  document.querySelectorAll('#collection-navigation button,#item-list button,#add-item,#export-content').forEach(node => { node.disabled = busy; });
  $('#import-content').disabled = busy;
}
function change() { dirty = true; syncState(); }
function field(labelText, value, onChange, options = {}) {
  const label = make('label', 'field-label', labelText);
  const input = make(options.multiline ? 'textarea' : 'input');
  if (!options.multiline) input.type = options.type || 'text';
  input.value = value || ''; input.maxLength = options.max || (options.multiline ? 4000 : 160);
  if (options.placeholder) input.placeholder = options.placeholder;
  input.addEventListener('input', () => { onChange(input.value); change(); });
  label.append(input);
  if (options.help) label.append(make('small', '', options.help));
  return label;
}
function renderNavigation() {
  const navigation = $('#collection-navigation'); navigation.replaceChildren();
  for (const name of groups) {
    const tab = button(labels[name], () => {
      if (busy) return;
      selectedGroup = name; selectedId = doc[name][0]?.id; render();
    }, '');
    tab.setAttribute('aria-current', String(name === selectedGroup));
    tab.append(make('span', '', String(doc[name].length))); navigation.append(tab);
  }
}
function thumbSource(item) { return selectedGroup === 'projects' ? item.cover : ['reels', 'animations'].includes(selectedGroup) ? item.poster : item.src; }
function setPreviewSource(media, src) {
  if (!online) { media.src = src; return; }
  previewCloudAsset(src).then(url => { if (media.isConnected) media.src = url; }).catch(() => { if (media.isConnected) media.dispatchEvent(new Event('error')); });
}
function renderList() {
  const list = $('#item-list'); list.replaceChildren();
  const items = doc[selectedGroup];
  $('#collection-count').textContent = `${items.length} items · ${items.filter(item => item.enabled).length} visible`;
  for (const [index, item] of items.entries()) {
    const row = button('', () => { if (busy) return; selectedId = item.id; renderList(); renderDetail(); if (window.innerWidth < 801) $('.studio-detail').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 'item-row');
    row.setAttribute('aria-pressed', String(item.id === selectedId));
    row.setAttribute('aria-label', `Edit ${item.title}`);
    const thumbnail = make('span', 'item-thumb');
    const src = thumbSource(item);
    if (src) { const img = make('img'); img.alt = ''; img.loading = 'lazy'; img.addEventListener('error', () => thumbnail.replaceChildren(make('span', '', '◇'))); thumbnail.append(img); setPreviewSource(img, src); }
    else thumbnail.textContent = ['reels', 'animations'].includes(selectedGroup) ? '▷' : '◇';
    const info = make('span', 'item-info'); info.append(make('strong', '', item.title || 'Untitled'), make('span', '', `${String(index + 1).padStart(2, '0')} / ${item.enabled ? 'Visible' : 'Hidden'}`));
    row.append(thumbnail, info, make('span', 'item-arrow', '↗')); list.append(row);
  }
}
function assetControl(title, src, type, setValue, { optional = false } = {}) {
  const group = make('div', 'asset-control'); group.append(make('p', 'asset-title', title));
  const preview = make('div', 'asset-preview');
  function previewSource(value) {
    preview.querySelectorAll('video').forEach(video => { video.pause(); video.removeAttribute('src'); video.load(); });
    preview.replaceChildren();
    if (!value) { preview.append(make('span', '', optional ? 'Optional — no file selected' : 'Choose a file below')); return; }
    // This only displays an image/video; user-provided text is never inserted as HTML.
    if (!/^(https:\/\/|\/(projects|portfolio-uploads)\/)/.test(value)) { preview.append(make('span', '', 'Choose a file or use a direct HTTPS media link.')); return; }
    const media = make(type === 'video' ? 'video' : 'img');
    if (type === 'video') { media.controls = true; media.preload = 'metadata'; media.playsInline = true; }
    else media.alt = title;
    media.addEventListener('error', () => preview.replaceChildren(make('span', '', 'Preview unavailable. Check the file or link.')));
    preview.append(media); setPreviewSource(media, value);
  }
  previewSource(src); group.append(preview);
  const chooser = make('input'); chooser.type = 'file'; chooser.hidden = true;
  chooser.accept = type === 'video' ? '.mp4,.webm' : '.png,.jpg,.jpeg,.webp,.gif,.avif';
  const controls = make('div', 'asset-buttons');
  const upload = button(src ? 'Replace file ↑' : 'Choose file ↑', () => chooser.click(), 'upload-button');
  controls.append(upload);
  if (optional && src) controls.append(button('Remove file', () => { setValue(''); change(); renderList(); renderDetail(); }));
  group.append(controls, chooser);
  const link = field('Or paste a direct file link', src, value => { setValue(value.trim()); }, { max: 2000, placeholder: type === 'video' ? 'https://…/video.mp4' : 'https://…/image.webp', help: 'Canva, Instagram and YouTube page links do not work here. Export the file and upload it instead.' });
  link.querySelector('input').addEventListener('change', event => { previewSource(event.target.value.trim()); renderList(); });
  group.append(link);
  const info = make('p', 'asset-help', type === 'video' ? `Upload limit: ${online ? 50 : 150} MB. Smaller exports load faster.` : 'Upload limit: 20 MB. Your file is kept at its original dimensions.'); group.append(info);
  chooser.addEventListener('change', async () => {
    const file = chooser.files?.[0]; if (!file) return;
    const isVideo = /\.(mp4|webm)$/i.test(file.name);
    if ((type === 'video') !== isVideo || !(isVideo ? /\.(mp4|webm)$/i : /\.(png|jpe?g|webp|gif|avif)$/i).test(file.name)) { message(`Choose ${type === 'video' ? 'an MP4 or WebM video' : 'a PNG, JPG, WebP, GIF or AVIF image'}.`, true); chooser.value = ''; return; }
    const limit = (isVideo ? online ? 50 : 150 : 20) * 1024 * 1024;
    if (!file.size || file.size > limit) { message(`Choose a non-empty file under ${limit / 1024 / 1024} MB.`, true); chooser.value = ''; return; }
    busy = true; syncState(); message(`Uploading ${file.name}…`);
    try {
      const dimensions = await inspectDimensions(file, type);
      const result = await uploadFile(file, percent => { info.textContent = `Uploading ${percent}%`; message(`Uploading ${file.name} — ${percent}%`); });
      setValue(result.src); change();
      const size = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
      message(`Uploaded ${file.name}${dimensions ? ` · ${dimensions.width} × ${dimensions.height} px` : ''} · ${size}. ${dimensionAdvice(dimensions, type)} ${online ? 'Save the draft, then publish when ready.' : 'Save changes to use it on the website.'}`);
      renderList(); renderDetail();
    } catch (error) { message(error.message || 'Upload failed. Please try again.', true); }
    finally { busy = false; syncState(); chooser.value = ''; }
  });
  return group;
}
function inspectDimensions(file, type) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file), media = document.createElement(type === 'video' ? 'video' : 'img');
    let timer;
    const done = result => { clearTimeout(timer); media.onload = media.onloadedmetadata = media.onerror = null; media.removeAttribute('src'); if (type === 'video') media.load(); URL.revokeObjectURL(url); resolve(result); };
    if (type === 'video') { media.preload = 'metadata'; media.onloadedmetadata = () => done({ width: media.videoWidth, height: media.videoHeight }); }
    else media.onload = () => done({ width: media.naturalWidth, height: media.naturalHeight });
    media.onerror = () => done(null); timer = setTimeout(() => done(null), 5000); media.src = url;
  });
}
function dimensionAdvice(dimensions, type) {
  if (!dimensions?.height) return 'Check the media preview before saving.';
  if (selectedGroup === 'reels' && Math.abs(dimensions.width / dimensions.height - 9 / 16) > .05) return 'This is not 9:16; the reel grid will crop its edges.';
  if (type === 'image' && selectedGroup === 'projects' && dimensions.width < 1000) return 'This image may look soft on a large screen.';
  return 'Original proportions are preserved in the popup.';
}
function uploadFile(file, onProgress) {
  if (online) return uploadCloudFile(file);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `/api/editor/upload?name=${encodeURIComponent(file.name)}`);
    request.timeout = 180000; request.setRequestHeader('X-Editor-Token', token);
    request.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
    request.onload = () => { try { const result = JSON.parse(request.responseText); if (request.status < 200 || request.status >= 300) throw new Error(result.error || 'Upload failed.'); resolve(result); } catch (error) { reject(error); } };
    request.onerror = () => reject(new Error('Upload failed. Check that Content studio is still running.'));
    request.ontimeout = () => reject(new Error('Upload timed out. Try a smaller file.'));
    request.send(file);
  });
}
function renderDetail() {
  const item = selected(), fields = $('#editing-fields');
  fields.querySelectorAll('video').forEach(video => { video.pause(); video.removeAttribute('src'); video.load(); });
  fields.replaceChildren(); $('#empty-detail').hidden = Boolean(item); $('#item-form').hidden = !item;
  $('#detail-title').textContent = item?.title || 'Choose a tile'; $('#item-state').textContent = item ? item.enabled ? 'Visible' : 'Hidden' : '';
  if (!item) return;
  const visibleLabel = make('label', 'visibility-label'), visible = make('input'); visible.type = 'checkbox'; visible.checked = item.enabled;
  visible.addEventListener('change', () => { item.enabled = visible.checked; change(); renderList(); $('#item-state').textContent = item.enabled ? 'Visible' : 'Hidden'; });
  visibleLabel.append(visible, document.createTextNode('Show this item on the website')); fields.append(visibleLabel);
  fields.append(field(selectedGroup === 'logos' ? 'Company name' : 'Title', item.title, value => { item.title = value; $('#detail-title').textContent = value || 'Untitled'; renderList(); }));
  if (selectedGroup === 'projects') {
    fields.append(field('Category', item.category, value => { item.category = value; }, { max: 100, help: 'For example: Brand identity, E-commerce design, or Campaign design.' }));
  }
  if ('description' in item) fields.append(field('Short description', item.description, value => { item.description = value; }, { multiline: true }));
  if (selectedGroup === 'projects') {
    fields.append(assetControl('Project cover · 1400 × 800 px recommended', item.cover, 'image', value => { item.cover = value; }));
    const heading = make('div', 'media-heading'); heading.append(make('h3', '', 'Inside the project popup'));
    const actions = make('div');
    for (const type of ['image', 'video']) actions.append(button(`+ ${type === 'image' ? 'Image' : 'Video'}`, () => { item.media.push({ type, src: '', ...(type === 'image' ? { alt: '' } : {}) }); change(); renderDetail(); }, 'small-button'));
    heading.append(actions); fields.append(heading, make('p', 'asset-help', 'Use the arrows to set the viewing order. A video in position 1 plays as the project opens.'));
    item.media.forEach((entry, index) => {
      const block = make('div', 'media-block'), row = make('div', 'media-actions');
      row.append(make('span', '', `${index + 1} / ${entry.type === 'image' ? 'Image' : 'Video'}`));
      const controls = make('div');
      const up = button('↑', () => { [item.media[index - 1], item.media[index]] = [item.media[index], item.media[index - 1]]; change(); renderDetail(); }); up.disabled = index === 0; up.setAttribute('aria-label', 'Move media earlier');
      const down = button('↓', () => { [item.media[index + 1], item.media[index]] = [item.media[index], item.media[index + 1]]; change(); renderDetail(); }); down.disabled = index === item.media.length - 1; down.setAttribute('aria-label', 'Move media later');
      controls.append(up, down, button('Remove', () => { if (!window.confirm('Remove this image or video from the project? The uploaded file will be kept.')) return; item.media.splice(index, 1); change(); renderDetail(); })); row.append(controls); block.append(row);
      block.append(assetControl(entry.type === 'image' ? 'Artwork' : 'Video', entry.src, entry.type, value => { entry.src = value; }));
      if (entry.type === 'image') block.append(field('Image description', entry.alt || '', value => { entry.alt = value; }, { max: 240, help: 'Describe what is shown for visitors using a screen reader.' }));
      fields.append(block);
    });
  } else if (['reels', 'animations'].includes(selectedGroup)) {
    fields.append(assetControl('Video', item.src, 'video', value => { item.src = value; }));
    fields.append(assetControl('Preview cover · optional', item.poster, 'image', value => { item.poster = value; }, { optional: true }));
  } else {
    fields.append(assetControl(selectedGroup === 'logos' ? 'Company logo' : 'Social artwork', item.src, 'image', value => { item.src = value; }, { optional: selectedGroup === 'logos' }));
    if (selectedGroup === 'social') fields.append(field('Image description', item.alt, value => { item.alt = value; }, { max: 240, help: 'Describe the artwork for visitors using a screen reader.' }));
  }
  const index = doc[selectedGroup].indexOf(item), actions = make('div', 'item-actions');
  const move = direction => { const items = doc[selectedGroup]; [items[index], items[index + direction]] = [items[index + direction], items[index]]; change(); renderList(); renderDetail(); };
  const up = button('Move earlier ↑', () => move(-1)); up.disabled = index === 0;
  const down = button('Move later ↓', () => move(1)); down.disabled = index === doc[selectedGroup].length - 1;
  actions.append(up, down, button('Remove item', () => {
    if (!window.confirm(`Remove “${item.title}” from this collection? You can turn off its visibility instead. Uploaded files will be kept.`)) return;
    doc[selectedGroup].splice(index, 1); selectedId = doc[selectedGroup][Math.min(index, doc[selectedGroup].length - 1)]?.id; change(); render();
  }, 'remove-item')); fields.append(actions); fields.disabled = busy;
}
function render() {
  renderNavigation(); $('#collection-title').textContent = labels[selectedGroup];
  const guide = $('#size-guide'); guide.replaceChildren(make('strong', '', guides[selectedGroup][0]), ...guides[selectedGroup].slice(1).map(text => make('p', '', text)));
  renderList(); renderDetail(); syncState();
}
$('#item-form').addEventListener('submit', event => event.preventDefault());
$('#add-item').addEventListener('click', () => {
  if (busy) return;
  const item = { id: crypto.randomUUID(), title: `New ${selectedGroup === 'projects' ? 'project' : selectedGroup === 'logos' ? 'company' : selectedGroup === 'social' ? 'social design' : selectedGroup === 'reels' ? 'reel' : 'exploration'}`, enabled: true };
  if (selectedGroup === 'projects') Object.assign(item, { category: 'Brand identity', description: '', cover: '', media: [] });
  else if (['reels', 'animations'].includes(selectedGroup)) Object.assign(item, { description: '', src: '', poster: '' });
  else if (selectedGroup === 'social') Object.assign(item, { src: '', alt: '' });
  else Object.assign(item, { src: '', placeholder: 'orbit' });
  doc[selectedGroup].push(item); selectedId = item.id; change(); render();
});
$('#save-content').addEventListener('click', async () => {
  if (busy || !dirty) return;
  let content;
  try { content = validateContent(doc); } catch (error) { message(error.message, true); return; }
  busy = true; syncState(); message('Saving your content…');
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
  try {
    let result;
    if (online) result = await saveCloudDraft(content, revision, controller.signal);
    else {
      const response = await fetch('/api/editor/content', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Editor-Token': token }, body: JSON.stringify({ content, revision }), signal: controller.signal });
      result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not save changes.');
    }
    doc = result.content; revision = result.revision; dirty = false;
    message(online ? 'Draft saved privately. Select Publish when you’re ready to update the website.' : 'Saved. Open “View website” or refresh your portfolio tab to see the changes. Your live domain has not changed.'); render();
  } catch (error) { message(error.name === 'AbortError' ? 'The save took too long to confirm. Download your draft backup before reloading to check the saved version.' : error.message, true); }
  finally { clearTimeout(timeout); busy = false; syncState(); }
});
$('#export-content').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }));
  const link = make('a'); link.href = url; link.download = `abhijith-portfolio-content-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  message(`Content backup downloaded. It contains text and file links; ${online ? 'your uploaded media remains in your private online library.' : 'keep your website project folder to preserve uploaded media.'}`);
});
$('#import-content').addEventListener('change', async event => {
  if (busy) return; const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error('Choose a content backup under 2 MB.');
    const restored = validateContent(JSON.parse(await file.text()));
    if (!window.confirm(`Replace the current editor draft with this backup? Nothing changes on the website until you ${online ? 'publish' : 'save'}.`)) return;
    doc = restored; selectedId = doc[selectedGroup][0]?.id; change(); render(); message('Backup loaded as a draft. Review it, then save.');
  } catch (error) { message(error.message, true); }
  finally { event.target.value = ''; }
});
window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
async function connect() {
  message(''); $('#retry-connection').disabled = true;
  const epoch = authEpoch;
  try {
    let result;
    if (online) {
      if (!cloudConfigured) { showLogin('Sign-in is not connected yet. No studio email or password has been created.'); return; }
      if (!await ownerSession()) { showLogin(); return; }
      if (recovering) return;
      result = await loadCloudDraft(); publishedRevision = result.publishedRevision;
    } else {
      const response = await fetch('/api/editor/session', { cache: 'no-store' });
      if (!response.ok) throw new Error('Editor unavailable');
      result = await response.json();
    }
    if (epoch !== authEpoch) return;
    doc = validateContent(result.content); revision = result.revision; token = result.token;
    selectedId = doc[selectedGroup][0]?.id; connected = true; dirty = false;
    $('#studio-login').hidden = true; $('#connection-error').hidden = true; $('#studio-layout').hidden = false;
    $('#seed-content').hidden = !online || revision !== 0;
    render();
  } catch (error) {
    connected = false;
    if (online) showLogin(error.message);
    else { $('#connection-error').hidden = false; $('#studio-layout').hidden = true; syncState(); }
  }
  finally { $('#retry-connection').disabled = false; }
}
$('#retry-connection').addEventListener('click', connect);
function showLogin(text = '') {
  connected = false; $('#studio-layout').hidden = true; $('#connection-error').hidden = true; $('#studio-login').hidden = false;
  $('#login-form').hidden = recovering; $('#password-form').hidden = !recovering;
  $('#login-fields').disabled = !cloudConfigured;
  if (!cloudConfigured) {
    $('#login-title').textContent = 'Online studio preview';
    $('#login-intro').textContent = 'This is a preview of the future login screen, so the fields below are disabled. You can edit your content now using the working editor on this computer, with no password.';
    $('#local-editor-shortcut').hidden = !['localhost', '127.0.0.1'].includes(location.hostname);
  }
  $('#login-status').textContent = text; syncState();
}
if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') $('#view-website').href = '/hero-preview.html';
if (online) {
  $('#studio-mode').textContent = cloudConfigured ? 'Private online studio' : 'Login screen preview';
  $('#view-website').href = location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? '/hero-preview.html' : '/';
  $('#studio-save-hint').textContent = 'Save a private draft. Publish when you’re ready for visitors to see it.';
  $('#backup-hint').textContent = 'Backups contain text and file links. Uploaded media stays in your online library.';
}
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!cloudConfigured || !event.target.reportValidity()) return;
  $('#login-fields').disabled = true; $('#login-status').textContent = 'Signing in…';
  try {
    const { error } = await cloud.auth.signInWithPassword({ email: $('#login-email').value.trim(), password: $('#login-password').value });
    if (error) throw new Error('Sign-in failed. Check your email and password.');
    $('#login-password').value = ''; await connect();
  } catch (error) { $('#login-status').textContent = error.message; }
  finally { $('#login-fields').disabled = false; }
});
$('#sign-out').addEventListener('click', async () => {
  if (dirty && !confirm('Sign out and discard unsaved changes? Your saved draft will be kept.')) return;
  const { error } = await cloud.auth.signOut(); if (error) message(error.message, true);
});
$('#reset-password').addEventListener('click', async () => {
  if (!cloudConfigured) return;
  const email = $('#login-email'); if (!email.reportValidity()) return;
  $('#reset-password').disabled = true;
  try {
    const { error } = await cloud.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: location.origin + '/content-editor.html' });
    if (error) throw error;
    $('#login-status').textContent = 'If this account exists, a password reset link will arrive by email.';
  } catch { $('#login-status').textContent = 'Could not send the reset email. Please try again later.'; }
  finally { $('#reset-password').disabled = false; }
});
$('#password-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!event.target.reportValidity()) return;
  if ($('#new-password').value !== $('#confirm-password').value) { $('#login-status').textContent = 'The two passwords do not match.'; return; }
  const submit = event.target.querySelector('button'); submit.disabled = true;
  try {
    const { error } = await cloud.auth.updateUser({ password: $('#new-password').value });
    if (error) throw error;
    event.target.reset(); recovering = false; await connect();
  } catch (error) { $('#login-status').textContent = error.message || 'Could not update the password. Please try again.'; }
  finally { submit.disabled = false; }
});
$('#seed-content').addEventListener('click', async () => {
  if (busy || !confirm('Load the current portfolio into your draft? It will not change the public site until you publish.')) return;
  try { const response = await fetch('/portfolio-content.json'); if (!response.ok) throw new Error('Could not load the current portfolio.'); doc = validateContent(await response.json()); selectedId = doc[selectedGroup][0]?.id; change(); render(); message('Current portfolio loaded. Save the draft to keep it online.'); }
  catch (error) { message(error.message, true); }
});
$('#publish-content').addEventListener('click', async () => {
  if (busy || dirty || !connected) return;
  if (!confirm('Publish this saved draft? Visitors will see this version of your portfolio.')) return;
  busy = true; syncState();
  try { const result = await publishCloudDraft(revision, text => message(text)); publishedRevision = result.revision; message('Published. Refresh the website to see your latest work.'); }
  catch (error) { message(error.message, true); }
  finally { busy = false; syncState(); }
});
if (cloud) cloud.auth.onAuthStateChange((event) => {
  // Supabase auth callbacks stay synchronous; follow-up requests happen outside the lock.
  if (event === 'PASSWORD_RECOVERY') { recovering = true; setTimeout(() => showLogin('Choose a new password.'), 0); }
  if (event === 'SIGNED_OUT') {
    authEpoch++; doc = undefined; dirty = false; connected = false; clearCloudPreviews();
    $('#editing-fields').replaceChildren(); $('#item-list').replaceChildren();
    setTimeout(() => showLogin('Signed out.'), 0);
  }
});
connect();
