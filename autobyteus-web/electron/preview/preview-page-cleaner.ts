export type PreviewReadPageCleaningMode = "none" | "light" | "thorough"

const collapseWhitespace = (value: string): string =>
  value.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()

export const cleanPreviewPageContent = (
  html: string,
  mode: PreviewReadPageCleaningMode,
): string => {
  const raw = typeof html === "string" ? html : ""
  if (mode === "none") {
    return raw
  }

  let cleaned = raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")

  if (mode === "thorough") {
    cleaned = cleaned
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
      .replace(/<canvas\b[\s\S]*?<\/canvas>/gi, "")
      .replace(/\sdata-[a-z0-9:_-]+=(["']).*?\1/gi, "")
      .replace(/\son[a-z]+=(["']).*?\1/gi, "")
  }

  return collapseWhitespace(cleaned)
}
