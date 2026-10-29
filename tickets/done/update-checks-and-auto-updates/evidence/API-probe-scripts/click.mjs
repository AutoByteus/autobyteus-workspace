// A real click on a test id (or role=button text within a dialog), then a short settle.
export default async (page, args) => {
  const target = args.testid ? page.locator(`[data-testid="${args.testid}"]`) : page.locator('[role="dialog"][aria-modal="true"] button').filter({ hasText: new RegExp(args.dialogButton) }).last();
  await target.click(); await page.waitForTimeout(args.wait ?? 600);
  return { clicked: args.testid ?? args.dialogButton };
};
