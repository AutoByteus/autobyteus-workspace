import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { compareReleaseVersions, isReleaseVersion } from '../release-version.mjs'

const vectors = JSON.parse(readFileSync(new URL('../../../../scripts/tests/release_version_vectors.json', import.meta.url), 'utf8'))

test('recognizes exactly the release grammar of release_versions.py', () => {
  for (const version of vectors.recognized) assert.equal(isReleaseVersion(version), true, version)
  for (const version of vectors.unrecognized) assert.equal(isReleaseVersion(version), false, JSON.stringify(version))
})

test('orders versions by semver precedence, as release_versions.py does', () => {
  const ascending = vectors.ascending
  for (let i = 0; i < ascending.length; i += 1) {
    for (let j = 0; j < ascending.length; j += 1) {
      assert.equal(Math.sign(compareReleaseVersions(ascending[i], ascending[j])), Math.sign(i - j), `${ascending[i]} vs ${ascending[j]}`)
    }
  }
})

test('refuses to order a version it does not recognize', () => {
  assert.throws(() => compareReleaseVersions('1.5.11-rc1', '1.5.11'), /Not a release version: 1.5.11-rc1/)
})
