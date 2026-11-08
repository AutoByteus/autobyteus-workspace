const show = app.getByRole('button', { name: 'Show tools', exact: true });
if (await show.isVisible().catch(() => false)) await show.click();
await app.waitForTimeout(1000);
const tabs = await app.locator('[data-test="right-side-tab-list"] button, [data-test="right-side-tab-list"] [role="tab"]').allInnerTexts();
await app.screenshot({ path: '/tmp/abtest437/e2.png' });
return { tabs };
