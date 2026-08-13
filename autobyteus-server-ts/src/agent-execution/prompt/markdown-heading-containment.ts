const ATX_HEADING = /^( {0,3})(#{1,6})(?:[ \t]+)(.*)$/;
const OPENING_FENCE = /^( {0,3})(`{3,}|~{3,})(.*)$/;

type Heading = { index: number; indent: string; level: number; text: string };

const isActiveFenceClose = (
  line: string,
  marker: "`" | "~",
  openingLength: number,
): boolean => {
  const close = line.match(/^( {0,3})(`+|~+)[ \t]*$/);
  return Boolean(
    close && close[2][0] === marker && close[2].length >= openingLength,
  );
};

export const containAuthoredMarkdownHeadings = (
  authoredMarkdown: string,
  containingHeadingLevel: number,
): string => {
  const lines = authoredMarkdown.split("\n");
  const headings: Heading[] = [];
  let fenceMarker: "`" | "~" | null = null;
  let fenceLength = 0;

  lines.forEach((line, index) => {
    if (fenceMarker) {
      if (isActiveFenceClose(line, fenceMarker, fenceLength)) {
        fenceMarker = null;
        fenceLength = 0;
      }
      return;
    }

    const openingFence = line.match(OPENING_FENCE);
    if (openingFence) {
      fenceMarker = openingFence[2][0] as "`" | "~";
      fenceLength = openingFence[2].length;
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
