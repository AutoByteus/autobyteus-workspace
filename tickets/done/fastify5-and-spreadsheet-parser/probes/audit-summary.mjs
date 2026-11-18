// Reads `pnpm audit --json` from stdin and prints one line per advisory: severity, package, id, paths count.
let raw = ''; process.stdin.on('data', d => raw += d).on('end', () => {
  const j = JSON.parse(raw);
  const rows = Object.values(j.advisories || {}).map(a => `${a.severity.padEnd(9)} ${a.module_name}@${(a.findings||[]).map(f=>f.version).join(',')} ${a.github_advisory_id} (paths: ${(a.findings||[]).reduce((n,f)=>n+(f.paths||[]).length,0)})`);
  rows.sort(); console.log(rows.join('\n')); console.log('TOTAL', JSON.stringify(j.metadata?.vulnerabilities));
});
