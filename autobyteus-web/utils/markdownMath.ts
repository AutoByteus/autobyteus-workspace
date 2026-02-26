/**
 * Utility helpers for normalizing LLM-style math text into delimiters that
 * markdown-it + KaTeX understand.
 */

const fenceLineRe = /^\s*```/;
const hasMathDelimiterRe = /(?:\\\[|\\\(|\$\$?)/;
// Only treat a line as "mathy" when it explicitly contains LaTeX commands.
// This avoids accidentally converting snake_case or caret usage in plain text
// into KaTeX blocks (which changes the font for entire sentences).
const latexCommandRe = /\\(frac|sqrt|sum|int|lim|alpha|beta|gamma|delta|theta|pi|sin|cos|tan|log|ln)/i;

const isFenceLine = (line: string) => fenceLineRe.test(line);
const isBracketStart = (line: string) => line.trim() === '[';
const isBracketEnd = (line: string) => line.trim() === ']';
// Support explicit LaTeX block delimiters \[  \] (common in ChatGPT/Docs output)
const isLatexBlockStart = (line: string) => line.trim() === '\\[';
const isLatexBlockEnd = (line: string) => line.trim() === '\\]';

const looksLikeLatex = (line: string) =>
  latexCommandRe.test(line);

/**
 * Normalize math so KaTeX renders it:
 * - Converts bracket blocks:
 *     [
 *       a^2 + b^2 = c^2
 *     ]
 *   into $$...$$
 * - Wraps loose LaTeX-like lines (no delimiters) in $$...$$
 * - Leaves code fences untouched
 */
export const normalizeMath = (raw: string): string => {
  const lines = raw.split('\n');
  const out: string[] = [];

  let inFence = false;
  let pendingBracket: string[] | null = null;
  let inLatexBlock = false;

  const flushBracket = () => {
    if (pendingBracket) {
      const expr = pendingBracket.join('\n').trim();
      out.push(expr ? `$$${expr}$$` : '');
      pendingBracket = null;
    }
  };

  for (const line of lines) {
    // Toggle on/off for code fences
    if (isFenceLine(line)) {
      flushBracket();
      inFence = !inFence;
      out.push(line);
      continue;
    }

    if (inFence) {
      out.push(line);
      continue;
    }

    // Handle \[ ... \] block math (do not re-wrap inner lines)
    if (isLatexBlockStart(line)) {
      flushBracket();
      inLatexBlock = true;
      out.push(line);
      continue;
    }
    if (isLatexBlockEnd(line) && inLatexBlock) {
      inLatexBlock = false;
      out.push(line);
      continue;
    }
    if (inLatexBlock) {
      out.push(line);
      continue;
    }

    if (isBracketStart(line)) {
      flushBracket();
      pendingBracket = [];
      continue;
    }

    if (isBracketEnd(line) && pendingBracket) {
      flushBracket();
      continue;
    }

    if (pendingBracket) {
      pendingBracket.push(line);
      continue;
    }

    const trimmed = line.trim();
    const hasDelimiter = hasMathDelimiterRe.test(line);

    if (!hasDelimiter && looksLikeLatex(trimmed) && trimmed) {
      out.push(`$$${trimmed}$$`);
    } else {
      out.push(line);
    }
  }

  flushBracket();
  return out.join('\n');
};

export const __testables = {
  isFenceLine,
  isBracketStart,
  isBracketEnd,
  looksLikeLatex,
};
