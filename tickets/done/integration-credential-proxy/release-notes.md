## New

- Agents can now use GitHub without ever seeing your token. In Settings → Server Settings → Basics, the new **GitHub** card lets you paste a GitHub token once. AutoByteus checks it with GitHub and stores it in its encrypted vault. The card then shows "Connected as @your-login", and the token is never shown again. **Test** checks it again, and **Remove** deletes it.
- You choose which agents may use GitHub, one checkbox per agent. In a ticked agent's runs, on every agent runtime (AutoByteus, Claude, Codex, Antigravity and Grok, also as a team member), the shell can:
  - call GitHub's API through the address in `AUTOBYTEUS_GITHUB_API_URL`, with `curl` or `gh api`;
  - use `git clone`, `fetch`, `pull` and `push` with ordinary `https://github.com/...` URLs, without being asked for credentials.
- AutoByteus adds the token on its side, for that run only and only while the run is active. Unticking an agent stops its access at once.
- Every GitHub call an agent makes is recorded (time, run, agent, method, path, result), without the token or the contents.

## Notes

- The GitHub address works only on the computer running AutoByteus, never from the network, even when Phone Access is on.
- Agents reach only GitHub's API and git hosting through it; other addresses are refused.
- Use a fine-grained token limited to the repositories your agents need.
- Nothing changes until you connect GitHub. Rolling back to an earlier version is possible; the stored token simply stays unused there.
