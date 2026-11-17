() => {
  const text = document.body.innerText;
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const buttons = [...document.querySelectorAll('button')].filter(visible).map((b) => (b.getAttribute('aria-label') || b.title || b.innerText || '').trim()).filter(Boolean);
  const statusTexts = [...document.querySelectorAll('*')].filter((el) => el.children.length === 0 && visible(el) && /background task|后台任务|^Idle$|^Running$|^空闲$|^运行中$/i.test((el.textContent || '').trim()))
    .map((el) => ({ text: el.textContent.trim(), tag: el.tagName, cls: (el.className || '').toString().slice(0, 80) }));
  const dots = [...document.querySelectorAll('[data-status], span.rounded-full')].filter(visible).map((el) => ({ status: el.getAttribute('data-status'), cls: (el.className || '').toString().slice(0, 90), title: el.getAttribute('title') || el.getAttribute('aria-label') })).slice(0, 12);
  return { at: new Date().toISOString(), hash: location.hash, statusTexts, stopButtons: buttons.filter((b) => /^stop|停止/i.test(b)), sendButtons: buttons.filter((b) => /send|发送/i.test(b)), dots };
}
