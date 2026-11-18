// A probe's evidence folder (autobyteus-318). Evidence is never overwritten (TESTING.md):
// - without `--output-dir`, every run writes to a fresh folder, `test-results/<name>-<UTC timestamp>`, so the package
//   script can run again without removing anything;
// - an explicit `--output-dir` must be missing or empty: a non-empty one is refused and left as it is.
import fs from 'node:fs';
import path from 'node:path';

/** The probe's output folder: the explicit `--output-dir` (relative to `webDir`), else a fresh per-run folder. */
export function probeOutputDir(webDir, name, explicit) {
  if (explicit) return path.resolve(webDir, explicit);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-'); // e.g. 2026-11-01T10-15-30-123Z
  return path.join(webDir, 'test-results', `${name}-${stamp}`);
}

/** Creates the folder and returns it; refuses (a message naming it, exit 1) when it already holds files. */
export function prepareOutputDir(dir) {
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  if (entries.length > 0) {
    console.error(`Refusing to write probe evidence into ${dir}: it is not empty (${entries.length} entries), and `
      + 'earlier evidence is never overwritten. Pass a fresh --output-dir, or omit it for a new per-run folder.');
    process.exit(1);
  }
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
