// The starter's log: one JSON line per event on stdout, which supervisord keeps with the server's
// output. Callers pass only names, versions, codes and paths; the starter handles no secrets.
export function starterLog(event, fields = {}) {
  process.stdout.write(`${JSON.stringify({ time: new Date().toISOString(), starter: event, ...fields })}\n`)
}
