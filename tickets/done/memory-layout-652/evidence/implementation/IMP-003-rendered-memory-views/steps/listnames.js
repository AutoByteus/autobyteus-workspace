const node = `teams/team:software-engineering-team/agent:${encodeURIComponent(stack.designerId)}`;
await h.goto(`?view=home&section=browse&node=${encodeURIComponent(node)}&pane=semantic`);
await page.locator('.semantic-memory-reader .markdown-body h1').first().waitFor({ timeout: 60000 });
await h.sleep(800);
return await page.locator('.semantic-memory-sidebar .file-header span.truncate').evaluateAll((els) => els.map((el) => ({ text: el.textContent.trim(), chars: el.textContent.trim().length, width: Math.round(el.getBoundingClientRect().width), truncated: el.scrollWidth > el.clientWidth })));
