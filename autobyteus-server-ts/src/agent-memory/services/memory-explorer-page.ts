import type { MemoryExplorerPage } from "../domain/models.js";

export const normalizeMemoryExplorerSearch = (value?: string | null): string =>
  (value ?? "").trim().toLowerCase();

export const includesMemoryExplorerQuery = (
  value: string | null | undefined,
  query: string,
): boolean => Boolean(value && value.toLowerCase().includes(query));

export const pageMemoryExplorerEntries = <T>(
  entries: T[],
  page: number,
  pageSize: number,
): MemoryExplorerPage<T> => {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const total = entries.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const start = (safePage - 1) * safePageSize;
  return {
    entries: entries.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
};
