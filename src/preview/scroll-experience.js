import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
// An explicit local demo link lets the owner review the requested animation
// without changing Windows settings or visitors' accessibility preferences.
const previewMotion = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('previewMotion') === 'on';
const lenis = new Lenis({
  autoRaf: true, smoothWheel: true, lerp: .065, syncTouch: false,
  anchors: { offset: -25 }, respectReducedMotion: !previewMotion,
  // Keep vertical wheel easing over project tiles. Horizontal swipes and the
  // carousel buttons still use the rail's native horizontal scrolling.
  prevent: node => Boolean(node.closest?.('dialog, textarea'))
});
let locked = false;
function syncScrollLock() {
  const next = document.body.classList.contains('dialog-open');
  if (next === locked) return;
  locked = next;
  if (locked) lenis.stop();
  else { lenis.start(); lenis.resize(); lenis.scrollTo(window.scrollY, { immediate: true, force: true }); }
}
const lockObserver = new MutationObserver(syncScrollLock);
lockObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
const records = new Map();
const targets = '.client-strip-label, .selected-work .section-heading, .project, .reels-section .section-heading, .section-intro, .motion-tabs, .motion-grid .reel-card, .social-section .section-heading, .social-preview-grid .social-thumbnail, .collection-footer, .contact-copy, .contact-form';
const motionEnabled = () => (previewMotion || !reduced.matches) && document.documentElement.dataset.heroMotion !== 'paused';
function syncMotion() {
  lenis.options.smoothWheel = motionEnabled();
  if (!motionEnabled()) {
    lenis.scrollTo(window.scrollY, { immediate: true, force: true });
    for (const record of records.values()) { record.animation?.cancel(); record.animation = null; }
  }
}
const revealObserver = new IntersectionObserver(entries => {
  for (const { target, isIntersecting, intersectionRatio } of entries) {
    const record = records.get(target);
    if (!record) continue;
    // Re-arm only after leaving view, not whenever a threshold is crossed.
    // This also reveals a collection again when its tab is reopened.
    if (!isIntersecting || target.closest('[hidden]')) { record.revealed = false; continue; }
    if (intersectionRatio < .12 || record.revealed) continue;
    record.revealed = true;
    if (!motionEnabled()) continue;
    const siblings = [...target.parentElement.children];
    const delay = target.matches('.project,.reel-card,.social-thumbnail') ? (siblings.indexOf(target) % 4) * 75 : 0;
    const from = target.matches('.project') ? 'translate3d(30px,18px,0)' : 'translate3d(0,40px,0)';
    record.animation?.cancel();
    const animation = target.animate?.([{ opacity: 0, transform: from }, { opacity: 1, transform: 'translate3d(0,0,0)' }], { duration: 1000, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    record.animation = animation;
    animation?.finished.then(() => { if (record.animation === animation) record.animation = null; }, () => {});
  }
}, { threshold: [0, .12], rootMargin: '0px 0px -32px 0px' });
function scan() {
  for (const [target, record] of records) {
    if (!target.isConnected) { record.animation?.cancel(); revealObserver.unobserve(target); records.delete(target); }
  }
  document.querySelectorAll(targets).forEach(target => { if (!records.has(target)) { records.set(target, { revealed: false, animation: null }); revealObserver.observe(target); } });
  lenis.resize();
}
const contentObserver = new MutationObserver(scan);
contentObserver.observe(document.querySelector('main'), { childList: true, subtree: true });
const motionObserver = new MutationObserver(syncMotion);
motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-hero-motion'] });
reduced.addEventListener('change', syncMotion);
syncMotion();
scan();
if (import.meta.hot) import.meta.hot.dispose(() => { lenis.destroy(); lockObserver.disconnect(); contentObserver.disconnect(); motionObserver.disconnect(); revealObserver.disconnect(); reduced.removeEventListener('change', syncMotion); for (const record of records.values()) record.animation?.cancel(); });
