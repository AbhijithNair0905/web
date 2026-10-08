import { loadContent } from './content-store.js';
import { projectType, workTypes } from './content-schema.js';

async function initGallery() {
const content = await loadContent();
const projects = content.projects.filter(item => item.enabled);
let filteredProjects = projects;
const socialCollection = { title: 'Social, by design', category: 'Social media collection', description: 'A collection of social media designs.', media: content.social.filter(item => item.enabled).map(item => ({ type: 'image', src: item.src, alt: item.alt || item.title })) };
const reels = content.reels.filter(item => item.enabled).map(item => ({ ...item, kind: 'reel', category: 'Short-form motion', media: [{ type: 'video', src: item.src }] }));
const animations = content.animations.filter(item => item.enabled).map(item => ({ ...item, kind: 'animation', category: 'Motion exploration', media: [{ type: 'video', src: item.src }] }));
const collections = { reels, animations };
const collectionLimits = { reels: 6, animations: 6 };
let activeCollection = 'reels';

const workRail = document.querySelector('#work-rail');
const dialog = document.querySelector('#work-dialog');
const mediaContainer = document.querySelector('#dialog-media');
const closeButton = document.querySelector('#close-dialog');
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let activeItems = projects, activeIndex = 0, opener = null, savedScroll = 0, renderRevision = 0;
const imageDialog = document.querySelector('#image-dialog');
const previewToggle = document.querySelector('#reel-motion');
let previewsPaused = reduced.matches || Boolean(navigator.connection?.saveData);
const visiblePreviews = new Set();
const previewDeadlines = new WeakMap();
const pendingPlays = new WeakSet();
let needsPlaybackGesture = false;
let expandedImages = [], expandedIndex = 0, imageOpener = null;

function playSafely(player) {
  if (pendingPlays.has(player)) return;
  pendingPlays.add(player);
  const result = player.play();
  if (!result?.then) { pendingPlays.delete(player); return; }
  result.catch(error => {
    // A scroll/pause can abort an in-flight play request; that isn't a blocked video.
    if (error.name === 'AbortError') return;
    setMediaLoading(player, false);
    player.classList.add('autoplay-blocked');
    if (error.name === 'NotAllowedError' && player.closest('.motion-grid')) {
      needsPlaybackGesture = true; updatePreviewToggle();
    }
  }).finally(() => pendingPlays.delete(player));
}
function previewShouldPlay(player) {
  return !previewsPaused && !document.hidden && !dialog.open && !player.closest('[hidden]') && visiblePreviews.has(player);
}
function startPreview(player) {
  if (!previewShouldPlay(player)) return;
  player.muted = true; player.defaultMuted = true; player.autoplay = true;
  if (player.readyState < 2) setMediaLoading(player, true);
  playSafely(player);
}
function updatePreviewToggle() {
  previewToggle.textContent = previewsPaused ? 'Play previews ▷' : needsPlaybackGesture ? 'Tap to enable previews ▷' : 'Pause previews Ⅱ';
  previewToggle.setAttribute('aria-pressed', String(previewsPaused));
}
function syncPreviews() {
  document.querySelectorAll('.motion-grid video').forEach(player => {
    if (previewShouldPlay(player)) startPreview(player);
    else { player.autoplay = false; player.pause(); setMediaLoading(player, false); }
  });
  updatePreviewToggle();
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function previewVideo(src) {
  const player = element('video', 'tile-video');
  player.muted = true; player.defaultMuted = true; player.playsInline = true; player.loop = true; player.preload = 'none';
  player.setAttribute('muted', ''); player.setAttribute('playsinline', ''); player.setAttribute('webkit-playsinline', '');
  player.tabIndex = -1; player.setAttribute('aria-hidden', 'true');
  player.dataset.src = src;
  return player;
}

function logoLoader() {
  const loader = element('span', 'media-loader'); loader.hidden = true; loader.setAttribute('aria-hidden', 'true');
  const logo = element('img', 'loading-logo'); logo.src = '/abhijith-logo.png'; logo.alt = ''; logo.width = 164; logo.height = 98;
  loader.append(logo); return loader;
}
function setMediaLoading(player, loading) {
  const loader = player.parentElement?.querySelector('.media-loader');
  if (loader) loader.hidden = !loading;
}

projects.forEach(project => {
  const card = element('button', 'project'); card.type = 'button';
  card.setAttribute('aria-haspopup', 'dialog');
  card.setAttribute('aria-label', `View ${project.title}`);
  const visual = element('div', 'project-image');
  if (project.cover) {
    const cover = element('img'); cover.src = project.cover; cover.alt = ''; cover.loading = 'lazy'; visual.append(cover);
  } else {
    visual.classList.add('motion-cover'); visual.append(element('span', 'motion-cover-word', 'MOTION'), previewVideo(project.coverVideo));
  }
  visual.append(element('span', 'open-project', '↗'));
  const caption = element('div', 'project-caption');
  caption.append(element('h3', '', project.title), element('span', '', project.category));
  card.dataset.workType = projectType(project);
  card.append(visual, caption); card.addEventListener('click', () => openItem(filteredProjects, filteredProjects.indexOf(project), card)); workRail.append(card);
});

const filters = document.querySelector('#work-filters');
for (const [type, label] of Object.entries({ all: 'All work', ...workTypes })) {
  if (type !== 'all' && !projects.some(item => projectType(item) === type)) continue;
  const filter = element('button', '', label); filter.type = 'button'; filter.dataset.type = type;
  filter.setAttribute('aria-pressed', String(type === 'all'));
  filter.addEventListener('click', () => {
    filteredProjects = type === 'all' ? projects : projects.filter(item => projectType(item) === type);
    workRail.querySelectorAll('.project').forEach(card => { card.hidden = type !== 'all' && card.dataset.workType !== type; });
    filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button === filter)));
    workRail.scrollLeft = 0; updateRail(workRail);
  });
  filters.append(filter);
}
filters.hidden = filters.children.length < 3;

