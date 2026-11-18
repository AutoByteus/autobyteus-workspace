# autobyteus-473 Android journeys (emulator-5640, own AVD apie2e473_api35: Android 15; debug APK of this branch; a host node of this branch with a Claude haiku run on the local Claude login)

Each entry: the exact command and its output, as it ran. Real taps; the page read over the WebView DevTools socket; the node's own view read with say.mjs tasks.

## API-01 · 2026-11-12T05:44:49Z · node scripts/say.mjs send Use the Bash tool with run_in_background set to true to run exactly: sleep 60; echo BG-473-ONE; exit 3 . Do not wait for it; reply only STARTED. · exit 0
```json
{"sent":"Use the Bash tool with run_in_background set to true to run exactly: sleep 60; echo BG-473-ONE; exit 3 . Do not wait for it; reply only STARTED."}
```

## API-01 · 2026-11-12T05:44:52Z · node scripts/say.mjs tasks · exit 0
```json
{"agentBackgroundTaskView":{"__typename":"AgentBackgroundTaskEventStream","tasks":[{"taskId":"br8bnk1ee","kind":"shell","description":"Run delayed echo command in background","command":"sleep 60; echo BG-473-ONE; exit 3","status":"running","summary":null,"startedAt":"2026-11-12T05:44:52.226Z"}]}}
```

## API-01 · 2026-11-12T05:45:11Z · node scripts/bg-steps.mjs open-activity ac001-listed · exit 0
```json
{
 "page": {
  "activityOpen": true,
  "section": true,
  "counts": "1 running",
  "rows": [
   {
    "status": "running",
    "text": "Run delayed echo command in backgroundRunningsleep 60; echo BG-473-ONE; exit 3Started 06:44 AM",
    "end": null
   }
  ],
  "order": [
   "mobile-background-tasks"
  ],
  "online": true,
  "vvScale": 1
 },
 "node": {
  "agentBackgroundTaskView": {
   "__typename": "AgentBackgroundTaskEventStream",
   "tasks": [
    {
     "taskId": "br8bnk1ee",
     "kind": "shell",
     "description": "Run delayed echo command in background",
     "command": "sleep 60; echo BG-473-ONE; exit 3",
     "status": "running",
     "summary": null,
     "startedAt": "2026-11-12T05:44:52.226Z"
    }
   ]
  }
 }
}
```

## API-01 · 2026-11-12T05:45:52Z · node scripts/bg-steps.mjs wait failed 1 150 ac001-ended · exit 0
```json
{
 "waitedMs": 35672,
 "page": {
  "activityOpen": true,
  "section": true,
  "counts": "1 ended",
  "rows": [
   {
    "status": "failed",
    "text": "Run delayed echo command in backgroundFailedsleep 60; echo BG-473-ONE; exit 3Background command \"Run delayed echo command in background\" failed with exit code 3Started 06:44 AM",
    "end": "Background command \"Run delayed echo command in background\" failed with exit code 3"
   }
  ],
  "order": [
   "mobile-background-tasks"
  ],
  "online": true,
  "vvScale": 1
 },
 "node": {
  "agentBackgroundTaskView": {
   "__typename": "AgentBackgroundTaskEventStream",
   "tasks": [
    {
     "taskId": "br8bnk1ee",
     "kind": "shell",
     "description": "Run delayed echo command in background",
     "command": "sleep 60; echo BG-473-ONE; exit 3",
     "status": "failed",
     "summary": "Background command \"Run delayed echo command in background\" failed with exit code 3",
     "startedAt": "2026-11-12T05:44:52.226Z"
    }
   ]
  }
 }
}
```

## API-01 · 2026-11-12T05:46:20Z · node scripts/say.mjs send Use the Bash tool with run_in_background set to true to run exactly: sleep 45; echo BG-473-TWO; exit 0 . Do not wait for it; reply only STARTED. · exit 0
```json
{"sent":"Use the Bash tool with run_in_background set to true to run exactly: sleep 45; echo BG-473-TWO; exit 0 . Do not wait for it; reply only STARTED."}
```

## API-01 · 2026-11-12T05:46:22Z · node scripts/bg-steps.mjs wait running 1 90 ac002-live · exit 0
```json
{
 "waitedMs": 1053,
 "page": {
  "activityOpen": true,
  "section": true,
  "counts": "1 running",
  "rows": [
   {
    "status": "running",
    "text": "Run delayed echo command in backgroundRunningsleep 45; echo BG-473-TWO; exit 0Started 06:46 AM",
    "end": null
   },
   {
    "status": "failed",
    "text": "Run delayed echo command in backgroundFailedsleep 60; echo BG-473-ONE; exit 3Background command \"Run delayed echo command in background\" failed with exit code 3Started 06:44 AM",
    "end": "Background command \"Run delayed echo command in background\" failed with exit code 3"
   }
  ],
  "order": [
   "mobile-background-tasks"
  ],
  "online": true,
  "vvScale": 1
 },
 "node": {
  "agentBackgroundTaskView": {
   "__typename": "AgentBackgroundTaskEventStream",
   "tasks": [
    {
     "taskId": "br8bnk1ee",
     "kind": "shell",
     "description": "Run delayed echo command in background",
     "command": "sleep 60; echo BG-473-ONE; exit 3",
     "status": "failed",
     "summary": "Background command \"Run delayed echo command in background\" failed with exit code 3",
     "startedAt": "2026-11-12T05:44:52.226Z"
    },
    {
     "taskId": "b70udvwmb",
     "kind": "shell",
     "description": "Run delayed echo command in background",
     "command": "sleep 45; echo BG-473-TWO; exit 0",
     "status": "running",
     "summary": null,
     "startedAt": "2026-11-12T05:46:21.660Z"
    }
   ]
  }
 }
}
```

