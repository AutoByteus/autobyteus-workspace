// TEMPORARY investigation probe (busy-quit-shutdown-orphan E6). Mirrors electronApplication.ts quit wiring
// (before-quit 8 s app.quit timer; will-quit -> void stop() -> stopServer: SIGTERM, then SIGKILL after 5 s).
const { app } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const LOG = process.env.E6_LOG;
const t0 = Date.now();
const log = (m) => fs.appendFileSync(LOG, `+${((Date.now() - t0) / 1000).toFixed(2)}s main ${m}\n`);
const MODE = process.env.E6_CHILD ?? 'ignore-sigterm';
let child;
app.dock?.hide();
app.whenReady().then(() => {
  const code = MODE === 'ignore-sigterm'
    ? "process.on('SIGTERM',()=>{require('fs').appendFileSync(process.env.E6_LOG,'child got SIGTERM (ignored, like a hung shutdown)\\n')});setInterval(()=>{},1000)"
    : "process.on('SIGTERM',()=>{require('fs').appendFileSync(process.env.E6_LOG,'child got SIGTERM, exiting\\n');process.exit(0)});setInterval(()=>{},1000)";
  child = spawn(process.execPath, ['-e', code], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'ignore' });
  fs.writeFileSync(process.env.E6_PIDS, JSON.stringify({ main: process.pid, child: child.pid }));
  child.on('close', (c, s) => log(`child close code=${c} signal=${s}`));
  log(`ready main=${process.pid} child=${child.pid} mode=${MODE}`);
  if (process.env.E6_SELFQUIT) setTimeout(() => { log('user quit -> app.quit()'); app.quit(); }, Number(process.env.E6_SELFQUIT) * 1000);
});
let shutdownTimer = null, hasShutdownRun = false;
app.on('before-quit', () => { log('before-quit'); shutdownTimer = setTimeout(() => { log('8s shutdownTimer -> app.quit()'); app.quit(); }, 8000); });
app.on('window-all-closed', () => log('window-all-closed'));
app.on('will-quit', () => { log('will-quit'); void stop(); });
app.on('quit', (_e, code) => log(`quit exitCode=${code}`));
process.on('exit', (code) => log(`process exit ${code}`));
async function stop() {
  if (hasShutdownRun) return; hasShutdownRun = true;
  if (shutdownTimer) clearTimeout(shutdownTimer);
  await new Promise((resolve) => {
    let t; let done = false;
    const onClose = () => { if (done) return; done = true; clearTimeout(t); log('stopServer: child closed'); resolve(); };
    child.once('close', onClose);
    log('stopServer: SIGTERM child'); child.kill('SIGTERM');
    t = setTimeout(() => { log('stopServer: 5s timeout -> SIGKILL child'); child.kill('SIGKILL'); }, 5000);
  });
  log('stop() done');
}
