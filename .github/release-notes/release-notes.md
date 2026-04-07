## Improvements
- Improved Telegram and other external-channel replies so tool-using turns wait for the full same-turn response before sending the final message.

## Fixes
- Fixed external replies that could stop after the first pre-tool segment instead of including the whole agent response.
- Fixed accepted-turn recovery so delayed or restarted external replies continue routing one final message for the completed turn.
