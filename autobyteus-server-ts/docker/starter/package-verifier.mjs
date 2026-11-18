// Verification of a server package before it can run (C3), in this order:
//   1. the Ed25519 signature over the description's exact bytes, with the image's public key;
//   2. binding: the signed description is for the requested version, this architecture and asset name;
//   3. fit: this image's Node module version and system level;
//   4. after download, the archive's SHA-256 and size;
//   5. after unpack, the package's own server-package.json equals the description without `archive`.
// The reader is strict: a description without the fields it needs is refused.
import { createHash, createPublicKey, verify } from 'node:crypto'
import { createReadStream, readFileSync } from 'node:fs'
import path from 'node:path'
import { isReleaseVersion } from './release-version.mjs'
import { misfitReason } from './system-facts.mjs'
import { refuse } from './update-error.mjs'

export function archiveName(version, arch) {
  return `autobyteus-server-${version}-linux-${arch}.tar.gz`
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(file).on('error', reject).on('data', (chunk) => hash.update(chunk)).on('end', () => resolve(hash.digest('hex')))
  })
}

const sameJson = (a, b) => JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort())

export class PackageVerifier {
  #publicKey

  constructor({ publicKeyFile }) {
    this.#publicKey = createPublicKey(readFileSync(publicKeyFile))
  }

  /** Steps 1 and 2: returns the parsed description, signed by AutoByteus and bound to this request. */
  verifyDescription({ bytes, signature }, requestedVersion, arch) {
    let valid = false
    try {
      valid = verify(null, bytes, this.#publicKey, Buffer.from(signature, 'base64'))
    } catch {
      valid = false
    }
    if (!valid) throw refuse('SIGNATURE_INVALID', `The package description for ${requestedVersion} is not signed by AutoByteus.`)

    let description
    try {
      description = JSON.parse(bytes.toString('utf8'))
    } catch {
      throw refuse('DESCRIPTION_MISMATCH', `The signed description for ${requestedVersion} is not readable.`)
    }
    const { archive } = description ?? {}
    const complete = isReleaseVersion(description?.version) && typeof description.arch === 'string'
      && typeof description.nodeModuleVersion === 'string' && Number.isInteger(description.systemLevel)
      && Array.isArray(description.dataMigrations) && typeof archive?.name === 'string'
      && /^[0-9a-f]{64}$/.test(archive.sha256 ?? '') && Number.isInteger(archive.size) && Number.isInteger(archive.unpackedSize)
    if (!complete) throw refuse('DESCRIPTION_MISMATCH', `The signed description for ${requestedVersion} lacks required fields.`)
    const expectedName = archiveName(requestedVersion, arch)
    if (description.version !== requestedVersion || description.arch !== arch || archive.name !== expectedName) {
      throw refuse('DESCRIPTION_MISMATCH',
        `The signed description is for ${description.version} linux-${description.arch} (${archive.name}), ` +
        `not for ${requestedVersion} linux-${arch} (${expectedName}).`)
    }
    return description
  }

  /** Step 3: refuses a package this image cannot run, naming the image that can. */
  checkFit(description, facts) {
    const misfit = misfitReason(description, facts)
    if (misfit) {
      throw refuse('NEEDS_NEW_IMAGE', `This update needs a new Docker image: ${misfit}. ` +
        `Get it with: autobyteus-docker upgrade --all --tag ${description.version}`)
    }
  }

  /** Step 4. */
  async verifyArchive(file, description) {
    if (await sha256(file) !== description.archive.sha256) {
      throw refuse('ARCHIVE_MISMATCH', `${description.archive.name} does not match its signed description.`)
    }
  }

  /** Step 5. */
  matchPackage(packageDir, description) {
    const { archive, ...expected } = description
    let packageJson
    try {
      packageJson = JSON.parse(readFileSync(path.join(packageDir, 'server-package.json'), 'utf8'))
    } catch {
      packageJson = null
    }
    if (!packageJson || !sameJson(packageJson, expected)) {
      throw refuse('DESCRIPTION_MISMATCH', `The unpacked ${archive.name} does not hold the package its description describes.`)
    }
  }
}
