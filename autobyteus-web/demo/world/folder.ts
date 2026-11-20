/**
 * The demo's one folder (autobyteus-279, REQ-004), `demo-workspace` at `DEMO_WORKSPACE_ROOT`: the files of
 * `content/files.ts`, answered in the node's shapes. A folder lists its immediate children as the node's
 * `folderChildren` does (`TreeNode.toShallowDict(1)`); a file reads as its text, a picture as its SVG. A path the folder
 * does not have is the node's refusal, never invented content.
 */
import { DEMO_FILES, demoImageFor } from './content/files';
import { DEMO_WORKSPACE_ROOT } from './DemoWorld';

type FolderDict = { id: string; name: string; path: string; is_file: boolean; children: FolderDict[]; children_loaded: boolean };

const ROOT_NAME = DEMO_WORKSPACE_ROOT.split('/').pop()!;
const PICTURE = /\.(png|jpe?g|svg)$/i;

const normalized = (relative: string): string => relative.replace(/^\/+|\/+$/g, '');
const idOf = (relative: string): string => `demo-folder:${relative || ROOT_NAME}`;

const isFile = (relative: string): boolean => Object.hasOwn(DEMO_FILES, relative);
const isFolder = (relative: string): boolean => relative === '' || Object.keys(DEMO_FILES).some((path) => path.startsWith(`${relative}/`));

/** The folder's immediate children: folders first, then by name, ignoring case (the node's `DefaultSortStrategy`). */
const childrenOf = (relative: string): FolderDict[] => {
  const prefix = relative ? `${relative}/` : '';
  const names = new Map<string, boolean>();
  for (const path of Object.keys(DEMO_FILES)) {
    if (!path.startsWith(prefix)) continue;
    const [name, ...rest] = path.slice(prefix.length).split('/');
    names.set(name!, (names.get(name!) ?? false) || rest.length > 0);
  }
  return [...names].sort(([a, aFolder], [b, bFolder]) => Number(bFolder) - Number(aFolder) || a.toLowerCase().localeCompare(b.toLowerCase())).map(([name, folder]) => {
    const path = `${prefix}${name}`;
    return { id: idOf(path), name, path, is_file: !folder, children: [], children_loaded: !folder };
  });
};

/** `folderChildren` (a JSON string): the folder and its immediate children, or the node's error. */
export const folderChildrenJson = (folderPath: string): string => {
  const relative = normalized(folderPath);
  if (isFile(relative)) return JSON.stringify({ error: `Path is a file, not a folder: ${folderPath}` });
  if (!isFolder(relative)) return JSON.stringify({ error: `Folder not found: ${folderPath}` });
  const name = relative ? relative.split('/').pop()! : ROOT_NAME;
  return JSON.stringify({ id: idOf(relative), name, path: relative || ROOT_NAME, is_file: false, children: childrenOf(relative), children_loaded: true } satisfies FolderDict);
};

/** `fileContent`: a file's text, or the node's error (as a JSON string, as the node answers). */
export const fileContentText = (filePath: string): string => {
  const relative = normalized(filePath);
  if (!isFile(relative)) return JSON.stringify({ error: `File not found: ${filePath}` });
  return PICTURE.test(relative) ? demoImageFor(relative) : DEMO_FILES[relative]!;
};

/** `searchFiles`: the files whose path holds the query, workspace-relative (the node's locators). */
export const searchFolder = (query: string): string[] => {
  const asked = query.trim().toLowerCase();
  return asked ? Object.keys(DEMO_FILES).filter((path) => path.toLowerCase().includes(asked)).sort() : [];
};

export type FolderFile = Readonly<{ mimeType: string; body: string }>;

/** A file of the folder by its workspace-relative path, with its type; null when the folder has no such file. */
export const folderFile = (relativePath: string): FolderFile | null => {
  const relative = normalized(relativePath);
  if (!isFile(relative)) return null;
  if (PICTURE.test(relative)) return { mimeType: 'image/svg+xml', body: demoImageFor(relative) };
  const mimeType = relative.endsWith('.md') ? 'text/markdown; charset=utf-8' : relative.endsWith('.csv') ? 'text/csv; charset=utf-8' : 'text/plain; charset=utf-8';
  return { mimeType, body: DEMO_FILES[relative]! };
};

/** The node-files route's view: an absolute path inside the folder, as its relative path; null outside it. */
export const relativeToFolder = (absolutePath: string): string | null =>
  absolutePath === DEMO_WORKSPACE_ROOT ? '' : absolutePath.startsWith(`${DEMO_WORKSPACE_ROOT}/`) ? absolutePath.slice(DEMO_WORKSPACE_ROOT.length + 1) : null;

export const isFolderPath = (relativePath: string): boolean => isFolder(normalized(relativePath));
