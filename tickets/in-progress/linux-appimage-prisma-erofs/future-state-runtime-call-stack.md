# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v2`
- Requirements: `tickets/in-progress/linux-appimage-prisma-erofs/requirements.md`
- Source Artifact: `tickets/in-progress/linux-appimage-prisma-erofs/implementation-plan.md`
- Source Design Version: `v2`

## Use Case Index

| use_case_id | Source Type | Requirement ID(s) | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- |
| UC-001 | Requirement | REQ-001, REQ-003 | Packaged startup with bundled compatible engines present | Yes/N/A/Yes |
| UC-002 | Requirement | REQ-001, REQ-002 | Packaged startup with bundled incompatible/missing engines, cache fallback | Yes/Yes/Yes |
| UC-003 | Requirement | REQ-002, REQ-004 | Packaged startup with no resolvable engines | Yes/N/A/Yes |
| UC-004 | Requirement | REQ-005 | CI Linux packaging bundles both OpenSSL Prisma targets | Yes/N/A/Yes |

## Use Case: UC-001 Packaged Startup With Bundled Compatible Engines

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/app.ts:startServer(...)
└── autobyteus-server-ts/src/startup/migrations.ts:runMigrations()
    ├── autobyteus-server-ts/src/startup/migrations.ts:resolvePrismaEnginePair(appRoot) [IO]
    │   └── read bundled @prisma/engines files [IO]
    ├── autobyteus-server-ts/src/startup/migrations.ts:runPrismaCommand(appRoot, args)
    │   └── exec prisma migrate deploy with explicit PRISMA_* engine env [ASYNC]
    └── migration success log + return
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 Bundled Missing/Incompatible, Cache Fallback

### Primary Runtime Call Stack

```text
[ENTRY] app.ts:startServer(...)
└── migrations.ts:runMigrations()
    ├── migrations.ts:resolvePrismaEnginePair(appRoot) [IO]
    │   ├── bundled path probe -> incompatible/missing
    │   ├── ~/.cache/prisma/master probe [IO]
    │   └── return cache-backed PRISMA env overrides
    └── migrations.ts:runPrismaCommand(...)
        └── prisma migrate deploy succeeds without write into mounted package path
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 No Resolvable Engines

### Primary Runtime Call Stack

```text
[ENTRY] app.ts:startServer(...)
└── migrations.ts:runMigrations()
    ├── migrations.ts:resolvePrismaEnginePair(...) -> unresolved
    ├── warn with attempted locations
    └── runPrismaCommand(...) -> prisma failure propagates
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 CI Linux Packaging Bundles Both OpenSSL Targets

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/scripts/prepare-server.sh
└── prisma generate in packaged server dir [ASYNC]
    ├── PRISMA_CLI_BINARY_TARGETS=debian-openssl-1.1.x,debian-openssl-3.0.x
    ├── populate @prisma/engines with both query/schema binaries [IO]
    └── validation gate checks required files exist [IO]
```

### Error Path

```text
[ERROR] required engine file missing after generate
prepare-server.sh
└── exit 1 (build fails, bad artifact blocked)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
