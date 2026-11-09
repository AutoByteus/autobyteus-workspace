await app.locator('[data-test="right-side-tab-list"]').getByText('Terminal', { exact: true }).click();
await app.waitForTimeout(3000);
const term = app.locator('.xterm').first();
const visible = await term.isVisible().catch(() => false);
if (visible) { await term.click(); await app.keyboard.type("env | grep -c -E 'own_|AUTOBYTEUS_LAUNCH|OWNER_CREDENTIAL'; echo TERM-MARK-$((40+2))\n"); }
await app.waitForTimeout(2500);
const text = visible ? await app.locator('.xterm-rows').first().innerText() : await app.locator('[data-test="workspace-right-panel"]').innerText();
await app.screenshot({ path: '/tmp/abtest437/e3.png' });
return { visible, text: text.slice(-600) };
