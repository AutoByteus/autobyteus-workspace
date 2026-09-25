## What's New
- **External messaging is removed from AutoByteus.** Settings no longer has a Messaging section. The server no longer receives chat-platform messages, starts or resumes runs from them, or posts run output back to a chat. The desktop app no longer downloads, installs or runs the messaging gateway, and releases no longer publish a gateway package. Chat-platform integrations are planned as separate projects that you add through **Settings → MCP Servers** and skills, like any other tools.

## Improvements
- Upgrading frees the disk space used by installed messaging gateway versions and their download cache, which can be several GB on machines that used messaging.
- Old links to the Messaging settings page now open **API Keys** instead of an error.

## Upgrade notes
- **Messaging stops when you upgrade.** Existing chat bindings stop working, and no messaging process keeps running.
- **Messaging data is permanently deleted on the first start, with no backup.** This covers chat bindings with their receipts and outbox, installed gateway runtimes, gateway configuration including saved bot tokens, the gateway download cache and gateway logs. The two unused messaging tables are dropped from the database. To connect a bot again later, create a new token on that chat platform.
- If a messaging folder cannot be deleted, the server still starts and the cleanup retries on the next start.
- Past runs that were started from chat messages stay in run history and open as ordinary conversations.
- **Docker all-in-one:** the old `gateway.log` file in the data `logs` folder and the Docker volume that held gateway memory are not removed automatically. Delete the log file by hand. Find the volume with `docker volume ls --filter name=gateway`, then remove it with `docker volume rm <volume-name>`.
- MCP servers, tools and skills work as before.
