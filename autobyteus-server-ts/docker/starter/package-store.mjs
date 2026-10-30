// The layout of the server-packages folder and its state.json, and the boot selection of the package
// this node runs.
//
//   <root>/state.json            { current, previous?, trial? }; each entry { source, version },
//                                source "builtIn" (the image's package) or "installed" (packages/<version>)
//   <root>/packages/<version>/   installed server packages; packages/.<version>.partial while unpacking
//   <root>/downloads/            archives being downloaded
//   <root>/self-check-*/         a self-check's temporary environment
import { readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { compareReleaseVersions } from './release-version.mjs'
import { readJsonFile, writeJsonFile } from './state-file.mjs'
import { misfitReason } from './system-facts.mjs'

export class PackageStore {
  #root
  #builtInDir
  #log

  constructor({ root, builtInDir, log }) {
    this.#root = root
    this.#builtInDir = builtInDir
    this.#log = log
  }

  get #statePath() {
    return path.join(this.#root, 'state.json')
  }

  readState() {
    return readJsonFile(this.#statePath) ?? {}
  }

  #writeState(state) {
    writeJsonFile(this.#statePath, state)
  }

  /** An interrupted trial ends: the version that ran before it is current again. */
  rollBackTrial() {
    const { trial, ...state } = this.readState()
    this.#writeState({ ...state, current: trial.previous })
  }

  /** Removes what an interrupted download, unpack or self-check left behind. */
  removeLeftovers() {
    const removed = []
    const remove = (target) => {
      rmSync(target, { recursive: true, force: true })
      removed.push(path.relative(this.#root, target))
    }
    for (const name of this.#list(this.#root)) if (name.startsWith('self-check-')) remove(path.join(this.#root, name))
    for (const name of this.#list(path.join(this.#root, 'downloads'))) remove(path.join(this.#root, 'downloads', name))
    for (const name of this.#list(path.join(this.#root, 'packages'))) {
      if (name.startsWith('.') && name.endsWith('.partial')) remove(path.join(this.#root, 'packages', name))
    }
    if (removed.length > 0) this.#log('leftovers-removed', { paths: removed })
  }

  #list(folder) {
    try {
      return readdirSync(folder)
    } catch (error) {
      if (error.code === 'ENOENT') return []
      throw error
    }
  }

  #packageDir({ source, version }) {
    return source === 'builtIn' ? this.#builtInDir : path.join(this.#root, 'packages', version)
  }

  /** The package of a state entry, or null when it is not on disk as that version. */
  #readPackage(entry) {
    const dir = this.#packageDir(entry)
    let packageJson
    try {
      packageJson = readJsonFile(path.join(dir, 'server-package.json'))
    } catch {
      return null
    }
    return packageJson?.version === entry.version ? { dir, source: entry.source, version: entry.version, packageJson } : null
  }

  /**
   * The boot selection. With N the newest version that already ran on this node (state.current):
   * run the installed package when it fits this image and is not older than the built-in one;
   * else run the built-in package when it fits and is not older than N (it becomes current);
   * else refuse with NEEDS_NEW_IMAGE, because this image can only run a version older than N.
   */
  choose(facts) {
    const builtInJson = readJsonFile(path.join(this.#builtInDir, 'server-package.json'))
    const builtIn = { dir: this.#builtInDir, source: 'builtIn', version: builtInJson.version, packageJson: builtInJson }
    const state = this.readState()
    const current = state.current

    if (current?.source === 'installed') {
      const installed = this.#readPackage(current)
      const misfit = installed ? misfitReason(installed.packageJson, facts) : 'it is missing'
      if (!misfit && compareReleaseVersions(installed.version, builtIn.version) >= 0) {
        return { outcome: 'run', package: installed }
      }
      this.#log('installed-package-not-chosen', { version: current.version, reason: misfit ?? `the image has ${builtIn.version}` })
    }

    const builtInMisfit = misfitReason(builtInJson, facts)
    if (!builtInMisfit && (!current || compareReleaseVersions(builtIn.version, current.version) >= 0)) {
      if (current?.source !== 'builtIn' || current.version !== builtIn.version) {
        this.#writeState({ ...state, current: { source: 'builtIn', version: builtIn.version } })
      }
      return { outcome: 'run', package: builtIn }
    }

    if (builtInMisfit) this.#log('built-in-package-does-not-fit', { version: builtIn.version, reason: builtInMisfit })
    const newest = current?.version ?? builtIn.version
    return {
      outcome: 'needsNewImage',
      newest,
      message: `This node already ran ${newest}; this image can run only ${builtIn.version}. ` +
        `Use an image of version ${newest} or newer: autobyteus-docker upgrade --all --tag ${newest}`,
    }
  }
}
