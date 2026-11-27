#!/usr/bin/env bash
# autobyteus-581 probe, run INSIDE a throwaway server-image container: point each runtime CLI at the fake relay on the
# host and record what it sends (fake-relay.py logs shapes only). Only placeholders are used; no real credential.
R=http://host.docker.internal:47581
PASS=rp_probe_pass_placeholder
T=25
cd /tmp && mkdir -p w && cd w

echo "== claude, api-key mode"
env -u CLAUDE_CODE_OAUTH_TOKEN ANTHROPIC_BASE_URL=$R/relay/anthropic ANTHROPIC_API_KEY=$PASS \
  timeout $T claude -p "hi" --model haiku >/dev/null 2>&1; echo "exit $?"

echo "== claude, login-token mode (OAuth placeholder)"
env -u ANTHROPIC_API_KEY ANTHROPIC_BASE_URL=$R/relay/anthropic CLAUDE_CODE_OAUTH_TOKEN=placeholder-not-a-credential \
  timeout $T claude -p "hi" --model haiku >/dev/null 2>&1; echo "exit $?"

echo "== codex, api-key mode (custom provider)"
RELAY_KEY=$PASS timeout $T codex exec --skip-git-repo-check \
  -c 'model_providers.relay={name="relay",base_url="'$R'/relay/openai/v1",env_key="RELAY_KEY",wire_api="responses"}' \
  -c model_provider=relay -m gpt-5.4-mini "hi" >/dev/null 2>&1; echo "exit $?"

echo "== codex, login-token mode (ChatGPT auth.json with placeholders)"
b64() { printf '%s' "$1" | base64 -w0 | tr '+/' '-_' | tr -d '='; }
HDR=$(b64 '{"alg":"none","typ":"JWT"}')
PAY=$(b64 '{"email":"probe@example.invalid","exp":4102444800,"https://api.openai.com/auth":{"chatgpt_account_id":"acct_probe","chatgpt_plan_type":"plus","chatgpt_user_id":"user_probe"}}')
export CODEX_HOME=/tmp/codex-probe-home && mkdir -p $CODEX_HOME
cat > $CODEX_HOME/auth.json <<JSON
{"OPENAI_API_KEY":null,"tokens":{"id_token":"$HDR.$PAY.sig","access_token":"placeholder-not-a-credential","refresh_token":"placeholder-not-a-credential","account_id":"acct_probe"},"last_refresh":"2026-11-26T00:00:00Z"}
JSON
timeout $T codex exec --skip-git-repo-check -c 'chatgpt_base_url="'$R'/relay/chatgpt/backend-api/"' -m gpt-5.4-mini "hi" >/dev/null 2>&1; echo "exit $?"
unset CODEX_HOME

echo "== grok, api-key mode"
GROK_XAI_API_BASE_URL=$R/relay/xai/v1 XAI_API_KEY=$PASS timeout $T grok -p "hi" >/dev/null 2>&1; echo "exit $?"
echo "== grok, api-key mode (GROK_CLI_BASE_URL)"
GROK_CLI_BASE_URL=$R/relay/xai/v1 XAI_API_KEY=$PASS timeout $T grok -p "hi" >/dev/null 2>&1; echo "exit $?"
