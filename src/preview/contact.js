const form = document.querySelector('#contact-form');
const fields = document.querySelector('#contact-fields');
const submit = form.querySelector('[type="submit"]');
const label = submit.querySelector('span');
const logo = submit.querySelector('img');
const status = document.querySelector('#contact-status');
let sending = false;
submit.disabled = false;

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending || !form.reportValidity() || form.elements.botcheck.checked) return;
  const body = new FormData(form);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  sending = true; fields.disabled = true; submit.disabled = true;
  form.setAttribute('aria-busy', 'true');
  logo.hidden = false; label.textContent = 'Sending…';
  status.textContent = 'Sending your message…'; delete status.dataset.state;
  try {
    // Reuses the existing portfolio's Web3Forms destination.
    const response = await fetch('https://api.web3forms.com/submit', { method: 'POST', body, signal: controller.signal });
    const result = await response.json();
    if (!response.ok || result.success !== true) throw new Error('Submission not accepted');
    form.reset();
    status.dataset.state = 'success';
    status.textContent = 'Thanks — your message has been sent.';
  } catch (error) {
    status.dataset.state = 'error';
    status.textContent = error.name === 'AbortError'
      ? 'Sending timed out. Your message is still here; try again or use the email link.'
      : 'Your message couldn’t be sent. Your text is still here; try again or use the email link.';
  } finally {
    window.clearTimeout(timeout);
    sending = false; fields.disabled = false; submit.disabled = false;
    form.removeAttribute('aria-busy'); logo.hidden = true; label.textContent = 'Send message ↗';
  }
});
