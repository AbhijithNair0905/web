import { groups, validateContent } from '../src/preview/content-schema.js';

export function publishedContent(input) {
  const content = validateContent(input);
  for (const group of groups) content[group] = content[group].filter(item => item.enabled);
  return content;
}

export function publishedFiles(content) {
  const files = new Set(['/abhijith-logo.png', '/preview-loading.js']);
  const add = src => { if (src?.startsWith('/')) files.add(src); };
  for (const item of content.projects) { add(item.cover); item.media.forEach(media => add(media.src)); }
  for (const group of ['reels', 'animations']) for (const item of content[group]) { add(item.src); add(item.poster); }
  for (const group of ['social', 'logos']) content[group].forEach(item => add(item.src));
  return files;
}
