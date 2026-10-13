async (arg) => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const row = (key) => document.querySelector(`[data-test="run-member-${key}"]`);
  const summary = (key) => row(key)?.querySelector("[data-test=run-member-summary]")?.innerText.replace(/\s+/g, " ") ?? null;
  const open = async (key) => { const t = row(key)?.querySelector("[data-test=run-member-toggle]"); if (t && t.getAttribute("aria-expanded") !== "true") { t.click(); await wait(800); } };
  if (!document.querySelector("[data-test=existing-run-settings]")) { document.querySelector("[data-test=workspace-header-edit-config]")?.click(); await wait(3500); }
  for (let i = 0; i < 30 && !row(arg.team); i++) await wait(500);
  const out = { runningTeam: summary(arg.team) };
  await __abDemo.click({ selector: `[data-test="run-member-${arg.team}"] [data-test=run-member-stop]` });
  await open(arg.team);
  for (let i = 0; i < 60 && row(arg.team)?.querySelector("[data-test=run-setting-model] [data-test=run-setting-locked]"); i++) await wait(1000);
  out.before = Object.fromEntries(arg.members.map((k) => [k.split("@")[0].split("/").pop(), summary(k)]));
  await open(arg.member);
  row(arg.member).querySelector("[data-test=chat-model-trigger]").click(); await wait(1000);
  out.lockedRuntime = document.querySelector("[data-test=chat-model-locked-runtime]")?.innerText ?? null;
  const search = document.querySelector("[data-test=chat-model-menu] [data-test=chat-model-search]");
  search.focus(); search.value = arg.model; search.dispatchEvent(new Event("input", { bubbles: true })); await wait(1000);
  document.querySelector(`[data-test=chat-model-search-option-${arg.model}]`).click(); await wait(600);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await wait(500);
  document.querySelector("[data-test=save-existing-model-config]")?.click();
  for (let i = 0; i < 60 && !/^\s*Saved\./.test(document.querySelector("[data-test=existing-run-save-bar]")?.innerText ?? ""); i++) await wait(1000);
  out.saveBar = document.querySelector("[data-test=existing-run-save-bar]")?.innerText.replace(/\s+/g, " ");
  await open(arg.team);
  out.after = Object.fromEntries(arg.members.map((k) => [k.split("@")[0].split("/").pop(), summary(k)]));
  out.afterTeam = summary(arg.team);
  row(arg.member)?.scrollIntoView({ block: "center" }); await wait(500);
  return out;
}