Object.entries(collections).forEach(([name, items]) => items.forEach((item, index) => {
  const card = element('button', 'reel-card'); card.type = 'button';
  card.setAttribute('aria-label', `Play ${item.title}`); card.setAttribute('aria-haspopup', 'dialog');
  const visual = element('div', 'reel-image');
  visual.append(element('span', 'reel-number', String(index + 1).padStart(2, '0')), previewVideo(item.media[0].src), logoLoader(), element('span', 'play-mark', '▶'));
  if (item.poster) {
    visual.querySelector('video').poster = item.poster;
    visual.querySelector('video').classList.add('has-poster');
  }
  const caption = element('div', 'reel-caption'); caption.append(element('span', '', item.title), element('span', '', 'Watch ↗'));
  card.dataset.itemIndex = index; card.dataset.collection = name;
  card.hidden = index >= collectionLimits[name];
  card.append(visual, caption); card.addEventListener('click', () => {
    const available = items.filter(entry => !entry.unavailable);
    openItem(available, available.indexOf(item), card);
  }); document.querySelector(`#${name}-panel .motion-grid`).append(card);
}));

socialCollection.media.slice(0, 6).forEach((entry, index) => {
  const card = element('button', 'social-thumbnail'); card.type = 'button';
  card.setAttribute('aria-label', `Enlarge ${entry.alt}`); card.setAttribute('aria-haspopup', 'dialog');
  const cover = element('img'); cover.src = entry.src; cover.alt = ''; cover.loading = 'lazy';
  card.append(cover, element('span', 'enlarge-mark', '↗'));
  card.addEventListener('click', () => {
    openItem([socialCollection], 0, card);
    openImage(socialCollection.media, index, mediaContainer.querySelectorAll('.social-thumbnail')[index]);
  });
  document.querySelector('#social-preview').append(card);
});
document.querySelector('#explore-social').addEventListener('click', event => openItem([socialCollection], 0, event.currentTarget));
document.querySelector('.social-section .section-heading>span').textContent = `${socialCollection.media.length} designs / the collection`;
document.querySelector('.social-section .collection-footer>span').textContent = `${Math.min(6, socialCollection.media.length)} selected frames`;
document.querySelector('#social').hidden = !socialCollection.media.length;
document.querySelector('#selected-work').hidden = !projects.length;
document.querySelector('#reels').hidden = !reels.length && !animations.length;

