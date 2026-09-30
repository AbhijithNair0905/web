import { createClient } from '@supabase/supabase-js';
import { cloudUrl, cloudKey, cloudConfigured } from './cloud-config.js';
import { validateContent, groups } from './content-schema.js';

export const cloud = cloudConfigured ? createClient(cloudUrl, cloudKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
const privatePrefix = `${cloudUrl}/storage/v1/object/authenticated/portfolio-library/`;
const signed = new Map();
function check(error) { if (error) throw new Error(error.message); }
export function privateAssetPath(src) {
  if (!src?.startsWith(privatePrefix)) return null;
  const path = src.slice(privatePrefix.length);
  if (!/^[a-f0-9-]+\.(png|jpe?g|webp|gif|avif|mp4|webm)$/i.test(path)) throw new Error('Invalid private media reference.');
  return path;
}
export async function ownerSession() {
  const { data: { session }, error } = await cloud.auth.getSession(); check(error);
  if (!session) return null;
  const { data: allowed, error: accessError } = await cloud.rpc('is_portfolio_admin'); check(accessError);
  if (!allowed) throw new Error('This account does not have access to this studio.');
  return session;
}
export async function loadCloudDraft() {
  const { data, error } = await cloud.from('portfolio_drafts').select('document,revision').eq('id', 1).single(); check(error);
  const { data: published, error: publishedError } = await cloud.from('portfolio_published').select('revision').eq('id', 1).maybeSingle(); check(publishedError);
  return { content: validateContent(data.document), revision: data.revision, publishedRevision: published?.revision ?? -1 };
}
export async function saveCloudDraft(content, revision, signal) {
  let request = cloud.rpc('save_portfolio_draft', { p_document: validateContent(content), p_expected_revision: revision });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request; check(error);
  return { content: validateContent(data.document), revision: data.revision };
}
export async function uploadCloudFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await cloud.storage.from('portfolio-library').upload(path, file, { upsert: false, contentType: file.type || (extension === 'mp4' ? 'video/mp4' : extension === 'webm' ? 'video/webm' : `image/${extension === 'jpg' ? 'jpeg' : extension}`) }); check(error);
  return { src: privatePrefix + path };
}
export async function previewCloudAsset(src) {
  const path = privateAssetPath(src); if (!path) return src;
  const cached = signed.get(path); if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await cloud.storage.from('portfolio-library').createSignedUrl(path, 3600); check(error);
  signed.set(path, { url: data.signedUrl, expires: Date.now() + 3300000 }); return data.signedUrl;
}
export function clearCloudPreviews() { signed.clear(); }
export async function publishCloudDraft(revision, onProgress = () => {}) {
  const current = await loadCloudDraft();
  if (current.revision !== revision) throw new Error('The draft changed in another window. Reload before publishing.');
  const paths = new Set(), localFiles = new Set();
  const collect = src => { const path = privateAssetPath(src); if (path) paths.add(path); else if (src?.startsWith('/')) localFiles.add(src); };
  for (const group of groups) for (const item of current.content[group].filter(item => item.enabled)) {
    collect(item.src); collect(item.cover); collect(item.poster); item.media?.forEach(media => collect(media.src));
  }
  // A restored backup may refer to a computer-only file that was never deployed.
  for (const src of localFiles) {
    const response = await fetch(src, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok || response.headers.get('content-type')?.includes('text/html')) throw new Error('A file in this draft is missing from the hosted website. Upload that file in the online studio before publishing: ' + src);
  }
  let count = 0;
  for (const path of paths) {
    onProgress(`Preparing media ${++count} of ${paths.size}…`);
    // Copy server-side: draft files stay private, and large videos need no browser round trip.
    const { error } = await cloud.storage.from('portfolio-library').copy(path, path, { destinationBucket: 'portfolio-media' });
    if (error) {
      // Previously published immutable files may already exist. Confirm the destination.
      const { data: existing, error: lookupError } = await cloud.storage.from('portfolio-media').list('', { search: path, limit: 1 });
      if (lookupError || !existing?.some(item => item.name === path)) check(error);
    }
  }
  onProgress('Publishing the saved draft…');
  const { data, error } = await cloud.rpc('publish_portfolio_draft', { p_expected_revision: revision }); check(error);
  return data;
}
