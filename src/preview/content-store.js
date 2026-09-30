import defaults from './content-defaults.json';
import { validateContent } from './content-schema.js';
import { cloudConfigured, cloudUrl, cloudKey } from './cloud-config.js';
let contentPromise;
async function readContent() {
  if (cloudConfigured) {
    const response = await fetch(`${cloudUrl}/rest/v1/portfolio_published?id=eq.1&select=document`, { headers: { apikey: cloudKey }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Published content is unavailable');
    const rows = await response.json();
    if (rows[0]?.document) return validateContent(rows[0].document);
  }
  const response = await fetch('/portfolio-content.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Content unavailable');
  return validateContent(await response.json());
}
export function loadContent() {
  if (!contentPromise) contentPromise = readContent()
    .catch(error => { console.warn('Using the portfolio backup:', error.message); return validateContent(defaults); });
  // Runtime playback failures must not mutate the saved document or other consumers.
  return contentPromise.then(content => structuredClone(content));
}
