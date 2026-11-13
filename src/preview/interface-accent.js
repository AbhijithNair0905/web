import './interface-accent.css';

// A single decorative plane. Pointer updates are direct, with no trailing loop.
const glow = document.createElement('div');
glow.className = 'cursor-glow';
glow.setAttribute('aria-hidden', 'true');
document.body.prepend(glow);
const pointer = matchMedia('(hover: hover) and (pointer: fine)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const events = new AbortController();
const options = { passive: true, signal: events.signal };
const hide = () => glow.removeAttribute('data-visible');
const enabled = () => pointer.matches && !reduced.matches && !document.hidden &&
  !document.body.classList.contains('dialog-open') &&
  document.documentElement.dataset.heroMotion !== 'paused';
window.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || !enabled()) { hide(); return; }
  glow.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
  glow.setAttribute('data-visible', '');
}, options);
document.documentElement.addEventListener('pointerleave', hide, options);
window.addEventListener('blur', hide, options);
document.addEventListener('visibilitychange', hide, options);
pointer.addEventListener('change', hide, options);
reduced.addEventListener('change', hide, options);
const observer = new MutationObserver(() => { if (!enabled()) hide(); });
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-hero-motion'] });
observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
if (import.meta.hot) import.meta.hot.dispose(() => {
  events.abort(); observer.disconnect(); glow.remove();
});
