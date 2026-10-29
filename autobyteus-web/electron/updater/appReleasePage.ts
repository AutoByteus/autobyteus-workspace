import * as fs from 'fs';

const GITHUB_SEGMENT = /^[A-Za-z0-9_.-]+$/;

/** The top-level `key: value` pairs of electron-builder's `app-update.yml` (a flat file). */
function readFlatYaml(text: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Za-z]+):\s*(.*?)\s*$/.exec(line);
    if (match) values.set(match[1]!, match[2]!.replace(/^(['"])(.*)\1$/, '$2'));
  }
  return values;
}

/**
 * The GitHub release page of `version`, from the packaged publish config (`app-update.yml`:
 * provider github → `https://github.com/<owner>/<repo>/releases/tag/v<version>`). Null when the
 * config is missing or is not a GitHub feed.
 */
export function resolveAppReleasePageUrl(appUpdateConfigPath: string, version: string): string | null {
  let text: string;
  try {
    text = fs.readFileSync(appUpdateConfigPath, 'utf8');
  } catch {
    return null;
  }
  const config = readFlatYaml(text);
  const owner = config.get('owner');
  const repo = config.get('repo');
  if (config.get('provider') !== 'github' || !owner || !repo || !GITHUB_SEGMENT.test(owner) || !GITHUB_SEGMENT.test(repo)) {
    return null;
  }
  return `https://github.com/${owner}/${repo}/releases/tag/v${encodeURIComponent(version)}`;
}
