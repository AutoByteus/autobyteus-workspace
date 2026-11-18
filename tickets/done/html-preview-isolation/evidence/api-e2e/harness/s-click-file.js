await page.locator('.file-header:visible', { hasText: args[0] }).filter({ hasNotText: '.next' }).first().click();
await page.waitForTimeout(Number(args[1] || 2500));
return 'clicked ' + args[0];
