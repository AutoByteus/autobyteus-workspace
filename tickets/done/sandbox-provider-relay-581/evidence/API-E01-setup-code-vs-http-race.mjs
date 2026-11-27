// API-E01 temporary diagnostic: when does a fresh sandbox node hand out a setup code, versus when does its published
// HTTP port first answer? Prints times only (never the code).
import { execFile } from "node:child_process";
import net from "node:net";
const image = process.argv[2];
const runs = Number(process.argv[3] ?? 3);
const sh = (cmd, args) => new Promise((r) => execFile(cmd, args, (e, out) => r({ code: e ? 1 : 0, out: String(out) })));
const SETUP = 'const s=require("net").createConnection(process.argv[1],()=>s.write("setup-code\\n"));s.setTimeout(5000,()=>process.exit(1));let d="";s.setEncoding("utf8");s.on("data",(c)=>{d+=c});s.on("end",()=>{let r={};try{r=JSON.parse(d)}catch{}if(!r.setupCode)process.exit(1);process.stdout.write("ok")});s.on("error",()=>process.exit(1))';
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
for (let i = 0; i < runs; i += 1) {
  const port = await freePort();
  const name = `api581-race-${process.pid}-${i}`;
  const t0 = Date.now();
  await sh("docker", ["run", "-d", "--rm", "--name", name, "-p", `127.0.0.1:${port}:8000`, "-e", "ENABLE_REMOTE_COLLABORATION=true",
    "-e", `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:${port}`, image]);
  let codeAt = null, httpAt = null, firstHttpError = null;
  while (Date.now() - t0 < 90_000 && (codeAt === null || httpAt === null)) {
    if (codeAt === null) { const r = await sh("docker", ["exec", name, "node", "-e", SETUP, "/home/autobyteus/data/node-access/local-control.sock"]); if (r.code === 0 && r.out === "ok") codeAt = Date.now() - t0; }
    if (httpAt === null) {
      try { const res = await fetch(`http://127.0.0.1:${port}/rest/health`); httpAt = Date.now() - t0; void res; }
      catch (e) { if (codeAt !== null && !firstHttpError) firstHttpError = String(e.cause?.code ?? e.message); }
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(JSON.stringify({ run: i, setupCodeMs: codeAt, httpAnswersMs: httpAt, httpGapAfterCodeMs: codeAt !== null && httpAt !== null ? httpAt - codeAt : null, httpErrorAfterCode: firstHttpError }));
  await sh("docker", ["rm", "-f", "-v", name]);
}
