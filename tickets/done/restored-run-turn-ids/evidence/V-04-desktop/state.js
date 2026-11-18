() => {
  const text = document.body.innerText;
  const count = (needle) => text.split(needle).length - 1;
  const cards = [...document.querySelectorAll('[data-testid="system-task-notification-segment"]')].map((n) => n.innerText.replace(/\s+/g, ' ').trim()).filter((t) => t.includes('application restarted'));
  return { at: new Date().toISOString(), hash: location.hash, cards, replies: { FIRST_REPLY_STARTED: count('FIRST_REPLY_STARTED') - count('Reply exactly FIRST_REPLY_STARTED'), SECOND_REPLY: count('SECOND_REPLY') - count('Reply exactly SECOND_REPLY'), THIRD_REPLY: count('THIRD_REPLY') - count('Reply exactly THIRD_REPLY') },
    inputs: { first: count('This is my nightly build'), second: count('Start the nightly build again'), third: count('Is it still running now') } };
}
