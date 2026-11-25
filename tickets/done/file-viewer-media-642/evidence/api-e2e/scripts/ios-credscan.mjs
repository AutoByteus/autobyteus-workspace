// Temporary (642, iOS AC-002/AC-003 leg): the phone credential from the app's WebView localStorage (in memory only,
// never printed); its occurrences in each file given (directories walked; `$C` = the app's data container).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const container = fs.readFileSync('/tmp/api642/ios-container.txt', 'utf8').trim();
const ls = execFileSync('find', [path.join(container, 'Library/WebKit'), '-name', 'localstorage.sqlite3']).toString().trim().split('\n')[0];
const copy = '/tmp/api642/scan-ios/ls-copy';
fs.rmSync(copy, { recursive: true, force: true }); fs.mkdirSync(copy);
for (const suffix of ['', '-wal', '-shm']) if (fs.existsSync(ls + suffix)) fs.copyFileSync(ls + suffix, path.join(copy, 'db' + suffix));
const hex = execFileSync('sqlite3', [path.join(copy, 'db'), "select hex(value) from ItemTable where key = 'autobyteus.remote_access.mobile_session'"]).toString().trim();
fs.rmSync(copy, { recursive: true, force: true });
const credential = JSON.parse(Buffer.from(hex, 'hex').toString('utf16le')).credential;
const files = [];
const walk = (p) => { const st = fs.statSync(p); if (st.isDirectory()) for (const e of fs.readdirSync(p)) walk(path.join(p, e)); else files.push(p); };
for (const arg of process.argv.slice(2)) walk(arg.replace('$C', container));
let nonzero = [];
for (const file of files) { const raw = fs.readFileSync(file); const n = raw.toString('latin1').split(credential).length - 1 + raw.toString('utf16le').split(credential).length - 1; if (n) nonzero.push([file.replace(container, '$C'), n]); }
console.log(JSON.stringify({ credentialRead: Boolean(credential), startsWithMra: credential?.startsWith('mra_') ?? null, filesScanned: files.length, nonzero }));
