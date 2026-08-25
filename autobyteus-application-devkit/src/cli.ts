#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const HELP = `Usage: autobyteus-app <command> [options]

Commands:
  create <dir> --id <local-id> --name <name>   Create a starter custom app project
  pack [--project-root <path>] [--out <path>]  Build dist/importable-package
  validate [--package-root <path>]             Validate a generated package root
  dev [--host standalone|studio] [options]      Build/watch in a real application host
  start [--project-root <path>] [options]      Run an existing build standalone
`;

export const runCli = async (argv: string[] = process.argv.slice(2)): Promise<void> => {
  const [command, ...args] = argv;
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    console.log(HELP);
    return;
  }
  switch (command) {
    case 'create':
      const { runCreateCommand } = await import('./commands/create.js');
      await runCreateCommand(args);
      return;
    case 'pack':
      const { runPackCommand } = await import('./commands/pack.js');
      await runPackCommand(args);
      return;
    case 'validate':
      const { runValidateCommand } = await import('./commands/validate.js');
      await runValidateCommand(args);
      return;
    case 'dev':
      const { runDevCommand } = await import('./commands/dev.js');
      await runDevCommand(args);
      return;
    case 'start':
      const { runStartCommand } = await import('./commands/start.js');
      await runStartCommand(args);
      return;
    default:
      throw new Error(`Unknown command '${command}'.\n\n${HELP}`);
  }
};

const invokedModuleUrl = process.argv[1]
  ? pathToFileURL(realpathSync(process.argv[1])).href
  : '';
if (import.meta.url === invokedModuleUrl) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
