export type DirectoryEntry = {
  name: string;
  path: string;
  isFile: () => boolean;
  isDirectory: () => boolean;
};

export interface SortStrategy {
  sort(entries: DirectoryEntry[]): DirectoryEntry[];
}
