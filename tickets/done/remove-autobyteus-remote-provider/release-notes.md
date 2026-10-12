# Release Notes — Remote AutoByteus Provider Removed

Status: prepared before user verification. Whether this ships in a release, and with which version, is decided at finalization.

## Removed
- The remote **AutoByteus** model provider is removed, because its server no longer exists. Settings no longer lists an "AutoByteus" provider or an "AutoByteus LLM Hosts" card, and model pickers no longer offer remote AutoByteus LLM, image or audio models.

## Unchanged
- The **AutoByteus agent runtime** is not affected. Agents on the AutoByteus runtime keep working with every other provider (API providers, LM Studio, Ollama and custom OpenAI-compatible providers), and existing runs open and resume as before.
- The "AutoByteus VNC Hosts" setting is not affected.

## Notes
- No reset or data migration is needed.
- An agent, run, launch profile or media default that still names a remote AutoByteus model shows that model as unavailable and does not start until you choose another model. The saved value is not cleared or replaced. A stopped run whose model is no longer offered cannot switch to another model yet. This is a known limitation that also applies to any other model that is no longer offered; start a new run instead.
- A leftover `AUTOBYTEUS_LLM_SERVER_HOSTS` value appears under Server Settings as an ordinary custom setting that you can delete. A saved AutoByteus API key is ignored.
- Token-usage history recorded with the remote provider still shows "AutoByteus".
