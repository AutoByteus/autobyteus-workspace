import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

export class ContextFilePathUnavailableError extends Error {}

const assertContainedRegularFile = (memoryDir: string, file: string, root: string, actual: string, regular: boolean): void => {
  if (actual !== path.resolve(root, path.relative(memoryDir, file)) || !actual.startsWith(`${root}${path.sep}`) || !regular) {
    throw new ContextFilePathUnavailableError(`Not a contained regular context file: '${file}'.`);
  }
};

/** The configured root may itself be a symlink; descendants may not redirect ownership. */
export async function assertContainedContextFile(memoryDir: string, file: string): Promise<void> {
  assertContainedRegularFile(memoryDir, file, await fsp.realpath(memoryDir), await fsp.realpath(file), (await fsp.lstat(file)).isFile());
}

export function assertContainedContextFileSync(memoryDir: string, file: string): void {
  assertContainedRegularFile(memoryDir, file, fs.realpathSync(memoryDir), fs.realpathSync(file), fs.lstatSync(file).isFile());
}
