const tab = page.locator('button:visible, [role=tab]:visible').filter({ hasText: /^\s*Files\s*$/ }).first();
await tab.scrollIntoViewIfNeeded(); await tab.click(); await page.waitForTimeout(1500);
return 'files tab';