function updateCollection(name) {
  const items = collections[name], available = items.filter(item => !item.unavailable);
  const label = name === 'animations' ? 'explorations' : 'reels';
  let shown = 0;
  document.querySelectorAll(`#${name}-panel .reel-card`).forEach(card => {
    const item = items[Number(card.dataset.itemIndex)];
    card.hidden = Boolean(item.unavailable) || shown >= collectionLimits[name];
    if (!card.hidden) shown++;
    else {
      const player = card.querySelector('video');
      visiblePreviews.delete(player); clearPreviewDeadline(player); player.autoplay = false; player.pause(); setMediaLoading(player, false);
    }
  });
  document.querySelector(`#${name}-count`).textContent = `${shown} of ${available.length} ${label}`;
  document.querySelector(`#${name}-tab span`).textContent = available.length;
  const more = document.querySelector(`[data-more="${name}"]`);
  more.hidden = available.length <= 6;
  more.textContent = shown < available.length ? `View more ${label} ↓` : 'Show fewer ↑';
}
function selectCollection(name) {
  activeCollection = name;
  document.querySelectorAll('.motion-tabs [role="tab"]').forEach(tab => {
    const selected = tab.dataset.collection === name;
    tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    panel.hidden = !selected;
    if (!selected) panel.querySelectorAll('video').forEach(player => { visiblePreviews.delete(player); clearPreviewDeadline(player); });
  });
  syncPreviews();
}
document.querySelectorAll('.motion-tabs [role="tab"]').forEach(tab => {
  tab.addEventListener('click', () => selectCollection(tab.dataset.collection));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const name = event.key === 'Home' ? 'reels' : event.key === 'End' ? 'animations' : activeCollection === 'reels' ? 'animations' : 'reels';
    selectCollection(name); document.querySelector(`#${name}-tab`).focus();
  });
});
document.querySelectorAll('[data-more]').forEach(button => button.addEventListener('click', () => {
  const name = button.dataset.more;
  const total = collections[name].filter(item => !item.unavailable).length;
  const collapsing = collectionLimits[name] >= total;
  collectionLimits[name] = collapsing ? 6 : collectionLimits[name] + 6;
  updateCollection(name);
  if (collapsing) document.querySelector('.motion-tabs').scrollIntoView({ block: 'start', behavior: reduced.matches ? 'instant' : 'smooth' });
}));
Object.keys(collections).forEach(updateCollection);
if (!reels.length && animations.length) selectCollection('animations');

function clearPreviewDeadline(player) {
  clearTimeout(previewDeadlines.get(player)); previewDeadlines.delete(player);
}
function hideUnavailableReel(player) {
  const card = player.closest('.reel-card');
  if (!card || !player.getAttribute('src')) return;
  clearPreviewDeadline(player); visiblePreviews.delete(player); previewObserver.unobserve(player);
  collections[card.dataset.collection][Number(card.dataset.itemIndex)].unavailable = true;
  card.hidden = true; player.pause(); player.removeAttribute('src'); player.load();
  setMediaLoading(player, false);
  updateCollection(card.dataset.collection);
}

