// Docker window: VNC Viewer View only (clicks do not reach the node), then Control (a click moves the node's mouse).
import { execFileSync } from 'node:child_process';
const inNode = (...a) => execFileSync('docker', ['exec', '--user', 'vncuser', '--env', 'DISPLAY=:99', 'abx403-api-e2e-node', ...a], { encoding: 'utf8' }).trim();
const mouse = () => inNode('xdotool', 'getmouselocation').split(' ').slice(0, 2).join(' ');
export default async ({ page, shot }) => {
  await page.locator('[data-tab-name="vnc"]:visible').first().click({ timeout: 10000 });
  const tile = page.locator('.vnc-viewer [data-testid="node-desktop-tile"]').first();
  await tile.waitFor({ timeout: 20000 });
  const connect = tile.getByRole('button', { name: 'Connect', exact: true });
  if (await connect.count()) await connect.click();
  const statusOf = async () => (await tile.locator('[data-testid="node-desktop-status"]').innerText({ timeout: 1000 }).catch(() => '')).trim();
  let status = '';
  for (let i = 0; i < 40 && !/Connected · View only/.test(status); i += 1) { await page.waitForTimeout(750); status = await statusOf(); }
  await page.waitForTimeout(1500);
  inNode('xdotool', 'mousemove', '300', '300');
  const canvas = tile.locator('canvas').first();
  let box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.75);
  await page.waitForTimeout(800);
  const viewOnlyMouse = mouse();
  await shot(page, 'API-08-docker-vnc-view-only');
  await tile.getByRole('button', { name: 'View only', exact: true }).click();
  let control = '';
  for (let i = 0; i < 40 && !/Connected · Control/.test(control); i += 1) { await page.waitForTimeout(750); control = await statusOf(); }
  await page.waitForTimeout(1500);
  box = await canvas.boundingBox();
  inNode('xdotool', 'mousemove', '300', '300');
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.75);
  await page.waitForTimeout(800);
  const controlMouse = mouse();
  await shot(page, 'API-08-docker-vnc-control');
  return { viewOnlyStatus: status, viewOnlyMouse, controlStatus: control, controlMouse, expectedNear: 'x:1440 y:810', canvas: box };
};
