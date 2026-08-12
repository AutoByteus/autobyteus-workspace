const ATX_HEADING = /^( {0,3})(#{1,6})(?:[ \t]+)(.*)$/;
const FENCE = /^( {0,3})(`{3,}|~{3,})/;

type Heading = { index: number; indent: string; level: number; text: string };

export const containAuthoredMarkdownHeadings = (
  authoredMarkdown: string,
  containingHeadingLevel: number,
): string => {
  const lines = authoredMarkdown.split("\n");
  const headings: Heading[] = [];
  let fenceMarker: "`" | "~" | null = null;
  let fenceLength = 0;

  lines.forEach((line, index) => {
    const fence = line.match(FENCE);
    if (fence) {
      const marker = fence[2][0] as "`" | "~";
      if (!fenceMarker) {
        fenceMarker = marker;
        fenceLength = fence[2].length;
      } else if (marker === fenceMarker && fence[2].length >= fenceLength) {
        fenceMarker = null;
        fenceLength = 0;
      }
      return;
    }
    if (fenceMarker) {
      return;
    }
    const match = line.match(ATX_HEADING);
    if (match) {
      headings.push({ index, indent: match[1], level: match[2].length, text: match[3] });
    }
  });

  if (headings.length === 0) {
    return authoredMarkdown;
  }
  const smallestLevel = Math.min(...headings.map((heading) => heading.level));
  const shift = Math.max(0, containingHeadingLevel + 1 - smallestLevel);
  if (shift === 0) {
    return authoredMarkdown;
  }
  for (const heading of headings) {
    const shiftedLevel = heading.level + shift;
    const text = heading.text.replace(/[ \t]+#+[ \t]*$/, "").trimEnd();
    lines[heading.index] = shiftedLevel <= 6
      ? `${heading.indent}${"#".repeat(shiftedLevel)} ${text}`
      : `${heading.indent}**${text}**`;
  }
  return lines.join("\n");
};