// Load visible previews, start when playable, and pause off-screen without losing the still frame.
const previewObserver = new IntersectionObserver(entries => {
  entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
    const isReel = Boolean(target.closest('.motion-grid'));
    if (isIntersecting && intersectionRatio >= .2 && !target.closest('[hidden]')) {
      visiblePreviews.add(target);
      if (!target.getAttribute('src')) {
        target.preload = 'auto';
        target.autoplay = isReel && previewShouldPlay(target);
        target.src = target.dataset.src; target.load();
        setMediaLoading(target, true);
      }
      if (isReel && !target.classList.contains('has-frame') && !previewDeadlines.has(target)) {
        previewDeadlines.set(target, setTimeout(() => {
          previewDeadlines.delete(target);
          if (!target.classList.contains('has-frame') && !document.hidden && !dialog.open) hideUnavailableReel(target);
        }, 15000));
      }
      if (isReel) startPreview(target);
    } else {
      visiblePreviews.delete(target); target.autoplay = false; target.pause(); clearPreviewDeadline(target);
      setMediaLoading(target, false);
      // Keep the decoded still frame when leaving view so scrolling back never reveals an empty tile.
    }
  });
}, { threshold: [0, .2] });
document.querySelectorAll('.tile-video').forEach(player => {
  player.addEventListener('loadeddata', () => { player.classList.add('has-frame'); clearPreviewDeadline(player); setMediaLoading(player, false); });
  player.addEventListener('canplay', () => { setMediaLoading(player, false); if (player.closest('.motion-grid')) startPreview(player); });
  player.addEventListener('waiting', () => { if (previewShouldPlay(player)) setMediaLoading(player, true); });
  player.addEventListener('pause', () => setMediaLoading(player, false));
  player.addEventListener('error', () => hideUnavailableReel(player));
  player.addEventListener('playing', () => {
    player.classList.add('has-frame'); player.classList.remove('autoplay-blocked'); clearPreviewDeadline(player);
    setMediaLoading(player, false);
    if (player.closest('.motion-grid') && !previewShouldPlay(player)) { player.autoplay = false; player.pause(); }
  });
  previewObserver.observe(player);
});
previewToggle.addEventListener('click', () => {
  if (needsPlaybackGesture) { previewsPaused = false; needsPlaybackGesture = false; }
  else previewsPaused = !previewsPaused;
  syncPreviews();
});
// Retry policy-blocked muted playback after an actual user gesture, without overriding Pause.
function retryAfterGesture(event) {
  if (event.target.closest?.('#reel-motion')) return;
  if (previewsPaused || !needsPlaybackGesture) return;
  needsPlaybackGesture = false; syncPreviews();
}
document.addEventListener('pointerup', retryAfterGesture);
document.addEventListener('keydown', retryAfterGesture);
reduced.addEventListener('change', () => { previewsPaused = reduced.matches; syncPreviews(); });
document.addEventListener('visibilitychange', () => {
  syncPreviews();
  mediaContainer.querySelectorAll('video').forEach(player => {
    if (document.hidden && !player.paused) { player.dataset.resumeVisible = 'true'; player.pause(); }
    else if (!document.hidden && player.dataset.resumeVisible && dialog.open) { delete player.dataset.resumeVisible; playSafely(player); }
  });
});
syncPreviews();

function updateRail(rail) {
  if (!rail.querySelector('.project:not([hidden])')) return;
  const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
  document.querySelector(`[data-rail="${rail.id}"][data-direction="-1"]`).disabled = rail.scrollLeft <= 2;
  document.querySelector(`[data-rail="${rail.id}"][data-direction="1"]`).disabled = rail.scrollLeft >= max - 2;
  if (rail === workRail) {
    const width = rail.querySelector('.project:not([hidden])').getBoundingClientRect().width + parseFloat(getComputedStyle(rail).gap);
    const first = Math.round(rail.scrollLeft / width) + 1;
    const visible = Math.max(1, Math.round(rail.clientWidth / width));
    document.querySelector('#work-count').textContent = `${String(first).padStart(2, '0')}—${String(Math.min(filteredProjects.length, first + visible - 1)).padStart(2, '0')} / ${String(filteredProjects.length).padStart(2, '0')}`;
  }
}
function stepRail(rail, direction) {
  if (!rail.querySelector('.project:not([hidden])')) return;
  const width = rail.querySelector('.project:not([hidden])').getBoundingClientRect().width + parseFloat(getComputedStyle(rail).gap);
  rail.scrollBy({ left: direction * width, behavior: reduced.matches ? 'instant' : 'smooth' });
}
document.querySelectorAll('[data-rail]').forEach(button => button.addEventListener('click', () => stepRail(document.getElementById(button.dataset.rail), Number(button.dataset.direction))));
[workRail].forEach(rail => {
  rail.addEventListener('scroll', () => updateRail(rail), { passive: true });
  rail.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); stepRail(rail, e.key === 'ArrowRight' ? 1 : -1); }
  });
  new ResizeObserver(() => updateRail(rail)).observe(rail);
  updateRail(rail);
});

