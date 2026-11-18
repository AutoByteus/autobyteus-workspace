/**
 * The skill rule (contract §5): a plain read of one `SKILL.md` file inside a skills folder is a
 * skill load, whichever runtime or tool did the read. It works on the neutral command every
 * runtime table already produces (`cat`, `cat -n`, `sed -n`, `head`), so it exists once.
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
const plainReadPath = (command: string): string | null => {
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

const isSkillsFolder = (name: string): boolean => name.endsWith("skills");

/** `<skills folder>/<name>/SKILL.md`, or `<skills folder>/.system/<name>/SKILL.md`. */
const skillNameOfPath = (path: string): string | null => {
  const parts = path.split("/").filter((part) => part.length > 0);
  if (parts.length < 3 || parts[parts.length - 1] !== "SKILL.md") return null;
  const name = parts[parts.length - 2]!;
  const folder = parts[parts.length - 3]!;
  const underSystem = folder === ".system" && parts.length >= 4 && isSkillsFolder(parts[parts.length - 4]!);
  return name.length > 0 && (isSkillsFolder(folder) || underSystem) ? name : null;
};

/** The skill a command loads, or null when the command is not a plain read of a skill file. */
export const skillNameOfPlainRead = (command: string): string | null => {
  const path = plainReadPath(command);
  return path === null ? null : skillNameOfPath(path);
};
