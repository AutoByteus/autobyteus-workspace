/** Linux native installation assets; the real Electron ELF is never renamed. */
import * as fs from 'fs'
import * as path from 'path'
import { execFileSync } from 'child_process'
import { Arch, type AfterPackContext } from 'electron-builder'

export function packLinuxInstall(context: AfterPackContext): void {
  const artifact = context.packager.platformSpecificBuildOptions.artifactName
  // The approved trust domain is the personal desktop, not enterprise distribution.
  if (typeof artifact !== 'string' || !artifact.startsWith('AutoByteus_personal_')) return
  const arch = context.arch === Arch.x64 ? 'x64' : context.arch === Arch.arm64 ? 'arm64' : null
  if (!arch || arch !== process.arch) throw new Error('Linux installation assets require a native target')
  const publicKeyFile = process.env.AUTOBYTEUS_DESKTOP_PUBLIC_KEY_FILE
  if (!publicKeyFile) throw new Error('Desktop release public key must be provisioned before Linux packaging')
  const executable = fs.openSync(path.join(context.appOutDir, 'autobyteus'), 'r')
  const magic = Buffer.alloc(4)
  try { fs.readSync(executable, magic, 0, 4, 0) } finally { fs.closeSync(executable) }
  if (!magic.equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) throw new Error('Linux Electron ELF is missing')
  const version = context.packager.appInfo.version
  const canonicalAsset = artifact.replace('${version}', version).replace('${ext}', 'AppImage').replace('${arch}', arch)
  const nativeOutput = path.resolve('linux-install/out')
  execFileSync(process.execPath, [path.resolve('../scripts/desktop-package/build-native.mjs'),
    version, arch, path.resolve(publicKeyFile), nativeOutput, canonicalAsset], { stdio: 'inherit' })
  for (const name of ['AppRun', 'autobyteus-provision', 'autobyteus-install-client', 'managed-restart.node']) {
    fs.copyFileSync(path.join(nativeOutput, name), path.join(context.appOutDir, name))
    fs.chmodSync(path.join(context.appOutDir, name), 0o755)
  }
  fs.copyFileSync(path.join(nativeOutput, 'identity.json'), path.join(context.appOutDir, 'resources', 'linux-install-identity.json'))
}
