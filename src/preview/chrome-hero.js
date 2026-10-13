import * as THREE from 'three';
import { createDevice } from './avatar-device.js';
import { avatarDefaults, avatarExpressions, createFaceDisplay } from './avatar-display.js';
import { loadContent } from './content-store.js';

const host = document.querySelector('#sculpture');
const toggle = document.querySelector('#motion-toggle');
const status = document.querySelector('#render-status');
const caption = document.querySelector('#avatar-message');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 600px)');
const face = createFaceDisplay();
let settings = {...avatarDefaults}, paused = reduced.matches, destroyed = false, cleanup = () => {}, wake = () => {}, changeExpression = () => {};
let fallback = true;
const fallbackScreen = document.querySelector('.device-fallback-screen'); fallbackScreen.append(face.canvas);
const expressionControls = document.querySelector('.avatar-actions');
for(const [name,label] of Object.entries(avatarExpressions).filter(([name])=>name!=='neutral')) {
  const button = document.createElement('button'); button.type='button';button.textContent=label;button.dataset.expression=name;
  button.addEventListener('click',()=>changeExpression(name));expressionControls.append(button);
}
function syncSettings() {
  const hasMessage=settings.mode!=='expressions' && Boolean(settings.message);
  caption.textContent=hasMessage?settings.message:'';
  caption.hidden=!hasMessage;
  caption.classList.toggle('sr-only',!fallback && !paused);
  expressionControls.querySelectorAll('button').forEach(b=>{b.disabled=settings.mode==='message';});
  host.setAttribute('aria-label',hasMessage ? `Design companion. ${settings.message}` : 'Floating design companion. Tap its buttons, or use the expression controls below.');
  face.draw(settings,0,{x:0,y:0},'',true);
  wake();
}
function updateButton() {
  document.documentElement.dataset.heroMotion=paused?'paused':'playing';
  toggle.setAttribute('aria-pressed',String(paused));toggle.textContent=paused?'Resume motion ▷':'Pause motion Ⅱ';
  syncSettings();
}
function ready() {window.dispatchEvent(new Event('portfolio:hero-ready'));}
loadContent().then(content=>{if(!destroyed){settings=content.avatar || {...avatarDefaults};syncSettings();}});
updateButton();

