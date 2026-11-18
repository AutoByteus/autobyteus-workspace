() => { const text = document.body.innerText; const count = (n) => text.split(n).length - 1;
  const cards = [...document.querySelectorAll('[data-testid="system-task-notification-segment"]')].map((n) => n.innerText.replace(/\s+/g, ' ').trim());
  return { at: new Date().toISOString(), hash: location.hash, cards, started: count('CLAUDE_STARTED') - count('Reply exactly CLAUDE_STARTED'), tail: text.slice(-700) }; }
