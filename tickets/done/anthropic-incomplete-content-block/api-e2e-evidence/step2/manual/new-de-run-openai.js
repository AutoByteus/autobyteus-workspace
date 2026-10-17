async () => {
  const pause = (ms) => new Promise(x=>setTimeout(x,ms));
  await __abDemo.click({ text: "Agents", nth: 0 }); await pause(2500);
  const title = [...document.querySelectorAll("*")].find(e => e.children.length===0 && e.textContent.trim()==="Data Engineer" && e.closest("main"));
  let card = title; for (let i=0;i<6 && card && !card.querySelector("button"); i++) card = card.parentElement;
  const run = [...card.querySelectorAll("button")].find(b => b.innerText.trim()==="Run");
  run.setAttribute("data-olr-target","run-de"); await __abDemo.click({ selector: "[data-olr-target=\"run-de\"]" }); await pause(3000);
  await __abDemo.click({ selector: "button[aria-label^=\"Model:\"]" }); await pause(1000);
  await __abDemo.type({ selector: "input[placeholder=\"Search models\"]" }, "gpt-5.4-mini", { delayMs: 30 }); await pause(1200);
  const opt = [...document.querySelectorAll("button,[role=option],li")].find(e => e.offsetParent!==null && e.innerText.trim().startsWith("gpt-5.4-mini") && /AutoByteus/.test(e.innerText));
  if (!opt) return { error: "model option not found" };
  opt.setAttribute("data-olr-target","model-pick"); await __abDemo.click({ selector: "[data-olr-target=\"model-pick\"]" }); await pause(1200);
  await __abDemo.click({ selector: "button[aria-label^=\"Workspace:\"]" }); await pause(1000);
  const ws = [...document.querySelectorAll("button,[role=option],li")].find(e => e.offsetParent!==null && /olr-manual-ws-jZMxBi/.test(e.innerText) && !/Workspace:/.test(e.getAttribute("aria-label")||"") && e.innerText.length < 200 && !e.closest("aside, nav"));
  if (ws) { ws.setAttribute("data-olr-target","ws-pick"); await __abDemo.click({ selector: "[data-olr-target=\"ws-pick\"]" }); await pause(1200); }
  const labels = [...document.querySelectorAll("button")].map(b=>b.getAttribute("aria-label")||"").filter(l => /^(Choose what to run|Workspace:|Model:)/.test(l));
  return { labels };
}
