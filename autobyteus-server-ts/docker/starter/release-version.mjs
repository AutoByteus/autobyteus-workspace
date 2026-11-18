// Release-version grammar and ordering: X.Y.Z or X.Y.Z-beta.N (no leading zeros, N >= 1), semver
// precedence (X.Y.Z-beta.N < X.Y.Z, betas by N). The same rules as scripts/release_versions.py; both
// are tested against scripts/tests/release_version_vectors.json. Node built-ins only.
const RELEASE_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-beta\.([1-9]\d*))?$/

/** The parts of a recognized release version, or null. */
function parse(version) {
  const match = typeof version === 'string' ? RELEASE_VERSION.exec(version) : null
  if (!match) return null
  const [major, minor, patch] = match.slice(1, 4).map(Number)
  // A stable release sorts after every beta of its core version.
  return [major, minor, patch, match[4] === undefined ? Infinity : Number(match[4])]
}

export function isReleaseVersion(version) {
  return parse(version) !== null
}

/** Negative, zero or positive as a is older than, the same as or newer than b. Both must be recognized. */
export function compareReleaseVersions(a, b) {
  const left = parse(a)
  const right = parse(b)
  if (!left || !right) throw new Error(`Not a release version: ${left ? b : a}`)
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1
  }
  return 0
}
