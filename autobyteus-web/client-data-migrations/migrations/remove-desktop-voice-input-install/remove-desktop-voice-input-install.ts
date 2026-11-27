/**
 * autobyteus-516, DEC-016 (founder, 2026-11-26): the desktop's own Voice Input install of the releases before the
 * extension foundation, `<base data folder>/extensions` (its `registry.json` in every released shape and its
 * `voice-input/` runtime and model, ~1.7 GB), is deleted once. Nothing reads it: Voice Input is installed again from
 * its card on the desktop's own node, whose extensions live in `<base data folder>/server-data/extensions`.
 *
 * Recognised by structure (the folder exists); its files are not read. The runner deletes it in the background and
 * never blocks the start; a failure (a file in use) is logged and the deletion is tried again at the next start.
 */
export const REMOVE_DESKTOP_VOICE_INPUT_INSTALL = Object.freeze({
  /** The folder under the base data folder. */
  folderName: 'extensions',
  removed: (folder: string) => `Removed the old desktop Voice Input install ${folder}; Voice Input is installed again from Settings → Extensions.`,
  failed: (folder: string, reason: string) => `Could not remove the old desktop Voice Input install ${folder}: ${reason}. It is tried again at the next start.`,
})
