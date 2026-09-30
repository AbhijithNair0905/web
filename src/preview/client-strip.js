import { loadContent } from './content-store.js';
async function initClients() {
const track = document.querySelector('.client-track');
const content = await loadContent();
const keys = ['orbit', 'ribbon', 'asterisk', 'arcs', 'rings', 'diamond', 'wave', 'squares'];
const templates = new Map([...track.firstElementChild.children].map((node, i) => [keys[i], node.cloneNode(true)]));
const logos = content.logos.filter(item => item.enabled);
track.style.setProperty('--logo-count', String(logos.length));
const set = track.firstElementChild;
set.replaceChildren();
logos.forEach(item => {
  const mark = templates.get(item.placeholder).cloneNode(true);
  mark.setAttribute('aria-label', item.title);
  if (item.src) {
    const img = document.createElement('img'); img.src = item.src; img.alt = ''; img.loading = 'lazy';
    mark.replaceChildren(img);
  }
  set.append(mark);
});
document.querySelector('.client-strip').hidden = !logos.length;
document.querySelector('.client-strip-label span').textContent = logos.some(item => item.src) ? 'Brands & collaborators' : 'Logo placeholders';
const duplicate = track.firstElementChild.cloneNode(true);
duplicate.setAttribute('aria-hidden', 'true');
duplicate.inert = true;
track.append(duplicate);
const strip = document.querySelector('.client-strip');
const observer = new IntersectionObserver(([entry]) => {
  strip.classList.toggle('strip-offscreen', !entry.isIntersecting);
});
observer.observe(strip);
const syncVisibility = () => strip.classList.toggle('strip-hidden-tab', document.hidden);
document.addEventListener('visibilitychange', syncVisibility);
syncVisibility();
if (import.meta.hot) import.meta.hot.dispose(() => {
  observer.disconnect(); duplicate.remove(); document.removeEventListener('visibilitychange', syncVisibility);
});

}
initClients();
