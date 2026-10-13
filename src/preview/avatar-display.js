export const avatarDefaults = Object.freeze({ mode: 'expressions', message: '', speed: 'normal', expression: 'neutral' });
export const avatarModes = { expressions: 'Expressions', message: 'Message only', alternate: 'Alternate both' };
export const avatarExpressions = { neutral: 'Neutral', thinking: 'Thinking', giggling: 'Giggling', blushing: 'Blushing', smiling: 'Smiling' };
export function validateAvatar(value = avatarDefaults) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Avatar: invalid settings.');
  const result = { ...avatarDefaults, ...value };
  if (!Object.hasOwn(avatarModes, result.mode) || !Object.hasOwn(avatarExpressions, result.expression) || !['slow', 'normal'].includes(result.speed)) throw new Error('Avatar: choose a supported mode, expression and speed.');
  if (typeof result.message !== 'string' || result.message.length > 160) throw new Error('Avatar: keep your message to 160 characters.');
  result.message = result.message.replace(/[\x00-\x1f\x7f]/g, ' ').trim();
  if (result.mode !== 'expressions' && !result.message) throw new Error('Avatar: add a message, or choose Expressions.');
  return { mode: result.mode, message: result.message, speed: result.speed, expression: result.expression };
}

// This display is shared by the 3D screen and studio preview. No graphics library is needed here.
export function createFaceDisplay() {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 384;
  const ctx = canvas.getContext('2d');
  const mask = document.createElement('canvas'); mask.width = 80; mask.height = 48;
  const ink = mask.getContext('2d', { willReadFrequently: true });
  let cachedMessage = '', messageWidth = 0;
  function metrics(message) {
    if (message !== cachedMessage) { cachedMessage = message; ink.font = 'bold 16px monospace'; messageWidth = ink.measureText(message).width; }
    return messageWidth;
  }
  function state(settings, time, override) {
    const speed = settings.speed === 'slow' ? 12 : 20;
    const duration = (metrics(settings.message) + 80) / speed + 1;
    const phase = time % (8 + duration);
    const message = Boolean(settings.message) && (settings.mode === 'message' || (settings.mode === 'alternate' && !override && phase >= 8));
    return { message, phase: settings.mode === 'message' ? time % duration : Math.max(0, phase - 8), speed, expression: override || settings.expression };
  }
  function draw(settings, time = 0, gaze = { x: 0, y: 0 }, override = '', still = false) {
    const display = state(settings, time, override);
    ink.clearRect(0, 0, 80, 48); ink.fillStyle = '#fff'; ink.strokeStyle = '#fff'; ink.lineWidth = 1;
    const line = (points) => { ink.beginPath(); points.forEach(([x,y],i) => i ? ink.lineTo(x+.5,y+.5) : ink.moveTo(x+.5,y+.5)); ink.stroke(); };
    if (display.message) {
      ink.font = 'bold 16px monospace'; ink.textBaseline = 'middle';
      const x = still ? 3 : 76 - Math.max(0, display.phase - .4) * display.speed;
      ink.fillText(settings.message, Math.round(x), 24);
    } else {
      const expression = display.expression;
      const blink = !still && time % 5.7 > 5.53;
      const gx = Math.round(gaze.x * 3), gy = Math.round(gaze.y * 2);
      for (const [index, x] of [16, 49].entries()) {
        const y = 20 + gy;
        if (blink) ink.fillRect(x, y+3, 15, 1);
        else if (expression === 'giggling') line([[x,y+4],[x+3,y+1],[x+10,y+1],[x+14,y+4]]);
        else {
          const height = expression === 'surprised' ? 11 : expression === 'thinking' && index === 1 ? 5 : 7;
          ink.fillRect(x, y, 15, height);
          ink.clearRect(x+7+gx, y+1, 5, height-2);
        }
        const brow = expression === 'thinking' && index === 1 ? -3 : 0;
        ink.fillRect(x, 14+gy+brow, 14, 1);
      }
      if (expression === 'thinking') { ink.fillRect(36,33,7,1); for(let i=0;i<3;i++) if (still || (Math.floor(time*2)%4)>i) ink.fillRect(65+i*4,34,2,2); }
      else if (expression === 'giggling') line([[34,31],[37,34],[42,34],[45,31]]);
      else if (expression === 'surprised') { ink.strokeRect(38.5,31.5,4,5); }
      else if (expression === 'smiling') line([[33,30],[35,33],[40,35],[45,33],[47,30]]);
      else line([[35,32],[40,33],[44,32],[46,30]]);
    }
    const pixels = ink.getImageData(0,0,80,48).data;
    ctx.fillStyle = '#090c0d'; ctx.fillRect(0,0,640,384);
    for(let y=0;y<48;y++) for(let x=0;x<80;x++) {
      const on = pixels[(y*80+x)*4+3] > 85;
      const cheek = !display.message && display.expression === 'blushing' && y>=29 && y<=31 && [12,14,65,67].includes(x);
      ctx.fillStyle = cheek ? '#fa713c' : on ? '#ffe9c5' : '#151818';
      ctx.beginPath(); ctx.arc(x*8+4,y*8+4,on || cheek ? 2.65 : 1.2,0,Math.PI*2); ctx.fill();
    }
    const reflection = ctx.createLinearGradient(0,0,640,384); reflection.addColorStop(0,'#ffffff0d'); reflection.addColorStop(.5,'#ffffff00');
    ctx.fillStyle = reflection; ctx.fillRect(0,0,640,384);
    return display;
  }
  return { canvas, draw, state };
}
