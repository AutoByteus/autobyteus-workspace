// Where a release's server package comes from: the GitHub release assets of tag v<version>, plain
// downloads (redirected to blob storage) that use no API quota, and the newest release of a track.
//   description  <base>/download/v<version>/autobyteus-server-<version>-linux-<arch>.json (+ .sig)
//   archive      <base>/download/v<version>/<description.archive.name>
//   stable       the tag <base>/latest redirects to
//   beta         the newest recognized release, beta or stable, in <base>.atom (the 10 newest)
import { createWriteStream } from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { compareReleaseVersions, isReleaseVersion } from './release-version.mjs'
import { fail, refuse } from './update-error.mjs'

export function descriptionName(version, arch) {
  return `autobyteus-server-${version}-linux-${arch}.json`
}

export class ReleaseSource {
  #base

  constructor({ base }) {
    this.#base = base.replace(/\/+$/, '')
  }

  #assetUrl(version, name) {
    return `${this.#base}/download/v${version}/${name}`
  }

  async #get(url, signal, options = {}) {
    try {
      return await fetch(url, { signal, ...options })
    } catch (error) {
      if (signal?.aborted) throw signal.reason
      throw fail('DOWNLOAD_FAILED', `Could not reach ${url}: ${error.cause?.message ?? error.message}`)
    }
  }

  /** The signed description of a version for this architecture: its exact bytes and its signature. */
  async fetchDescription(version, arch, signal) {
    const name = descriptionName(version, arch)
    const notPublished = () => refuse('NO_PACKAGE_FOR_VERSION',
      `No server package was published for ${version} (linux-${arch}): ${name} is missing from the release.`)
    const description = await this.#get(this.#assetUrl(version, name), signal)
    if (description.status === 404) throw notPublished()
    if (!description.ok) throw fail('DOWNLOAD_FAILED', `Downloading ${name} failed with HTTP ${description.status}.`)
    const bytes = Buffer.from(await description.arrayBuffer())
    const signature = await this.#get(this.#assetUrl(version, `${name}.sig`), signal)
    if (signature.status === 404) throw notPublished()
    if (!signature.ok) throw fail('DOWNLOAD_FAILED', `Downloading ${name}.sig failed with HTTP ${signature.status}.`)
    return { bytes, signature: (await signature.text()).trim() }
  }

  /** Downloads an archive to `file`; stops when it grows past `size`, the size its description gives. */
  async downloadArchive(version, { name, size }, file, signal) {
    const response = await this.#get(this.#assetUrl(version, name), signal)
    if (!response.ok) throw fail('DOWNLOAD_FAILED', `Downloading ${name} failed with HTTP ${response.status}.`)
    let received = 0
    const limit = new Transform({
      transform(chunk, _encoding, callback) {
        received += chunk.length
        if (received > size) callback(refuse('ARCHIVE_MISMATCH', `${name} is larger than its description says (${size} bytes).`))
        else callback(null, chunk)
      },
    })
    try {
      await pipeline(Readable.fromWeb(response.body), limit, createWriteStream(file), { signal })
    } catch (error) {
      if (signal?.aborted) throw signal.reason
      throw error.code === 'ARCHIVE_MISMATCH' ? error : fail('DOWNLOAD_FAILED', `Downloading ${name} failed: ${error.message}`)
    }
  }

  /** The release version a track stands for now. */
  async resolveTrack(track, signal) {
    if (track === 'stable') {
      const response = await this.#get(`${this.#base}/latest`, signal, { redirect: 'manual' })
      const version = /\/tag\/v([^/?#]+)$/.exec(response.headers.get('location') ?? '')?.[1]
      if (!version || !isReleaseVersion(version) || version.includes('-')) {
        throw fail('DOWNLOAD_FAILED', `Could not find the newest stable release (${this.#base}/latest answered ${response.status}).`)
      }
      return version
    }
    const response = await this.#get(`${this.#base}.atom`, signal)
    const feed = response.ok ? await response.text() : ''
    const versions = [...feed.matchAll(/\/releases\/tag\/v([^"<\s]+)/g)].map((match) => match[1]).filter(isReleaseVersion)
    if (versions.length === 0) throw fail('DOWNLOAD_FAILED', `Could not find the newest release in ${this.#base}.atom.`)
    return versions.reduce((newest, version) => (compareReleaseVersions(version, newest) > 0 ? version : newest))
  }
}
