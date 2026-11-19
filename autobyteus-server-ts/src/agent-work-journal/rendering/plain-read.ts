/**
 * A plain shell read of one file, as the converters write it (`cat`, `cat -n`, `nl`, `sed -n 'a,bp'`, `head`, with one path
 * operand, bare or quoted). It exists once for the rules that recognise a read by its path: the skill rule (`skill-load.ts`)
 * and Antigravity's MCP schema reads (`runtimes/antigravity-mcp-schema-read.ts`).
 */

const SINGLE_QUOTED = /^'((?:[^']|'\\'')*)'$/;
const DOUBLE_QUOTED = /^"((?:[^"\\$`]|\\["\\$`])*)"$/;
const BARE_WORD = /^[A-Za-z0-9_@%+=:,./~-]+$/;
const SED_RANGE = /^'\d+,(?:\d+|\$)p'$/;
const PIPE_TO_SED = /^(cat -n .+) \| sed -n '\d+,(?:\d+|\$)p'$/;

/** One shell word as the converters write it (bare, single- or double-quoted); null for anything else. */
const wordValue = (word: string): string | null => {
  if (BARE_WORD.test(word)) return word;
  const single = SINGLE_QUOTED.exec(word);
  if (single) return single[1]!.replace(/'\\''/g, "'");
  const double = DOUBLE_QUOTED.exec(word);
  return double ? double[1]!.replace(/\\(["\\$`])/g, "$1") : null;
};

/** Splits on spaces outside quotes; null when a quote is not closed. */
const shellWords = (command: string): string[] | null => {
  const words: string[] = [];
  let current = "";
  let quote: string | null = null;
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index]!;
    if (quote) {
      current += char;
      if (char === "\\" && quote === "\"" && index + 1 < command.length) current += command[++index]!;
      else if (char === quote) quote = null;
    } else if (char === "'" || char === "\"") {
      quote = char;
      current += char;
    } else if (char === " ") {
      if (current) words.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (quote) return null;
  if (current) words.push(current);
  return words;
};

/** The one path a plain read names, or null when the command does anything else. */
export const plainReadPath = (command: string): string | null => {
  const piped = PIPE_TO_SED.exec(command.trim());
  const words = shellWords(piped ? piped[1]! : command.trim());
  if (!words || words.length < 2) return null;
  const [verb, ...args] = words;
  let operands: string[];
  if (verb === "cat") operands = args[0] === "-n" ? args.slice(1) : args;
  else if (verb === "nl") operands = args;
  else if (verb === "sed") operands = args[0] === "-n" && args[1] !== undefined && SED_RANGE.test(args[1]) ? args.slice(2) : [];
  else if (verb === "head") {
    operands = args[0] === "-n" && /^\d+$/.test(args[1] ?? "") ? args.slice(2) : /^-\d+$/.test(args[0] ?? "") ? args.slice(1) : args;
  } else return null;
  if (operands.length !== 1) return null;
  return wordValue(operands[0]!);
};
