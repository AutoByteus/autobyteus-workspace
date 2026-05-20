export function toPrismaSqliteUrl(filePath: string): string {
  return `file:${filePath.replace(/\\/g, '/')}`
}
