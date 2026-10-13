async (arg) => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  location.hash = "#/agents"; await wait(2500);
  const label = [...document.querySelectorAll("main *")].find(e => e.children.length === 0 && e.textContent.trim() === arg.name);
  if (!label) return { error: "no card" };
  let node = label; while (node && ![...node.querySelectorAll("button")].some(b => b.textContent.trim() === "Run")) node = node.parentElement;
  [...node.querySelectorAll("button")].find(b => b.textContent.trim() === "Run").click(); await wait(4000);
  const list = () => document.querySelector(`[data-test=chat-model-list-${arg.runtime}]`);
  document.querySelector("[data-test=chat-composer] [data-test=chat-model-trigger]").click(); await wait(800);
  for (let i = 0; i < 12 && !list(); i++) { await __abDemo.hover({ selector: `[data-test=chat-runtime-${arg.runtime}]` }); await wait(700); if (!list()) { document.querySelector(`[data-test=chat-runtime-${arg.runtime}]`)?.click(); await wait(700); } }
  for (let i = 0; i < 20 && !list()?.querySelector(`[data-test=chat-model-option-${arg.model}]`); i++) await wait(500);
  list().querySelector(`[data-test=chat-model-option-${arg.model}]`).click(); await wait(1000);
  const root = document.querySelector("[data-test=chat-composer] [data-test=chat-model-trigger]")?.innerText.replace(/\s+/g, " ");
  document.querySelector("[data-test=chat-composer] textarea").setAttribute("data-iso-target", "composer");
  await __abDemo.type({ selector: "[data-iso-target=composer]" }, arg.text, { delayMs: 5, clear: true }); await wait(400);
  await __abDemo.click({ selector: "[data-test=chat-primary-action]" }); await wait(6000);
  return { root, hash: location.hash };
}
