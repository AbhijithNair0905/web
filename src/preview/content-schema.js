export const groups = ['projects', 'reels', 'animations', 'social', 'logos'];
export const workTypes = { branding: 'Branding', ecommerce: 'E-commerce', packaging: 'Packaging', kv: 'Key visuals' };
export function projectType(item) {
  if (Object.hasOwn(workTypes, item.workType)) return item.workType;
  const category = (item.category || '').toLowerCase();
  if (/e-?com/.test(category)) return 'ecommerce';
  if (/packag/.test(category)) return 'packaging';
  if (/key visual|^kv$/.test(category)) return 'kv';
  return 'branding';
}
export const placeholders = ['orbit', 'ribbon', 'asterisk', 'arcs', 'rings', 'diamond', 'wave', 'squares'];
const imageExtensions = /\.(png|jpe?g|webp|gif|avif)$/i;
const videoExtensions = /\.(mp4|webm)$/i;
const fail = message => { throw new Error(message); };
function text(value, label, max = 240) {
  if (typeof value !== 'string' || value.length > max) fail(`${label}: use text up to ${max} characters.`);
  return value.trim();
}
export function mediaUrl(value, type, label, required = true) {
  const src = text(value ?? '', label, 2000);
  if (!src) { if (required) fail(`${label}: choose a file or add a direct media link.`); return ''; }
  if (/[\x00-\x20\\]/.test(src)) fail(`${label}: the media link contains an invalid character.`);
  let parsed;
  try { parsed = new URL(src, 'https://portfolio.local'); } catch { fail(`${label}: invalid media link.`); }
  if (src.startsWith('/')) {
    if (!/^\/(projects|portfolio-uploads)\//.test(src) || src.includes('..') || /%2e|%2f|%5c/i.test(src)) fail(`${label}: choose a portfolio file.`);
  } else if (parsed.protocol !== 'https:' || parsed.username || parsed.password) fail(`${label}: use an HTTPS link to the file.`);
  if (!(type === 'video' ? videoExtensions : imageExtensions).test(parsed.pathname)) fail(`${label}: use ${type === 'video' ? 'a direct .mp4 or .webm video' : 'a PNG, JPG, WebP, GIF or AVIF image'} link, rather than a Canva or social sharing page.`);
  return src;
}
export function validateContent(input) {
  if (!input || input.version !== 1) fail('This file is not a supported portfolio content backup.');
  const result = { version: 1 };
  for (const group of groups) {
    if (!Array.isArray(input[group]) || input[group].length > 250) fail(`${group}: use a collection of up to 250 items.`);
    const ids = new Set();
    result[group] = input[group].map((item, index) => {
      const label = `${group}, item ${index + 1}`;
      if (!item || typeof item !== 'object') fail(`${label}: invalid item.`);
      if (typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,90}$/.test(item.id) || ids.has(item.id)) fail(`${label}: invalid or duplicate item ID.`);
      ids.add(item.id);
      if (typeof item.enabled !== 'boolean') fail(`${label}: visibility must be on or off.`);
      const clean = { id: item.id, enabled: item.enabled, title: text(item.title, `${label} title`, 160) };
      if (!clean.title) fail(`${label}: add a title.`);
      if (group === 'projects') {
        if (item.workType !== undefined && !Object.hasOwn(workTypes, item.workType)) fail(`${label}: choose a supported work type.`);
        clean.workType = projectType(item);
        clean.category = text(item.category, `${label} category`, 100);
        clean.description = text(item.description, `${label} description`, 4000);
        clean.cover = mediaUrl(item.cover, 'image', `${label} cover`, item.enabled);
        if (!Array.isArray(item.media) || item.media.length > 80 || (item.enabled && !item.media.length)) fail(`${label}: add 1–80 images or videos to the project.`);
        clean.media = item.media.map((entry, i) => {
          if (!entry || !['image', 'video'].includes(entry.type)) fail(`${label}, media ${i + 1}: choose image or video.`);
          if (entry.presentation !== undefined && !['auto', 'long'].includes(entry.presentation)) fail(`${label}: choose automatic or long-layout display.`);
          return { type: entry.type, src: mediaUrl(entry.src, entry.type, `${label}, media ${i + 1}`, item.enabled), ...(entry.type === 'image' ? { alt: text(entry.alt ?? '', `${label} image description`), presentation: entry.presentation || 'auto' } : {}) };
        });
      } else if (group === 'reels' || group === 'animations') {
        clean.description = text(item.description, `${label} description`, 4000);
        clean.src = mediaUrl(item.src, 'video', `${label} video`, item.enabled);
        clean.poster = mediaUrl(item.poster, 'image', `${label} preview image`, false);
      } else if (group === 'social') {
        clean.src = mediaUrl(item.src, 'image', `${label} image`, item.enabled);
        clean.alt = text(item.alt ?? '', `${label} image description`);
      } else {
        clean.src = mediaUrl(item.src, 'image', `${label} logo`, false);
        clean.placeholder = placeholders.includes(item.placeholder) ? item.placeholder : 'orbit';
      }
      return clean;
    });
  }
  return result;
}
