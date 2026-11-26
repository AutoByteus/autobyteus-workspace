/**
 * The icon of a file in a file list (the Files panel, the Skills page, the Memory reader), by its kind
 * (autobyteus-608 DC-011, DEC-003): local Iconify icons, so each one shows. Markdown is a document outline; the code
 * kinds are the file-type icons the app shows for the same kinds elsewhere (`ArtifactItem.vue`). Other files keep the
 * list's plain file outline (null). The names are literals: `scripts/build-icon-bundle.mjs` bundles them.
 */
export interface FileItemIcon {
  icon: string;
  /** Tailwind classes for the icon's colour; the file-type icons carry their own. */
  tone: string;
}

const BY_EXTENSION: Record<string, FileItemIcon> = {
  md: { icon: 'heroicons:document-text', tone: 'text-blue-500/80' },
  js: { icon: 'vscode-icons:file-type-js', tone: '' },
  ts: { icon: 'vscode-icons:file-type-typescript', tone: '' },
  vue: { icon: 'vscode-icons:file-type-vue', tone: '' },
  html: { icon: 'vscode-icons:file-type-html', tone: '' },
  css: { icon: 'vscode-icons:file-type-css', tone: '' },
  json: { icon: 'vscode-icons:file-type-json', tone: '' },
};

export const fileItemIcon = (fileName: string): FileItemIcon | null => {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? BY_EXTENSION[fileName.slice(dot + 1).toLowerCase()] ?? null : null;
};

/** The drag preview's icon for a file. */
export const DRAG_PREVIEW_FILE_ICON = 'heroicons:document';
