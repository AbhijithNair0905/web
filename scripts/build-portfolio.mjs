import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import { build, loadEnv } from 'vite';
import { publishedContent, publishedFiles } from './published-content.mjs';

const root = await fs.realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const publicRoot = await fs.realpath(path.join(root, 'public'));
const outDir = path.join(root, 'dist-portfolio');
const env = loadEnv('portfolio', root, 'VITE_');
const cloud = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY);
if (Boolean(env.VITE_SUPABASE_URL) !== Boolean(env.VITE_SUPABASE_PUBLISHABLE_KEY)) throw new Error('Set both Supabase connection values before building the online studio.');
if (cloud) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(env.VITE_SUPABASE_URL)) throw new Error('Use the HTTPS project URL from Supabase.');
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  let legacyAnon = false;
  try { legacyAnon = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon'; } catch { /* Modern publishable keys are not JWTs. */ }
  if (!key.startsWith('sb_publishable_') && !legacyAnon) throw new Error('Use a publishable (or legacy anon) key. Secret and service-role keys must never be included in the website.');
}
// Vite may empty this one build directory. Never follow a redirected output path.
const existing = await fs.lstat(outDir).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
if (existing?.isSymbolicLink() || path.dirname(outDir) !== root) throw new Error('The deployment output must be the project’s own dist-portfolio directory.');
const content = publishedContent(JSON.parse(await fs.readFile(path.join(publicRoot, 'portfolio-content.json'), 'utf8')));
const assets = [];
for (const url of publishedFiles(content)) {
  const pathname = decodeURIComponent(new URL(url, 'https://portfolio.local').pathname);
  const source = await fs.realpath(path.join(publicRoot, pathname));
  const relative = path.relative(publicRoot, source);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`Asset outside the portfolio public folder: ${url}`);
  assets.push({ source, target: path.join(outDir, pathname) });
}
const virtual = '\0published-portfolio-content';
await build({
  root,
  mode: 'portfolio',
  publicDir: false,
  plugins: [{
    name: 'published-content-only', enforce: 'pre',
    resolveId(source, importer) {
      if (source === './content-defaults.json' && importer?.replace(/\\/g, '/').endsWith('/src/preview/content-store.js')) return virtual;
    },
    load(id) { if (id === virtual) return `export default ${JSON.stringify(content)};`; }
  }],
  build: { outDir, emptyOutDir: true, rollupOptions: { input: { portfolio: path.join(root, 'hero-preview.html'), ...(cloud ? { contentEditor: path.join(root, 'content-editor.html') } : {}) } } }
});
await fs.rename(path.join(outDir, 'hero-preview.html'), path.join(outDir, 'index.html'));
for (const { source, target } of assets) { await fs.mkdir(path.dirname(target), { recursive: true }); await fs.copyFile(source, target); }
await fs.writeFile(path.join(outDir, 'portfolio-content.json'), JSON.stringify(content, null, 2) + '\n');

async function inspect(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if ((!cloud && /editor|studio/i.test(entry.name)) || /backup|editor-server/i.test(entry.name)) throw new Error(`Private editor artifact in deployment: ${entry.name}`);
    if (entry.isDirectory()) await inspect(file);
    else if (!cloud && /\.(html|js)$/.test(entry.name) && (await fs.readFile(file, 'utf8')).includes('/api/editor/')) throw new Error('Editor API reference found in the public build.');
  }
}
await inspect(outDir);
console.log(cloud ? 'Portfolio and owner-login studio ready in dist-portfolio. Draft access is enforced by Supabase policies; local APIs and backups are excluded.' : 'Public portfolio ready in dist-portfolio. Online studio is not connected yet, so its interface is excluded.');
