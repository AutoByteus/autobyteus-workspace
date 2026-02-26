# Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis
- Scope Classification: `Medium`
- Source Artifact: `autobyteus-web/tickets/remove-prompt-synchronization-ui/proposed-design.md`
- Referenced Sections: C-001..C-003

## Use Case Index
- Use Case 1: Marketplace UI no longer exposes sync action
- Use Case 2: Store no longer executes sync mutation
- Use Case 3: Prompt flows continue via reload/create/edit/delete

## Use Case 1: Marketplace UI no longer exposes sync action

### Primary Runtime Call Stack
```text
[ENTRY] autobyteus-web/pages/prompt-engineering.vue:render
└── autobyteus-web/components/promptEngineering/PromptMarketplace.vue:template
    └── header actions render Reload + Create only
```

## Use Case 2: Store no longer executes sync mutation

### Primary Runtime Call Stack
```text
[ENTRY] autobyteus-web/stores/promptStore.ts:defineStore('prompt')
└── sync-specific refs/actions absent:
    ├── no `syncing` ref
    ├── no `syncResult` ref
    ├── no `syncPrompts()` action
    └── no `SYNC_PROMPTS` import
```

## Use Case 3: Prompt flows continue via reload/create/edit/delete

### Primary Runtime Call Stack
```text
[ENTRY] autobyteus-web/components/promptEngineering/PromptMarketplace.vue:onMounted()
└── autobyteus-web/stores/promptStore.ts:fetchPrompts(null) [ASYNC][IO]

[ENTRY] PromptMarketplace.vue:handleReload()
└── promptStore.reloadPrompts() [ASYNC][IO]

[ENTRY] PromptDetails/CreatePromptView actions
└── promptStore.create/update/delete/markActive(...) [ASYNC][IO]
```
