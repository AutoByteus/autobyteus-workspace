#!/bin/sh
# Scripted AGY CLI for the isolated instance: the repository fixture with AGY_FAKE_CASE=linked_skills.
# Set as the instance's ANTIGRAVITY_CLI_COMMAND server setting. Logs each launch (argv, cwd) for the journey script.
export AGY_FAKE_CASE=linked_skills
export AGY_FAKE_ARGV_LOG="/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/evidence/api-e2e/app/agy-argv.log"
exec "/Users/normy/.local/bin/node" "/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" "$@"
