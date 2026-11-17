## Commands start reliably when the computer is busy

- An agent on the AutoByteus runtime no longer gets "Command did not start: Command control deadline exceeded" for a command that would have started. When many commands start at once on a busy computer, each now has up to 30 seconds to start (before, 1.5 seconds), or the command's own timeout when that is shorter. We tested 200 commands starting at once on a heavily loaded Mac: none failed.
- When a command really does not start in time, the message now says how long it was given and why: "Command did not start within 30 s: ...".
- Stopping a command that is still starting ends the call as a stop, as it does for a running command, instead of reporting a failed start.
- Stopping or cleaning up a command waits longer for it to be confirmed gone (up to 30 seconds, before 3), so a command is less often reported as not confirmed stopped on a busy computer. On a very busy computer, a call that was cut short while starting can therefore take several seconds to return.
