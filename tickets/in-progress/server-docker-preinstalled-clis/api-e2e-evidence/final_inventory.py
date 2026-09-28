"""Read-only final image inventory/auth-scope check; no token values emitted."""
import json, subprocess
images=['autobyteus-cli-api001:'+s for s in ['default-arm64','zh-arm64','default-amd64','zh-amd64','default-arm64-refresh']]
probe='''set -eu
test "$(id -u)" = 0
test "$HOME" = /root
test -z "${GROK_HOME+x}"
for key in XAI_API_KEY GEMINI_API_KEY GOOGLE_API_KEY OPENAI_API_KEY ANTHROPIC_API_KEY; do test -z "${!key:-}"; done
for path in /root/.codex/auth.json /root/.claude/.credentials.json /root/.grok/config.toml /root/.gemini/antigravity-cli/settings.json; do test ! -f "$path"; done
printf 'PASS clean image identity/known auth paths/environment\\n'
uname -m
head -6 /etc/os-release
node --version
'''
for image in images:
 data=json.loads(subprocess.check_output(['docker','image','inspect',image],text=True))[0]
 print(json.dumps({k:data[k] for k in ['Id','Os','Architecture','Size']}),image,flush=True)
 subprocess.run(['docker','run','--pull=never','--rm','--network','none','--platform',data['Os']+'/'+data['Architecture'],'--entrypoint','/bin/bash',image,'-c',probe],check=True,timeout=60)
