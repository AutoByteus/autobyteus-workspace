export default async ({ page, shot }) => {
  const box = page.getByRole("combobox").first();
  await box.click();
  await page.keyboard.type("Call send_message_to exactly once with recipient_address /general_agent and content HELLO-HOST-AFTER-CRASH. Then reply sent.", { delay: 5 });
  await page.getByRole("button", { name: "Send message" }).first().click();
  await page.waitForTimeout(3000);
  return "sent";
};
