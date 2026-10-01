/**
 * Splits a filesystem path into display segments that each end with their
 * separator, so a view can offer line-break opportunities after every `/`
 * or `\` instead of breaking inside a folder name.
 */
export const pathBreakSegments = (path: string): string[] => path.match(/[^/\\]*[/\\]|[^/\\]+$/g) ?? [path]
