import { execFileSync } from 'node:child_process'

/** The environment variable that overrides the time (ISO 8601) when an older commit is rebuilt. */
export const NPM_BEFORE_ENV = 'AUTOBYTEUS_NPM_BEFORE'

const ISO_8601 = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/

function commitTimeOfHead(workspaceRoot) {
  return execFileSync('git', ['-C', workspaceRoot, 'log', '-1', '--format=%cI'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

/**
 * The time bound of the Windows staging `npm install` (`--before=<time>`): npm takes no package published after it, so a
 * package published after the commit cannot enter the build. `AUTOBYTEUS_NPM_BEFORE` (ISO 8601) wins, for a rebuild of an
 * older commit; otherwise the commit time of the workspace HEAD. With neither, the build stops: an unbounded install is
 * not an acceptable fallback.
 *
 * @param {{ env: Record<string, string | undefined>, workspaceRoot: string, commitTime?: (workspaceRoot: string) => string }} input
 */
export function resolveNpmBefore({ env, workspaceRoot, commitTime = commitTimeOfHead }) {
  const override = env[NPM_BEFORE_ENV]?.trim()
  if (override) {
    if (!ISO_8601.test(override) || Number.isNaN(Date.parse(override))) {
      throw new Error(
        `${NPM_BEFORE_ENV}='${override}' is not an ISO 8601 date or time (for example 2026-11-01T09:12:44+01:00).`
      )
    }
    return override
  }

  let time = ''
  try {
    time = commitTime(workspaceRoot)
  } catch (error) {
    throw new Error(
      `Cannot bound the staging npm install: the commit time of ${workspaceRoot} could not be read (${error.message}). ` +
        `Set ${NPM_BEFORE_ENV} to an ISO 8601 time.`
    )
  }
  if (!time || Number.isNaN(Date.parse(time))) {
    throw new Error(
      `Cannot bound the staging npm install: no commit time for ${workspaceRoot}. Set ${NPM_BEFORE_ENV} to an ISO 8601 time.`
    )
  }
  return time
}
