import * as THREE from 'three';

const host = document.querySelector('#sculpture');
const toggle = document.querySelector('#motion-toggle');
const status = document.querySelector('#render-status');
let paused = false;
let cleanup = () => {};

function updateButton() {
  document.documentElement.dataset.heroMotion = paused ? 'paused' : 'playing';
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.innerHTML = paused ? 'Resume motion <span aria-hidden="true">▷</span>' : 'Pause motion <span aria-hidden="true">Ⅱ</span>';
}
updateButton();

// A broad, elliptical ribbon sweeps along a closed trefoil curve.
// The moving frame gives the metal a sculptural fold, without a downloaded model.
class RibbonPath extends THREE.Curve {
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2;
    return target.set((1.05 + .32 * Math.cos(3 * a)) * Math.cos(2 * a),
      (1.05 + .32 * Math.cos(3 * a)) * Math.sin(2 * a), .48 * Math.sin(3 * a));
  }
}

function ribbonGeometry() {
  const path = new RibbonPath();
  const steps = 360, sides = 16;
  const frames = path.computeFrenetFrames(steps, true);
  const positions = [], indices = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, point = path.getPointAt(t);
    const twist = Math.sin(t * Math.PI * 6) * .68 + .3;
    const normal = frames.normals[i].clone().applyAxisAngle(frames.tangents[i], twist);
    const binormal = new THREE.Vector3().crossVectors(frames.tangents[i], normal);
    const width = .28 + .13 * (Math.sin(t * Math.PI * 6 + .8) * .5 + .5);
    for (let j = 0; j <= sides; j++) {
      const angle = j / sides * Math.PI * 2;
      const v = point.clone().addScaledVector(normal, Math.cos(angle) * width)
        .addScaledVector(binormal, Math.sin(angle) * .034);
      positions.push(v.x, v.y, v.z);
      if (i < steps && j < sides) {
        const k = i * (sides + 1) + j;
        indices.push(k, k + 1, k + sides + 1, k + 1, k + sides + 2, k + sides + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x080808, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
  camera.position.set(0, 0, 6.1);

  // Locally generated studio reflections: broad white softboxes and tiny cool/warm strips.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color('#121216');
  function softbox(color, intensity, position, scale) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...scale), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    mesh.position.set(...position); mesh.lookAt(0, 0, 0); studio.add(mesh);
  }
  softbox('#ffffff', 5, [-3, 3, 3], [3, 5]);
  softbox('#f4f2e9', 3.5, [3, 1, 2], [1.3, 6]);
  softbox('#ffffff', 4, [0, -4, -1], [5, 1.5]);
  softbox('#809ccc', 2, [-3, 0, -3], [.45, 5]);
  softbox('#ddbb88', 1.5, [4, -2, -2], [.3, 4]);
  softbox('#ffffff', 2, [0, 4, -3], [5, 1]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .035);
  scene.environment = environment.texture;
  studio.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  pmrem.dispose();
  const material = new THREE.MeshPhysicalMaterial({ color: '#c9cbd1', metalness: 1, roughness: .19, envMapIntensity: 1.2, clearcoat: 1, clearcoatRoughness: .16, iridescence: .28, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 360] });
  const ribbon = new THREE.Mesh(ribbonGeometry(), material);
  const group = new THREE.Group(); group.add(ribbon); scene.add(group);
  ribbon.rotation.set(.18, -.25, -.38);
  const pointer = new THREE.Vector2();
  const drag = new THREE.Vector2();
  let scroll = 0, idle = 0, lastTime = 0, request = 0, visible = true;
  let dragging = false, lastX = 0, lastY = 0, firstFrame = true;
  const listen = (target, event, handler, options) => {
    target.addEventListener(event, handler, options);
    removers.push(() => target.removeEventListener(event, handler, options));
  };
  const removers = [];
  function render(time = 0) {
    request = 0;
    const dt = Math.min((time - lastTime) / 1000 || .016, .05); lastTime = time;
    const moving = !paused;
    if (moving) idle += dt;
    const damping = 1 - Math.exp(-dt * 5);
    const targetX = drag.y + (moving ? pointer.y * .16 + Math.sin(idle * .3) * .07 : 0);
    const targetY = drag.x + (moving ? pointer.x * .26 + idle * .075 + scroll * .5 : 0);
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, targetX, damping);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetY, damping);
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, moving ? Math.sin(idle * .22) * .06 : 0, damping);
    group.position.y = moving ? Math.sin(idle * .65) * .035 + scroll * .28 : 0;
    renderer.render(scene, camera);
    if (firstFrame) { firstFrame = false; window.dispatchEvent(new Event('portfolio:hero-ready')); }
    if (visible && !document.hidden && (moving || Math.abs(group.rotation.x - targetX) + Math.abs(group.rotation.y - targetY) > .001)) request = requestAnimationFrame(render);
  }
  function wake() { if (!request && visible && !document.hidden) { lastTime = performance.now(); request = requestAnimationFrame(render); } }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
    group.scale.setScalar(width < 450 ? .9 : 1);
    wake();
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); else { cancelAnimationFrame(request); request = 0; } });
  visibility.observe(host);
  listen(document.querySelector('.hero'), 'pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const rect = host.getBoundingClientRect();
    pointer.set(THREE.MathUtils.clamp((e.clientX - rect.left) / rect.width * 2 - 1, -1, 1), THREE.MathUtils.clamp((e.clientY - rect.top) / rect.height * 2 - 1, -1, 1)); wake();
  });
  listen(document.querySelector('.hero'), 'pointerleave', () => { pointer.set(0, 0); wake(); });
  listen(host, 'pointerdown', e => { if (e.button !== 0) return; dragging = true; lastX = e.clientX; lastY = e.clientY; host.setPointerCapture(e.pointerId); });
  listen(host, 'pointermove', e => { if (!dragging) return; drag.x += (e.clientX - lastX) * .007; drag.y += (e.clientY - lastY) * .007; lastX = e.clientX; lastY = e.clientY; wake(); });
  const endDrag = () => { dragging = false; };
  listen(host, 'pointerup', endDrag); listen(host, 'pointercancel', endDrag); listen(host, 'lostpointercapture', endDrag);
  listen(host, 'keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'Home') { drag.set(0, 0); idle = 0; }
    else { drag.x += e.key === 'ArrowLeft' ? -.15 : e.key === 'ArrowRight' ? .15 : 0; drag.y += e.key === 'ArrowUp' ? -.15 : e.key === 'ArrowDown' ? .15 : 0; }
    wake();
  });
  listen(window, 'scroll', () => { scroll = Math.min(window.scrollY / window.innerHeight, 1); wake(); }, { passive: true });
  listen(document, 'visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(request); request = 0; } else wake(); });
  listen(toggle, 'click', () => { paused = !paused; updateButton(); wake(); });
  listen(renderer.domElement, 'webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(request); request = 0; host.classList.remove('webgl-ready'); renderer.domElement.style.display = 'none'; status.textContent = 'Static sculpture shown. Reload to restore the interactive view.'; });
  host.classList.add('webgl-ready');
  resize();
  cleanup = () => { cancelAnimationFrame(request); observer.disconnect(); visibility.disconnect(); removers.forEach(fn => fn()); ribbon.geometry.dispose(); material.dispose(); environment.dispose(); renderer.dispose(); renderer.domElement.remove(); };
} catch (error) {
  console.warn('Chrome study: static fallback', error);
  toggle.hidden = true;
  document.querySelector('.interaction-hint').textContent = 'Chrome / form study';
  status.textContent = 'A static sculpture is shown because interactive graphics are unavailable.';
  window.dispatchEvent(new Event('portfolio:hero-ready'));
}

if (import.meta.hot) import.meta.hot.dispose(() => cleanup());
