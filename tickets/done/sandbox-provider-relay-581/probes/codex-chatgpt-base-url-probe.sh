b64() { printf '%s' "$1" | base64 -w0 | tr '+/' '-_' | tr -d '='; }
HDR=$(b64 '{"alg":"none","typ":"JWT"}')
PAY=$(b64 '{"exp":4102444800,"https://api.openai.com/auth":{"chatgpt_account_id":"acct_probe","chatgpt_plan_type":"plus"}}')
export CODEX_HOME=/tmp/ch && mkdir -p $CODEX_HOME
cat > $CODEX_HOME/auth.json <<JSON
{"auth_mode":"chatgpt","OPENAI_API_KEY":null,"tokens":{"id_token":"$HDR.$PAY.sig","access_token":"placeholder-not-a-credential","refresh_token":"placeholder-not-a-credential","account_id":"acct_probe"},"last_refresh":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
JSON
RUST_LOG=debug timeout 40 codex exec --skip-git-repo-check -c 'chatgpt_base_url="http://host.docker.internal:47581/relay/openai/backend-api/"' -c 'openai_base_url="http://host.docker.internal:47581/relay/openai/backend-api/codex"' -m gpt-5.6-luna "hi" > /tmp/out.txt 2> /tmp/err.txt; echo "exit $?"
grep -oiE "(https?|wss?)://[a-z0-9.:/_-]+" /tmp/err.txt /tmp/out.txt | sed 's/.*:\(http\|ws\)/\1/' | sort | uniq -c | sort -rn | head -20
grep -iE "workspace|routing|websocket|reconnect" /tmp/err.txt | grep -v placeholder | cut -c1-220 | head -12
