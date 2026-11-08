// API-13 helper: loaded with NODE_OPTIONS=--require into every Node process of the dev run; in Electron's main process
// only, it adds Chromium's --remote-debugging-port (API416_CDP_PORT, loopback) before the app is ready, so the run can
// read the dev window over CDP. The `electron` module is not loadable during --require preloading, so the switch is
// added on the next tick (still before the app's 'ready'). It changes nothing else.
if (process.versions.electron && process.type === 'browser' && process.env.API416_CDP_PORT) {
  setImmediate(() => {
    const { app } = require('electron');
    app.commandLine.appendSwitch('remote-debugging-port', process.env.API416_CDP_PORT);
    app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
  });
}
