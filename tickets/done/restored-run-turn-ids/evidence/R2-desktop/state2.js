() => { const text = document.body.innerText; const count = (n) => text.split(n).length - 1;
  const cards = [...document.querySelectorAll('[data-testid="system-task-notification-segment"]')].map((n) => n.innerText.replace(/\s+/g, ' ').trim()).filter((t) => t.includes('application restarted'));
  const r = (k) => count(k) - count('Reply exactly ' + k);
  return { at: new Date().toISOString(), cards, replies: { FIRST: r('FIRST_REPLY_STARTED'), SECOND: r('SECOND_REPLY'), THIRD: r('THIRD_REPLY'), FOURTH: r('FOURTH_REPLY') } }; }
