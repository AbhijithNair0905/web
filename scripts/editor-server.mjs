import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { promises as fs, createReadStream, createWriteStream } from 'node:fs';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { validateContent } from '../src/preview/content-schema.js';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const uploadTypes = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.mp4', '.webm']);
const revisionOf = bytes => createHash('sha256').update(bytes).digest('hex');
const error = (status, message) => Object.assign(new Error(message), { status });
const inside = (root, file) => { const relative = path.relative(root, file); return !relative.startsWith('..') && !path.isAbsolute(relative); };
function matchesFile(bytes, extension) {
  if (extension === '.png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (['.jpg', '.jpeg'].includes(extension)) return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (extension === '.gif') return /^GIF8[79]a$/.test(bytes.toString('ascii', 0, 6));
  if (extension === '.webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (extension === '.webm') return bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
  const ftyp = bytes.toString('ascii', 4, 8) === 'ftyp';
  if (extension === '.avif') return ftyp && /avif|avis/.test(bytes.toString('ascii', 8, 64));
  return extension === '.mp4' && ftyp && !/avif|avis|heic/.test(bytes.toString('ascii', 8, 64));
}
async function readBody(req, limit = 2 * 1024 * 1024) {
  let length = 0; const chunks = [];
  for await (const chunk of req) { length += chunk.length; if (length > limit) throw error(413, 'The content file is too large.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw error(400, 'Could not read this content file.'); }
}

export function createEditorServer({ projectRoot, buildRoot }) {
  const publicRoot = path.join(projectRoot, 'public');
  const contentFile = path.join(publicRoot, 'portfolio-content.json');
  const token = randomBytes(32).toString('hex');
  let queue = Promise.resolve();
  const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': types['.json'], 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  const snapshot = async () => { const bytes = await fs.readFile(contentFile); return { content: validateContent(JSON.parse(bytes)), revision: revisionOf(bytes) }; };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    const hosts = [`127.0.0.1:${server.address().port}`, `localhost:${server.address().port}`];
    try {
      if (!hosts.includes(req.headers.host)) throw error(403, 'This editor is only available on this computer.');
      const origin = `http://${req.headers.host}`;
      const url = new URL(req.url, origin);
      if (url.pathname.startsWith('/api/editor/')) {
        if ((req.headers.origin && req.headers.origin !== origin) || (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site']))) throw error(403, 'Open the editor directly on this computer.');
        if (req.method === 'GET' && url.pathname === '/api/editor/session') return json(res, 200, { token, ...(await snapshot()), mode: 'local' });
        if (req.method !== 'GET') {
          const provided = Buffer.from(req.headers['x-editor-token'] || '');
          if (req.headers.origin !== origin || provided.length !== token.length || !timingSafeEqual(provided, Buffer.from(token))) throw error(403, 'Reload the editor before saving.');
        }
        if (req.method === 'PUT' && url.pathname === '/api/editor/content') {
          const body = await readBody(req);
          let content; try { content = validateContent(body.content); } catch (e) { throw error(400, e.message); }
          const task = queue.then(async () => {
            const current = await snapshot();
            if (body.revision !== current.revision) throw error(409, 'Content changed in another editor window. Download your draft backup, then reload to get the latest version.');
            const backups = path.join(projectRoot, '.content-backups');
            await fs.mkdir(backups, { recursive: true });
            await fs.copyFile(contentFile, path.join(backups, `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.json`));
            const next = JSON.stringify(content, null, 2) + '\n';
            const temp = `${contentFile}.${randomUUID()}.tmp`;
            try { await fs.writeFile(temp, next, { flag: 'wx' }); await fs.rename(temp, contentFile); }
            finally { await fs.rm(temp, { force: true }); }
            return { content, revision: revisionOf(next) };
          });
          queue = task.catch(() => {});
          return json(res, 200, await task);
        }
        if (req.method === 'POST' && url.pathname === '/api/editor/upload') {
          const extension = path.extname(url.searchParams.get('name') || '').toLowerCase();
          if (!uploadTypes.has(extension)) throw error(400, 'Choose PNG, JPG, WebP, GIF, AVIF, MP4 or WebM.');
          const limit = ['.mp4', '.webm'].includes(extension) ? 150 * 1024 * 1024 : 20 * 1024 * 1024;
          if (Number(req.headers['content-length']) > limit) throw error(413, `Choose a file under ${limit / 1024 / 1024} MB.`);
          const directory = path.join(publicRoot, 'portfolio-uploads');
          await fs.mkdir(directory, { recursive: true });
          const filename = randomUUID() + extension;
          const temp = path.join(directory, filename + '.tmp');
          let length = 0, first = Buffer.alloc(0);
          const limiter = new Transform({ transform(chunk, _encoding, callback) {
            length += chunk.length;
            if (first.length < 128) first = Buffer.concat([first, chunk.subarray(0, 128 - first.length)]);
            callback(length > limit ? error(413, 'This file exceeds the upload limit.') : null, chunk);
          } });
          try {
            await pipeline(req, limiter, createWriteStream(temp, { flags: 'wx' }));
            if (!length || !matchesFile(first, extension)) throw error(400, 'The file contents do not match its format. Export it again and retry.');
            await fs.rename(temp, path.join(directory, filename));
            return json(res, 201, { src: `/portfolio-uploads/${filename}`, bytes: length });
          } finally { await fs.rm(temp, { force: true }); }
        }
        throw error(404, 'Editor action not found.');
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw error(405, 'Method not allowed.');
      let pathname; try { pathname = decodeURIComponent(url.pathname); } catch { throw error(400, 'Invalid path.'); }
      if (pathname === '/') { res.writeHead(302, { Location: '/hero-preview.html' }); return res.end(); }
      if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) throw error(403, 'Path not available.');
      const live = pathname === '/portfolio-content.json' || pathname.startsWith('/portfolio-uploads/');
      const root = await fs.realpath(live ? publicRoot : buildRoot);
      const candidate = path.resolve(root, '.' + pathname);
      if (!inside(root, candidate)) throw error(403, 'Path not available.');
      const file = await fs.realpath(candidate);
      if (!inside(root, file)) throw error(403, 'Path not available.');
      const stat = await fs.stat(file);
      if (!stat.isFile() || file.endsWith('.tmp')) throw error(404, 'File not found.');
      res.setHeader('Content-Type', types[path.extname(file).toLowerCase()] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Accept-Ranges', 'bytes');
      let start = 0, end = stat.size - 1;
      if (req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (!match || (!match[1] && !match[2])) throw error(416, 'Invalid media range.');
        start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]));
        end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
        if (!Number.isSafeInteger(start) || start > end || start >= stat.size) { res.setHeader('Content-Range', `bytes */${stat.size}`); throw error(416, 'Invalid media range.'); }
        res.statusCode = 206; res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      }
      res.setHeader('Content-Length', Math.max(0, end - start + 1));
      if (req.method === 'HEAD' || !stat.size) return res.end();
      await pipeline(createReadStream(file, { start, end }), res);
    } catch (e) {
      if (res.headersSent || res.destroyed) return;
      const status = e.status || (e.code === 'ENOENT' ? 404 : 500);
      json(res, status, { error: status === 500 ? 'Could not complete this action. Your last saved content is safe.' : e.message });
    }
  });
  return server;
}

// Resolve both paths because this Windows workspace can be opened through a junction.
if (process.argv[1] && await fs.realpath(process.argv[1]) === await fs.realpath(fileURLToPath(import.meta.url))) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const server = createEditorServer({ projectRoot, buildRoot: path.resolve(projectRoot, '../work/chrome-hero-build') });
  const port = Number(process.env.PORTFOLIO_EDITOR_PORT || 3000);
  server.listen(port, '127.0.0.1', () => console.log(`Content studio: http://127.0.0.1:${port}/content-editor.html\nPortfolio: http://127.0.0.1:${port}/hero-preview.html`));
  server.on('error', e => { console.error(e.message); process.exitCode = 1; });
}
