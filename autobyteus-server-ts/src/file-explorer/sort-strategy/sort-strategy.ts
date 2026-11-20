export type DirectoryEntry = {
  name: string;
  path: string;
  isFile: () => boolean;
  isDirectory: () => boolean;
  /** Only from a traversal that does not follow links: a link, listed and never entered. */
  isSymbolicLink?: () => boolean;
};

export interface SortStrategy {
  sort(entries: DirectoryEntry[]): DirectoryEntry[];
}
