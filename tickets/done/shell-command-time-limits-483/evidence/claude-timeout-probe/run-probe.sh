#!/bin/bash
# Probe: does BASH_DEFAULT_TIMEOUT_MS change the foreground Bash limit of Claude Code 2.1.325?
# A: no variables -> expect auto-background at 120 s.  B: 2-hour variables -> expect a normal foreground result.
CLAUDE=/Users/normy/.local/share/claude/versions/2.1.325
PROMPT='Run exactly this one Bash command in the foreground (do not set run_in_background, do not set timeout): bash /tmp/sd483/probe/long-job.sh . Then reply with the first line of the tool result only.'
cd /tmp/sd483/probe
env -u BASH_DEFAULT_TIMEOUT_MS -u BASH_MAX_TIMEOUT_MS -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_SESSION_ID \
  "$CLAUDE" -p "$PROMPT" --model haiku --allowedTools Bash --tools Bash --output-format stream-json --verbose > A-default.jsonl 2> A-default.err &
env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_SESSION_ID \
  BASH_DEFAULT_TIMEOUT_MS=7200000 BASH_MAX_TIMEOUT_MS=7200000 \
  "$CLAUDE" -p "$PROMPT" --model haiku --allowedTools Bash --tools Bash --output-format stream-json --verbose > B-2h.jsonl 2> B-2h.err &
wait
echo done
