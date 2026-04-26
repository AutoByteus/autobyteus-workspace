export type ParsedCommandOptions = {
  positionals: string[];
  flags: Record<string, string | boolean>;
};

export const parseCommandOptions = (args: string[]): ParsedCommandOptions => {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const [rawName, inlineValue] = arg.slice(2).split(/=(.*)/s, 2);
    const name = rawName.trim();
    if (!name) {
      continue;
    }
    if (inlineValue !== undefined) {
      flags[name] = inlineValue;
      continue;
    }
    const nextArg = args[index + 1];
    if (nextArg && !nextArg.startsWith('--')) {
      flags[name] = nextArg;
      index += 1;
      continue;
    }
    flags[name] = true;
  }
  return { positionals, flags };
};

export const readStringFlag = (
  options: ParsedCommandOptions,
  name: string,
): string | null => {
  const value = options.flags[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

export const readBooleanFlag = (
  options: ParsedCommandOptions,
  name: string,
): boolean => options.flags[name] === true;

export const readPortFlag = (
  options: ParsedCommandOptions,
  name: string,
): number | null => {
  const value = readStringFlag(options, name);
  if (!value) {
    return null;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`--${name} must be a TCP port number.`);
  }
  return port;
};
