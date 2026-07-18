const fs = require('node:fs');
const path = require('node:path');

const worktree = process.env.AUTOBYTEUS_REVALIDATION_WORKTREE;
const capturePath = process.env.AUTOBYTEUS_REVALIDATION_CAPTURE;
if (!worktree || !capturePath) {
  throw new Error('AUTOBYTEUS_REVALIDATION_WORKTREE and AUTOBYTEUS_REVALIDATION_CAPTURE are required');
}

const webRoot = path.join(worktree, 'autobyteus-web');
const electronBuilder = require(path.join(webRoot, 'node_modules', 'electron-builder'));
const generateIconsModule = require(path.join(webRoot, 'build', 'dist', 'generateIcons.js'));
const realExistsSync = fs.existsSync;

const serializeTargets = (targets) => {
  if (!(targets instanceof Map)) return targets ?? null;
  return [...targets.entries()].map(([platform, architectures]) => ({
    platform: String(platform),
    architectures: [...architectures.entries()].map(([arch, targetNames]) => ({
      arch: String(arch),
      targetNames,
    })),
  }));
};

Object.defineProperty(electronBuilder, 'build', {
  configurable: true,
  enumerable: true,
  value: async (request) => {
    const captured = {
      cwd: process.cwd(),
      publish: request.publish,
      files: request.config?.files ?? null,
      extraResources: request.config?.extraResources ?? null,
      targets: serializeTargets(request.targets),
    };
    fs.mkdirSync(path.dirname(capturePath), { recursive: true });
    fs.writeFileSync(capturePath, `${JSON.stringify(captured, null, 2)}\n`);
    return ['intercepted-electron-builder'];
  },
});

generateIconsModule.generateIcons = async () => {};

if (process.env.AUTOBYTEUS_REVALIDATION_STUB_SERVER === '1') {
  fs.existsSync = (candidate) => {
    const normalized = String(candidate).replaceAll('\\', '/');
    if (normalized === 'resources/server' || normalized.startsWith('resources/server/')) return true;
    return realExistsSync(candidate);
  };
}
