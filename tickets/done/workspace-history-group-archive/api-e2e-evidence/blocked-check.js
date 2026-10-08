async (arg) => {
  const results = [];
  const count = () => (document.body.innerText.match(/Stop running runs first\./g) ?? []).length;
  for (const dataTest of arg.buttons) {
    // let earlier toasts expire so each click is observed on its own
    for (let i = 0; i < 60 && count() > 0; i++) await new Promise((r) => setTimeout(r, 250));
    const before = count();
    const click = await __abDemo.click({ selector: `[data-test="${dataTest}"]` });
    let toastSeen = false;
    for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 100)); if (count() > before) { toastSeen = true; break; } }
    const dialogOpen = [...document.querySelectorAll('button')].some((b) => b.innerText.trim() === 'Archive all' && b.offsetParent !== null);
    results.push({ dataTest, click: click.ok, toastSeen, dialogOpen });
  }
  return results;
}