try {
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setClearColor(0x080808,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  host.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
  cleanup=()=>{renderer.dispose();renderer.domElement.remove();};
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,30);camera.position.set(0,0,7.2);
  const studio=new THREE.Scene();studio.background=new THREE.Color('#28282b');
  for(const [color,intensity,position,size] of [['#ffffff',4,[-3,3,3],[3,5]],['#f4f2e9',3,[3,1,2],[1.3,6]],['#ffffff',3,[0,-4,-1],[5,1.5]],['#809ccc',1.2,[-3,0,-3],[.45,5]]]) {
    const box=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));box.position.set(...position);box.lookAt(0,0,0);studio.add(box);
  }
  const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.04);scene.environment=environment.texture;
  studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#fff3de','#242834',1.8));
  const light=new THREE.DirectionalLight('#ffffff',2.8);light.position.set(-3,4,5);scene.add(light);
  const device=createDevice(face.canvas);scene.add(device.group);
  cleanup=()=>{device.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove();};device.group.rotation.set(.10,-.29,.09);
  const gaze={x:0,y:0},target={x:0,y:0},ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  let request=0,last=0,elapsed=0,lastPaint=-1,visible=true,lost=false,override='',expires=0,lastPointer=-10,pointerDown=null,pressed=null,bounce=0,first=true,force=true;
  const removers=[];
  const listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);removers.push(()=>node.removeEventListener(event,fn,options));};
  function stop(){cancelAnimationFrame(request);request=0;}
  function render(now) {
    request=0;
    if(lost || !visible || document.hidden)return;
    const dt=Math.min((now-last)/1000||.033,.06);
    if(!force && dt<1/30-.002){request=requestAnimationFrame(render);return;}
    last=now;force=false;
    if(!paused)elapsed+=dt;
    if(override && !paused && elapsed>expires){override='';host.dataset.expression=settings.expression;}
    const still=paused;
    if(!still) {
      const idle=elapsed-lastPointer>3;
      const tx=idle?Math.sin(elapsed*.38)*.33:target.x,ty=idle?Math.sin(elapsed*.3)*.12:target.y;
      gaze.x=THREE.MathUtils.lerp(gaze.x,tx,Math.min(1,dt*7));gaze.y=THREE.MathUtils.lerp(gaze.y,ty,Math.min(1,dt*7));
      device.group.rotation.x=THREE.MathUtils.lerp(device.group.rotation.x,.1+gaze.y*.08,dt*5);
      device.group.rotation.y=THREE.MathUtils.lerp(device.group.rotation.y,-.29+gaze.x*.14,dt*5);
      device.group.rotation.z=.07+Math.sin(elapsed*.55)*.018 + (override==='giggling'?Math.sin(elapsed*16)*.008:0);
      device.group.position.y=Math.sin(elapsed*.85)*.055 + (bounce>elapsed ? Math.sin((bounce-elapsed)*15)*.045 : 0);
    }
    if(elapsed-lastPaint>=1/24 || still || lastPaint<0) {
      const display=face.draw(settings,elapsed,gaze,override,still);lastPaint=elapsed;device.screenTexture.needsUpdate=true;
      host.dataset.display=display.message?'message':'expression';
    }
    for(const button of device.buttons)button.root.position.z=button.rest+(button.name===pressed && elapsed<bounce?-.025:0);
    renderer.render(scene,camera);
    if(first){first=false;ready();}
    if(!paused)request=requestAnimationFrame(render);
  }
  wake=(immediate=true)=>{if(immediate){force=true;lastPaint=-1;}if(!request && visible && !document.hidden && !lost){last=performance.now();request=requestAnimationFrame(render);}};
  function choose(name) {
    if(settings.mode==='message')return;
    override=name;expires=elapsed+4;pressed=name;bounce=elapsed+.55;
    host.dataset.expression=name;status.textContent=`${avatarExpressions[name]||'Surprised'} expression`;
    wake();
  }
  changeExpression=choose;
  function resize(){
    const {width,height}=host.getBoundingClientRect();if(!width || !height)return;
    renderer.setPixelRatio(Math.min(devicePixelRatio,mobile.matches?1.25:1.5));renderer.setSize(width,height);
    camera.aspect=width/height;camera.updateProjectionMatrix();
    device.group.scale.setScalar(Math.min(1, camera.aspect*1.48));wake();
  }
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  const visibility=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)wake();else stop();});visibility.observe(host);
  function look(e){const rect=host.getBoundingClientRect();target.x=THREE.MathUtils.clamp((e.clientX-rect.left)/rect.width*2-1,-1,1);target.y=THREE.MathUtils.clamp((e.clientY-rect.top)/rect.height*2-1,-1,1);lastPointer=elapsed;if(!paused)wake(false);}
  listen(document.querySelector('.hero'),'pointermove',e=>{if(e.pointerType==='mouse')look(e);},{passive:true});
  listen(host,'pointerdown',e=>{if(e.button===0){pointerDown={x:e.clientX,y:e.clientY};look(e);}},{passive:true});
  listen(host,'pointercancel',()=>{pointerDown=null;});
  listen(host,'pointerup',e=>{
    if(!pointerDown)return;const distance=Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y);pointerDown=null;if(distance>9)return;
    const rect=host.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
    ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(device.group.children,true)[0];
    if(hit)choose(hit.object.userData.expression||'surprised');
  });
  listen(host,'keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose('surprised');}});
  listen(document,'visibilitychange',()=>{if(document.hidden)stop();else wake();});
  listen(toggle,'click',()=>{paused=!paused;updateButton();wake();});
  listen(reduced,'change',()=>{paused=reduced.matches;updateButton();wake();});
  function showFallback(){
    lost=true;stop();fallback=true;host.classList.remove('webgl-ready');renderer.domElement.hidden=true;
    toggle.hidden=true;document.querySelector('.interaction-hint').textContent='Static companion · try an expression';status.textContent='Static companion shown to keep the page responsive.';
    changeExpression=name=>{if(settings.mode!=='message'){face.draw(settings,0,{x:0,y:0},name,true);status.textContent=`${avatarExpressions[name]||name} expression`;}};
    syncSettings();ready();
  }
  listen(renderer.domElement,'webglcontextlost',event=>{event.preventDefault();showFallback();});
  host.classList.add('webgl-ready');fallback=false;syncSettings();resize();
  cleanup=()=>{stop();resizeObserver.disconnect();visibility.disconnect();removers.forEach(fn=>fn());device.dispose();environment.dispose();renderer.dispose();renderer.domElement.remove();};
} catch(error) {
  cleanup();
  console.warn('Using static design companion:',error.message);
  document.querySelector('.interaction-hint').textContent='Static companion · try an expression';
  toggle.hidden=true;fallback=true;host.classList.remove('webgl-ready');host.querySelectorAll('canvas:not(.device-fallback-screen canvas)').forEach(c=>c.remove());
  changeExpression=name=>{if(settings.mode!=='message'){face.draw(settings,0,{x:0,y:0},name,true);status.textContent=`${avatarExpressions[name]} expression`;}};
  syncSettings();ready();
}
if(import.meta.hot)import.meta.hot.dispose(()=>{destroyed=true;cleanup();});
