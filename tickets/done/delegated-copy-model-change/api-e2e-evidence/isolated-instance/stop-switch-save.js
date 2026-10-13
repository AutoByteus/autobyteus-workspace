async (arg) => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const out = {};
  if (!document.querySelector("[data-test=existing-run-settings]")) { document.querySelector("[data-test=workspace-header-edit-config]")?.click(); await wait(3500); }
  const row = () => document.querySelector(`[data-test="run-member-${arg.key}"]`);
  for (let i = 0; i < 30 && !row(); i++) await wait(500);
  if (!row()) return { error: "no row", text: document.querySelector("[data-test=run-delegated-launches]")?.innerText.slice(0, 400) };
  out.runningSummary = row().querySelector("[data-test=run-member-summary]")?.innerText.replace(/\s+/g, " ");
  const toggle = row().querySelector("[data-test=run-member-toggle]");
  if (toggle?.getAttribute("aria-expanded") !== "true") { toggle.click(); await wait(800); }
  out.runningHint = row().querySelector("[data-test=run-member-stop-hint]")?.innerText ?? null;
  const stop = row().querySelector("[data-test=run-member-stop]");
  if (stop && arg.stop) { stop.scrollIntoView({ block: "center" }); await wait(300); await __abDemo.click({ selector: `[data-test="run-member-${arg.key}"] [data-test=run-member-stop]` }); }
  for (let i = 0; i < 60 && row()?.querySelector("[data-test=run-setting-model] [data-test=run-setting-locked]"); i++) await wait(1000);
  out.unlocked = !row()?.querySelector("[data-test=run-setting-model] [data-test=run-setting-locked]");
  if (!out.unlocked) return out;
  row().querySelector("[data-test=chat-model-trigger]").click(); await wait(1000);
  out.lockedRuntime = document.querySelector("[data-test=chat-model-locked-runtime]")?.innerText ?? null;
  const search = document.querySelector("[data-test=chat-model-menu] [data-test=chat-model-search]");
  search.focus(); search.value = arg.model; search.dispatchEvent(new Event("input", { bubbles: true })); await wait(1000);
  const option = document.querySelector(`[data-test=chat-model-search-option-${arg.model}]`);
  if (!option) return { ...out, error: "no option", options: [...document.querySelectorAll("[data-test^=chat-model-search-option-]")].map(e => e.getAttribute("data-test")) };
  option.click(); await wait(600);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await wait(500);
  document.querySelector("[data-test=save-existing-model-config]")?.click();
  for (let i = 0; i < 60 && !/^\s*Saved\./.test(document.querySelector("[data-test=existing-run-save-bar]")?.innerText ?? ""); i++) await wait(1000);
  out.saveBar = document.querySelector("[data-test=existing-run-save-bar]")?.innerText.replace(/\s+/g, " ") ?? null;
  out.savedSummary = row()?.querySelector("[data-test=run-member-summary]")?.innerText.replace(/\s+/g, " ");
  return out;
}
