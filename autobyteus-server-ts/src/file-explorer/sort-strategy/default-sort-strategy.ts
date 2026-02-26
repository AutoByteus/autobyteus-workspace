import type { DirectoryEntry, SortStrategy } from "./sort-strategy.js";

export class DefaultSortStrategy implements SortStrategy {
  sort(entries: DirectoryEntry[]): DirectoryEntry[] {
    return [...entries].sort((left, right) => {
      const leftIsDir = left.isDirectory();
      const rightIsDir = right.isDirectory();
      if (leftIsDir !== rightIsDir) {
        return leftIsDir ? -1 : 1;
      }
      return left.name.toLowerCase().localeCompare(right.name.toLowerCase());
    });
  }
}