## API-03 · 2026-11-12T05:47:14Z · node scripts/bg-steps.mjs rows offline-after-end · exit 0
```json
{
 "page": {
  "activityOpen": true,
  "section": true,
  "counts": "1 running",
  "rows": [
   {
    "status": "running",
    "text": "Run delayed echo command in backgroundRunningsleep 45; echo BG-473-TWO; exit 0Started 06:46 AM",
    "end": null
   },
   {
    "status": "failed",
    "text": "Run delayed echo command in backgroundFailedsleep 60; echo BG-473-ONE; exit 3Background command \"Run delayed echo command in background\" failed with exit code 3Started 06:44 AM",
    "end": "Background command \"Run delayed echo command in background\" failed with exit code 3"
   }
  ],
  "order": [
   "mobile-background-tasks"
  ],
  "online": false,
  "vvScale": 1
 },
 "node": {
  "agentBackgroundTaskView": {
   "__typename": "AgentBackgroundTaskEventStream",
   "tasks": [
    {
     "taskId": "br8bnk1ee",
     "kind": "shell",
     "description": "Run delayed echo command in background",
     "command": "sleep 60; echo BG-473-ONE; exit 3",
     "status": "failed",
     "summary": "Background command \"Run delayed echo command in background\" failed with exit code 3",
     "startedAt": "2026-11-12T05:44:52.226Z"
    },
    {
     "taskId": "b70udvwmb",
     "kind": "shell",
     "description": "Run delayed echo command in background",
     "command": "sleep 45; echo BG-473-TWO; exit 0",
     "status": "completed",
     "summary": "Background command \"Run delayed echo command in background\" completed (exit code 0)",
     "startedAt": "2026-11-12T05:46:21.660Z"
    }
   ]
  }
 }
}
```

## API-03 · 2026-11-12T05:47:22Z · node scripts/bg-steps.mjs wait completed 1 90 back-online · exit 0
```json
{
 "waitedMs": 2121,
 "page": {
  "activityOpen": true,
  "section": true,
  "counts": "2 ended",
  "rows": [
   {
    "status": "completed",
    "text": "Run delayed echo command in backgroundCompletedsleep 45; echo BG-473-TWO; exit 0Background command \"Run delayed echo command in background\" completed (exit code 0)Started 06:46 AM",
    "end": "Background command \"Run delayed echo command in background\" completed (exit code 0)"
   },
   {
    "status": "failed",
    "text": "Run delayed echo command in backgroundFailedsleep 60; echo BG-473-ONE; exit 3Background command \"Run delayed echo command in background\" failed with exit code 3Started 06:44 AM",
    "end": "Background command \"Run delayed echo command in background\" failed with exit code 3"
   }
  ],
  "order": [
   "mobile-background-tasks"
  ],
  "online": true,
  "vvScale": 1
 },
 "node": {
  "agentBackgroundTaskView": {
   "__typename": "AgentBackgroundTaskEventStream",
   "tasks": [
    {
     "taskId": "br8bnk1ee",
     "kind": "shell",
     "description": "Run delayed echo command in background",
     "command": "sleep 60; echo BG-473-ONE; exit 3",
     "status": "failed",
     "summary": "Background command \"Run delayed echo command in background\" failed with exit code 3",
     "startedAt": "2026-11-12T05:44:52.226Z"
    },
    {
     "taskId": "b70udvwmb",
     "kind": "shell",
     "description": "Run delayed echo command in background",
     "command": "sleep 45; echo BG-473-TWO; exit 0",
     "status": "completed",
     "summary": "Background command \"Run delayed echo command in background\" completed (exit code 0)",
     "startedAt": "2026-11-12T05:46:21.660Z"
    }
   ]
  }
 }
}
```

## API-02 · 2026-11-12T05:47:58Z · node scripts/say.mjs send Use the Bash tool with run_in_background set to true to run exactly: sleep 240; echo BG-473-THREE; exit 0 . Do not wait for it; reply only STARTED. · exit 0
```json
{"sent":"Use the Bash tool with run_in_background set to true to run exactly: sleep 240; echo BG-473-THREE; exit 0 . Do not wait for it; reply only STARTED."}
```

## API-02 · 2026-11-12T05:52:29Z · node scripts/say.mjs send Use the Bash tool with run_in_background set to true to run exactly: sleep 600; echo BG-473-FOUR; exit 0 . Do not wait for it; reply only STARTED. · exit 0
```json
{"sent":"Use the Bash tool with run_in_background set to true to run exactly: sleep 600; echo BG-473-FOUR; exit 0 . Do not wait for it; reply only STARTED."}
```

