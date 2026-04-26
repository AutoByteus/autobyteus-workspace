#!/usr/bin/env node
import { runCreateCommand } from './commands/create.js';
import { runDevCommand } from './commands/dev.js';
import { runPackCommand } from './commands/pack.js';
import { runValidateCommand } from './commands/validate.js';

const HELP = `Usage: autobyteus-app <command> [options]

Commands:
  create <dir> --id <local-id> --name <name>   Create a starter custom app project
  pack [--project-root <path>] [--out <path>]  Build dist/importable-package
  validate [--package-root <path>]             Validate a generated package root
  dev [--project-root <path>] [--port <port>]  Serve iframe-contract v3 dev host
`;

export const runCli = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
  const [command, ...args] = argv;
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    console.log(HELP);
    return;
  }
  switch (command) {
    case 'create':
      await runCreateCommand(args);
      return;
    case 'pack':
      await runPackCommand(args);
      return;
    case 'validate':
      await runValidateCommand(args);
      return;
    case 'dev':
      await runDevCommand(args);
      return;
    default:
      throw new Error(`Unknown command '${command}'.\n\n${HELP}`);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
