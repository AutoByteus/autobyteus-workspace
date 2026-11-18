const { app, BrowserWindow } = require("electron");
const path = require("path"); const { pathToFileURL } = require("url");
app.whenReady().then(() => {
  const w = new BrowserWindow({ show:false, webPreferences:{ nodeIntegration:false, contextIsolation:true, sandbox:true } });
  w.loadURL(pathToFileURL(path.join(__dirname, "page.html")).toString());
  const w2 = new BrowserWindow({ show:false, webPreferences:{ sandbox:true } });
  w2.loadURL("http://localhost:47911/served-page-ignored");
  setTimeout(() => app.quit(), 3000);
});
