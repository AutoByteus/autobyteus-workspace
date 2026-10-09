async (a) => {
  // One user step: if an "Approve" button is visible and not on hold, click it (like a user). Report state.
  const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const approves = [...document.querySelectorAll('button')].filter((b) => b.innerText.trim() === 'Approve' && visible(b) && !b.disabled);
  let clicked = false;
  if (approves.length && !a.hold) {
    approves[0].setAttribute('data-apc-approve', '1');
    const r = await __abDemo.click({ selector: '[data-apc-approve="1"]' });
    approves[0].removeAttribute('data-apc-approve');
    clicked = r.ok;
  }
  const text = document.body.innerText;
  const errors = [...document.querySelectorAll('[class*="error"], [role="alert"]')].map((e) => e.innerText.trim()).filter(Boolean).slice(0, 5);
  const stopBtn = [...document.querySelectorAll('button')].some((b) => /stop/i.test(b.getAttribute('aria-label') || b.title || b.innerText) && visible(b));
  return { clicked, approvesVisible: approves.length, running: /\bRunning\b/.test(text), stopBtn, errors,
    hasErrorWord: /Error in Anthropic|invalid_request_error|prefix|400/i.test(text) };
}
