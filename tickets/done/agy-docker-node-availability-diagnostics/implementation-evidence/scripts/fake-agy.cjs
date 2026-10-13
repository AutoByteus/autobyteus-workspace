#!/usr/bin/env node
// Scripted agy for the rendered check: state file decides signed-out vs signed-in.
const fs = require('node:fs')
const state = fs.readFileSync(process.env.AGY_RENDER_STATE, 'utf8').trim()
const arg = process.argv[2]
if (arg === '--version') process.stdout.write('1.3.3\n')
else if (arg === '--help') process.stdout.write('--agent --new-project --add-dir --conversation --input-format --output-format --dangerously-skip-permissions\n')
else if (arg === 'models') {
  if (state === 'signed-out') { process.stderr.write('Error: Please sign in to view available models. Launch the CLI without arguments to sign in.\n'); process.exitCode = 1 }
  else process.stdout.write('gemini-3-pro\tGemini 3 Pro\ngemini-3-flash\tGemini 3 Flash\n')
}
