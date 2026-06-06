## Fixes
- Fixed the AutoByteus desktop Terminal so Unicode CLI output, including box-drawing UI from tools like Codex and Claude, renders correctly instead of showing `â...` mojibake.
- Fixed non-ASCII terminal input so characters are sent to the backend PTY as UTF-8 bytes.

## Improvements
- Hardened terminal transport handling with byte-based base64 encoding and streaming UTF-8 output decoding across WebSocket chunks.