function stopMedia() {
  mediaContainer.querySelectorAll('video').forEach(player => { player.pause(); player.removeAttribute('src'); player.load(); });
}
function renderItem() {
  const revision = ++renderRevision;
  if (imageDialog.open) imageDialog.close();
  stopMedia(); mediaContainer.replaceChildren();
  const item = activeItems[activeIndex], isReel = item.kind === 'reel';
  const isSocial = item.category === 'Social media collection';
  dialog.classList.toggle('reel-dialog', isReel);
  dialog.classList.toggle('collection-dialog', isSocial);
  const isProject = !item.kind && !isSocial;
  dialog.classList.toggle('project-dialog', isProject);
  mediaContainer.classList.toggle('social-grid', isSocial);
  mediaContainer.classList.toggle('project-media-grid', isProject);
  mediaContainer.dataset.layout = isProject ? projectType(item) : '';
  const imageEntries = item.media.filter(entry => entry.type === 'image');
  const imageButtons = new Map();
  const longLayouts = element('div', 'long-layouts');
  const ecommerce = isProject && projectType(item) === 'ecommerce';
  const overview = ecommerce ? element('div', 'ecommerce-overview') : null;
  const squares = ecommerce ? element('div', 'ecommerce-squares') : null;
  function updateOverview() {
    if (!overview) return;
    overview.style.setProperty('--overview-rows', Math.max(1, Math.ceil(squares.children.length / 3)));
    overview.classList.toggle('has-long-layout', Boolean(longLayouts.children.length));
  }
  if (overview) { overview.append(squares, longLayouts); mediaContainer.append(overview); }
  const showcase = isProject && ['packaging', 'kv'].includes(projectType(item)) ? element('div', 'project-showcase') : null;
  const thumbnails = element('div', 'project-thumbnails');
  let featured = null;
  function selectArtwork(entry) {
    if (!showcase) return;
    featured = entry; showcase.replaceChildren(imageButtons.get(entry));
    if (!reduced.matches) showcase.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
    thumbnails.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.src === entry.src)));
  }
  if (showcase) mediaContainer.append(showcase, thumbnails);
  document.querySelector('#dialog-title').textContent = item.title;
  document.querySelector('#dialog-category').textContent = item.category;
  document.querySelector('#dialog-description').textContent = item.description;
  document.querySelector('#dialog-kind').textContent = item.kind ? 'IN MOTION' : isSocial ? 'SOCIAL DESIGN' : 'PROJECT VIEW';
  document.querySelector('#dialog-position').textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(activeItems.length).padStart(2, '0')}`;
  document.querySelector('#previous-item').disabled = activeIndex === 0;
  document.querySelector('#next-item').disabled = activeIndex === activeItems.length - 1;
  item.media.forEach((entry, index) => {
    const figure = element('figure', `gallery-piece ${entry.type}`);
    if (entry.type === 'image') {
      const img = element('img'); img.src = entry.src; img.alt = entry.alt; img.loading = index > 5 ? 'lazy' : 'eager';
      if (isSocial) {
        const thumbnail = element('button', 'social-thumbnail'); thumbnail.type = 'button';
        thumbnail.setAttribute('aria-label', `Enlarge ${entry.alt}`); thumbnail.setAttribute('aria-haspopup', 'dialog');
        thumbnail.append(img, element('span', 'enlarge-mark', '↗'));
        thumbnail.addEventListener('click', () => openImage(item.media, index, thumbnail)); figure.append(thumbnail);
      } else if (isProject) {
        const thumbnail = element('button', 'project-artwork'); thumbnail.type = 'button';
        const caption = entry.alt || `${item.title} — artwork ${imageEntries.indexOf(entry) + 1}`;
        img.alt = caption;
        thumbnail.setAttribute('aria-label', `Enlarge ${caption}`); thumbnail.setAttribute('aria-haspopup', 'dialog');
        thumbnail.append(img, element('span', 'enlarge-mark', '↗'));
        thumbnail.addEventListener('click', () => openImage(imageEntries, imageEntries.indexOf(entry), thumbnail));
        figure.append(thumbnail); imageButtons.set(entry, figure);
        let thumb;
        if (showcase) {
          thumb = element('button', 'artwork-thumb'); thumb.type = 'button'; thumb.dataset.src = entry.src;
          const tiny = element('img'); tiny.src = entry.src; tiny.alt = ''; tiny.loading = 'lazy';
          thumb.append(tiny); thumb.setAttribute('aria-label', caption); thumb.setAttribute('aria-pressed', 'false');
          thumb.addEventListener('click', () => selectArtwork(entry)); thumbnails.append(thumb);
          if (!featured && entry.presentation !== 'long') selectArtwork(entry);
        }
        function classifyImage() {
          if (revision !== renderRevision) return;
          const isLong = entry.presentation === 'long' || (img.naturalHeight > img.naturalWidth * 2.2);
          if (!isLong) return;
          figure.classList.add('long-artwork');
          thumbnail.classList.add('long-artwork-button');
          if (!thumbnail.querySelector('.long-label')) thumbnail.append(element('span', 'long-label', 'View full layout ↗'));
          longLayouts.append(figure); if (!longLayouts.isConnected) mediaContainer.append(longLayouts); updateOverview();
          thumb?.remove();
          if (featured === entry) {
            featured = null;
            const next = imageEntries.find(other => other !== entry && imageButtons.has(other) && !imageButtons.get(other).classList.contains('long-artwork'));
            if (next) selectArtwork(next);
          }
        }
        img.addEventListener('load', classifyImage);
        if (!showcase) { (squares || mediaContainer).append(figure); updateOverview(); }
        if (entry.presentation === 'long' || img.complete) classifyImage();
        return;
      } else figure.append(img);
    } else {
      const player = element('video'); player.src = entry.src; player.controls = true; player.playsInline = true; player.preload = isReel || index === 0 ? 'metadata' : 'none';
      if (index === 0 && isProject) {
        player.muted = true; player.defaultMuted = true; player.loop = true;
        player.autoplay = !reduced.matches; player.dataset.reveal = 'true';
      }
      player.setAttribute('aria-label', `${item.title} — video ${index + 1}`);
      const error = element('p', 'media-error', 'This video couldn’t load. Check your connection and try again.'); error.hidden = true;
      const retry = element('button', 'retry-video', 'Retry video'); retry.type = 'button'; retry.hidden = true;
      player.addEventListener('error', () => { error.hidden = false; retry.hidden = false; setMediaLoading(player, false); });
      retry.addEventListener('click', () => { error.hidden = true; retry.hidden = true; player.load(); setMediaLoading(player, true); });
      player.addEventListener('loadstart', () => setMediaLoading(player, true));
      player.addEventListener('waiting', () => setMediaLoading(player, true));
      ['loadeddata', 'canplay', 'playing', 'pause', 'ended'].forEach(event => player.addEventListener(event, () => setMediaLoading(player, false)));
      player.addEventListener('play', () => mediaContainer.querySelectorAll('video').forEach(other => { if (other !== player) other.pause(); }));
      figure.append(player, logoLoader(), error, retry);
    }
    mediaContainer.append(figure);
  });
  if (longLayouts.children.length && !overview) mediaContainer.append(longLayouts);
  updateOverview();
  document.querySelector('.dialog-scroll').scrollTop = 0;
}

function openItem(items, index, trigger) {
  activeItems = items; activeIndex = index; opener = trigger; savedScroll = window.scrollY;
  renderItem();
  document.body.style.top = `-${savedScroll}px`; document.body.classList.add('dialog-open');
  dialog.showModal(); closeButton.focus({ preventScroll: true });
  syncPreviews(); startReveal();
}
closeButton.addEventListener('click', () => dialog.close());
let pressedBackdrop = false;
dialog.addEventListener('pointerdown', e => { pressedBackdrop = e.target === dialog; });
dialog.addEventListener('click', e => { if (e.target === dialog && pressedBackdrop) dialog.close(); pressedBackdrop = false; });
dialog.addEventListener('close', () => {
  renderRevision++;
  stopMedia(); mediaContainer.replaceChildren();
  document.body.classList.remove('dialog-open'); document.body.style.top = '';
  window.scrollTo({ top: savedScroll, behavior: 'instant' }); opener?.focus({ preventScroll: true });
  syncPreviews();
});
function changeItem(delta) {
  const next = activeIndex + delta;
  if (next < 0 || next >= activeItems.length) return;
  activeIndex = next; renderItem(); closeButton.focus({ preventScroll: true }); startReveal();
}

function startReveal() {
  if (activeItems[activeIndex].kind) {
    const selectedReel = mediaContainer.querySelector('video');
    if (selectedReel) playSafely(selectedReel);
    return;
  }
  const reveal = mediaContainer.querySelector('video[data-reveal]');
  if (reveal && !reduced.matches) playSafely(reveal);
}

const imageZoom = document.querySelector('#image-zoom');
const imageStage = document.querySelector('.image-stage');
function setImageZoom(zoom) {
  imageStage.classList.toggle('reading-width', zoom);
  imageZoom.setAttribute('aria-pressed', String(zoom));
  imageZoom.textContent = zoom ? 'Fit whole image' : 'View at reading width';
  imageStage.scrollTop = 0;
}
imageZoom.addEventListener('click', () => setImageZoom(!imageStage.classList.contains('reading-width')));
function renderImage() {
  const entry = expandedImages[expandedIndex];
  const enlarged = document.querySelector('#enlarged-image');
  setImageZoom(entry.presentation === 'long');
  enlarged.onload = () => { if (enlarged.naturalHeight > enlarged.naturalWidth * 2.2) setImageZoom(true); };
  enlarged.src = entry.src; enlarged.alt = entry.alt || 'Project artwork';
  document.querySelector('#image-title').textContent = entry.alt || 'Project artwork';
  document.querySelector('#image-position').textContent = `${expandedIndex + 1} / ${expandedImages.length}`;
  document.querySelector('#previous-image').disabled = expandedIndex === 0;
  document.querySelector('#next-image').disabled = expandedIndex === expandedImages.length - 1;
}
function openImage(images, index, trigger) {
  expandedImages = images; expandedIndex = index; imageOpener = trigger; renderImage();
  imageDialog.showModal(); document.querySelector('#close-image').focus({ preventScroll: true });
}
function stepImage(delta) {
  const next = expandedIndex + delta;
  if (next < 0 || next >= expandedImages.length) return;
  expandedIndex = next; renderImage();
}
document.querySelector('#close-image').addEventListener('click', () => imageDialog.close());
document.querySelector('#previous-image').addEventListener('click', () => stepImage(-1));
document.querySelector('#next-image').addEventListener('click', () => stepImage(1));
imageDialog.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); stepImage(e.key === 'ArrowLeft' ? -1 : 1); }
});
let imageBackdrop = false;
imageDialog.addEventListener('pointerdown', e => { imageBackdrop = e.target === imageDialog; });
imageDialog.addEventListener('click', e => { if (imageBackdrop && e.target === imageDialog) imageDialog.close(); imageBackdrop = false; });
imageDialog.addEventListener('close', () => { document.querySelector('#enlarged-image').removeAttribute('src'); imageOpener?.focus({ preventScroll: true }); });
document.querySelector('#previous-item').addEventListener('click', () => changeItem(-1));
document.querySelector('#next-item').addEventListener('click', () => changeItem(1));
// Native dialog provides Escape dismissal, focus containment and an inert background.

}
initGallery();
