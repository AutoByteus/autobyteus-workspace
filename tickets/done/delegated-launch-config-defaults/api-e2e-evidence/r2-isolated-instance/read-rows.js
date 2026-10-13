async (arg) => {
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  if (arg.open) { await __abDemo.click({ selector: "[data-test=workspace-header-edit-config]" }); await wait(3500); }
  const section = document.querySelector("[data-test=run-delegated-launches]");
  if (!section) return { error: "no section", status: document.querySelector("[data-test=run-subject-status]")?.innerText };
  if (arg.expand) {
    for (let round = 0; round < 6; round++) {
      const closed = [...section.querySelectorAll("[data-test=run-member-toggle][aria-expanded=false]")];
      if (!closed.length) break;
      for (const t of closed) { t.click(); await wait(250); }
    }
  }
  section.scrollIntoView({ block: "start" }); await wait(600);
  const rows = [...section.querySelectorAll("[data-source]")].map((el) => {
    const own = (s) => [...el.querySelectorAll(s)].filter((n) => n.closest("[data-source]") === el);
    return { row: el.getAttribute("data-test").replace("run-member-", "").replace(/@.*$/, ""), member: Boolean(el.parentElement?.closest("[data-source]")), source: el.getAttribute("data-source"),
      badge: own("[data-test=run-member-badge]")[0]?.textContent.trim() ?? null, summary: own("[data-test=run-member-summary]")[0]?.textContent.replace(/\s+/g, " ").trim(),
      notes: own("[data-test=run-member-launch-note]").map((n) => n.textContent.replace(/\s+/g, " ").trim()), noteCount: own("[data-test=run-member-note-count]")[0]?.textContent.trim() ?? null,
      expanded: own("[data-test=run-member-toggle]")[0]?.getAttribute("aria-expanded"), coordinator: own("span").some((n) => n.textContent.trim() === "Coordinator"),
      card: own('[data-test^="run-settings-card"]').length > 0 };
  });
  return { status: document.querySelector("[data-test=run-subject-status]")?.innerText, width: section.getBoundingClientRect().width, rows };
}
