// Independent of the 3D bundle, so slow downloads can show a lightweight indicator.
(() => {
  const loader = document.querySelector('#page-loader');
  if (!loader) return;
  let finished = false;
  const reveal = window.setTimeout(() => { if (!finished) loader.hidden = false; }, 200);
  const finish = () => {
    finished = true;
    window.clearTimeout(reveal); window.clearTimeout(deadline);
    loader.hidden = true;
    window.removeEventListener('portfolio:hero-ready', finish);
    window.removeEventListener('load', finish);
    window.removeEventListener('pageshow', finish);
  };
  // The page stays usable if a module or asset fails. No artificial minimum wait.
  const deadline = window.setTimeout(finish, 8000);
  window.addEventListener('portfolio:hero-ready', finish, { once: true });
  window.addEventListener('load', finish, { once: true });
  window.addEventListener('pageshow', finish, { once: true });
  if (document.readyState === 'complete') finish();
})();
