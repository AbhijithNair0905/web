import * as THREE from 'three';

function outline(width, height, radius) {
  const x=-width/2,y=-height/2,s=new THREE.Shape();
  s.moveTo(x+radius,y); s.lineTo(x+width-radius,y); s.quadraticCurveTo(x+width,y,x+width,y+radius);
  s.lineTo(x+width,y+height-radius); s.quadraticCurveTo(x+width,y+height,x+width-radius,y+height);
  s.lineTo(x+radius,y+height); s.quadraticCurveTo(x,y+height,x,y+height-radius);
  s.lineTo(x,y+radius); s.quadraticCurveTo(x,y,x+radius,y); return s;
}
export function createDevice(screenCanvas) {
  const group = new THREE.Group(), resources = new Set(), buttons = [];
  const keep = item => { resources.add(item); return item; };
  const metal = keep(new THREE.MeshStandardMaterial({ color:'#d6d3cc', metalness:.72, roughness:.32 }));
  const edge = keep(new THREE.MeshStandardMaterial({ color:'#ded9cd', metalness:1, roughness:.16 }));
  const dark = keep(new THREE.MeshStandardMaterial({ color:'#242627', metalness:.65, roughness:.34 }));
  const rubber = keep(new THREE.MeshStandardMaterial({ color:'#292b2c', metalness:.22, roughness:.4 }));
  const orange = keep(new THREE.MeshStandardMaterial({ color:'#e14a19', metalness:.25, roughness:.3 }));
  const black = keep(new THREE.MeshBasicMaterial({ color:'#090b0c' }));
  // Subtle procedural grain; no large texture or model download.
  const grain = document.createElement('canvas'); grain.width=256; grain.height=256;
  const ctx=grain.getContext('2d'), data=ctx.createImageData(256,256);
  let seed=83; for(let i=0;i<data.data.length;i+=4) { seed=(seed*16807)%2147483647; const v=110+seed%40; data.data[i]=data.data[i+1]=data.data[i+2]=v; data.data[i+3]=255; }
  ctx.putImageData(data,0,0); const bump=keep(new THREE.CanvasTexture(grain)); bump.wrapS=bump.wrapT=THREE.RepeatWrapping; bump.repeat.set(2,3);
  metal.bumpMap=bump; metal.bumpScale=.006;
  function slab(w,h,d,r,mat,x=0,y=0,z=0,parent=group) {
    const geometry=keep(new THREE.ExtrudeGeometry(outline(w-.04,h-.04,r),{depth:d,bevelEnabled:true,bevelSize:.02,bevelThickness:.02,bevelSegments:2,steps:1,curveSegments:6}));
    const mesh=new THREE.Mesh(geometry,mat); mesh.position.set(x,y,z); parent.add(mesh); return mesh;
  }
  slab(2.22,3.36,.24,.23,dark,0,0,-.19);
  slab(2.23,3.36,.035,.23,edge,0,0,.045);
  const body=slab(2.16,3.29,.075,.21,metal,0,0,.09);
  slab(1.96,1.58,.035,.17,edge,0,.65,.176);
  slab(1.90,1.52,.025,.14,black,0,.65,.216);
  const screenTexture=keep(new THREE.CanvasTexture(screenCanvas)); screenTexture.colorSpace=THREE.SRGBColorSpace;
  screenTexture.generateMipmaps=false; screenTexture.minFilter=THREE.LinearFilter;
  const screenMaterial=keep(new THREE.MeshBasicMaterial({map:screenTexture,toneMapped:false}));
  const screen=new THREE.Mesh(keep(new THREE.ShapeGeometry(outline(1.81,1.37,.115),12)),screenMaterial); const uv=screen.geometry.attributes.uv, pos=screen.geometry.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+.905)/1.81,(pos.getY(i)+.685)/1.37);
  screen.position.set(0,.65,.267); group.add(screen);
  slab(1.38,1.39,.025,.16,edge,-.25,-.90,.182);
  slab(1.32,1.33,.02,.14,black,-.25,-.90,.215);
  function icon(kind) {
    const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
    g.strokeStyle=kind==='giggling'?'#ffd7b8':'#c4c4b9'; g.fillStyle=g.strokeStyle; g.lineWidth=4; g.lineCap='round';
    g.beginPath();
    if(kind==='thinking') {
      g.arc(57,54,15,Math.PI,Math.PI*1.9); g.arc(73,62,14,Math.PI*1.6,Math.PI*.65); g.lineTo(44,73); g.quadraticCurveTo(25,60,42,51); g.stroke();
      for(let i=0;i<3;i++) {g.beginPath();g.arc(40+i*14,88,2.5,0,7);g.fill();}
    } else {
      g.moveTo(33,45);g.lineTo(49,45);g.moveTo(79,45);g.lineTo(95,45);
      if(kind==='giggling') {g.moveTo(34,58);g.lineTo(41,54);g.lineTo(48,58);g.moveTo(80,58);g.lineTo(87,54);g.lineTo(94,58);}
      else {g.moveTo(33,59);g.lineTo(49,59);g.moveTo(79,59);g.lineTo(95,59);}
      g.moveTo(54,79);g.quadraticCurveTo(65,89,77,77);g.stroke();
      if(kind==='blushing') {g.strokeStyle='#fa713c';g.beginPath();g.moveTo(32,73);g.lineTo(28,80);g.moveTo(42,73);g.lineTo(38,80);g.moveTo(91,73);g.lineTo(87,80);g.stroke();}
    }
    const texture=keep(new THREE.CanvasTexture(c));texture.colorSpace=THREE.SRGBColorSpace;
    return keep(new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));
  }
  ['thinking','giggling','blushing','smiling'].forEach((name,i)=>{
    const root=new THREE.Group();root.position.set(i%2?.075:-.575,i<2?-.57:-1.23,.251);group.add(root);
    const mesh=slab(.60,.59,.065,.11,i===1?orange:rubber,0,0,0,root);mesh.userData.expression=name;
    const label=new THREE.Mesh(keep(new THREE.PlaneGeometry(.52,.52)),icon(name));label.position.z=.089;label.userData.expression=name;root.add(label);
    buttons.push({name,mesh,root,rest:.251});
  });
  const holes=new THREE.InstancedMesh(keep(new THREE.CircleGeometry(.025,10)),black,24), matrix=new THREE.Matrix4();
  for(let i=0;i<24;i++) {matrix.makeTranslation(.59+(i%4)*.088,-.61-Math.floor(i/4)*.087,.195);holes.setMatrixAt(i,matrix);}group.add(holes);
  const screwGeometry=keep(new THREE.CircleGeometry(.045,16));
  for(const [x,y] of [[-.92,1.47],[.92,1.47],[-.92,-1.46],[.92,-1.46]]) {
    const screw=new THREE.Mesh(screwGeometry,edge);screw.position.set(x,y,.196);group.add(screw);
    slab(.05,.009,.001,.002,dark,x,y,.199);
  }
  const labelCanvas=document.createElement('canvas'); labelCanvas.width=256;labelCanvas.height=128;const l=labelCanvas.getContext('2d');
  l.fillStyle='#414440';l.font='32px monospace';l.fillText('AN',20,51);l.font='10px monospace';l.fillText('DESIGN COMPANION',20,78);
  const labelTexture=keep(new THREE.CanvasTexture(labelCanvas));labelTexture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(keep(new THREE.PlaneGeometry(.5,.25)),keep(new THREE.MeshBasicMaterial({map:labelTexture,transparent:true,depthWrite:false})));label.position.set(.68,-1.37,.195);group.add(label);
  // Side controls and seams remain visible in the resting three-quarter view.
  slab(.055,.42,.09,.015,rubber,-1.112,.6,-.06);
  slab(.055,.62,.09,.015,rubber,-1.112,-.43,-.06);
  return {group,body,buttons,screenTexture,dispose:()=>resources.forEach(r=>r.dispose())};
}
