# Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Source Artifact:
  - `tickets/desktop-tag-build-workflow/implementation-plan.md`
- Referenced Sections:
  - `Solution Sketch`
  - `Step-By-Step Plan`

## Use Case Index

- Use Case 1: Tag push triggers cross-platform build and artifact upload.
- Use Case 2: Missing private-read token fails workflow early with clear error.

## Use Case 1: Tag push triggers cross-platform build and artifact upload

### Goal

Build Linux, Windows, macOS arm64, and macOS Intel artifacts on a tag push.

### Preconditions

- Tag is pushed to `autobyteus-web`.
- Secret `CI_REPO_READ_TOKEN` is configured.

### Expected Outcome

- Four matrix jobs run.
- Each job uploads `electron-dist` files as an Actions artifact.

### Primary Runtime Call Stack

```text
[ENTRY] .github/workflows/desktop-tag-build.yml:on.push.tags("**")
└── .github/workflows/desktop-tag-build.yml:jobs.build(strategy.matrix)
    ├── actions/checkout@v4 (autobyteus-web)
    ├── actions/checkout@v4 (autobyteus-server-ts) [IO]
    ├── actions/checkout@v4 (autobyteus-ts) [IO]
    ├── actions/checkout@v4 (repository_prisma) [IO]
    ├── actions/setup-node@v4 [IO]
    ├── run(corepack + pnpm activation)
    ├── run(write pnpm-workspace.yaml) [STATE]
    ├── run(pnpm install across required repos) [IO]
    ├── run("pnpm build:electron:*" in autobyteus-web) [ASYNC]
    │   └── scripts/prepare-server.sh [ASYNC]
    │       ├── build autobyteus-ts + repository_prisma [ASYNC]
    │       ├── build and deploy autobyteus-server-ts [ASYNC]
    │       └── bundle server into resources/server [IO]
    ├── run(ls electron-dist)
    └── actions/upload-artifact@v4 [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] macOS signing credentials absent
autobyteus-web/build/scripts/build.ts:options.mac.identity = null
└── mac build proceeds unsigned/notarization-disabled
```

```text
[ERROR] dependency clone/build failure
.github/workflows/desktop-tag-build.yml:jobs.build
└── GitHub job exits non-zero for failing matrix entry
```

### State And Data Transformations

- Git tag ref -> matrix build plan
- Workspace checkout directories -> temporary CI workspace
- Build output -> `autobyteus-web/electron-dist/*` -> uploaded artifacts

### Observability And Debug Points

- Secret validation step error
- Build output listing step
- Uploaded artifact names include target + tag

### Design Smells / Gaps

- None in scope for this change.

## Use Case 2: Missing private-read token fails workflow early

### Goal

Fail quickly with a clear message when `CI_REPO_READ_TOKEN` is not configured.

### Preconditions

- Tag push occurs.
- Secret `CI_REPO_READ_TOKEN` is empty/missing.

### Expected Outcome

- Job fails before dependency checkouts.
- Error message clearly indicates which secret is required and why.

### Primary Runtime Call Stack

```text
[ENTRY] .github/workflows/desktop-tag-build.yml:on.push.tags("**")
└── .github/workflows/desktop-tag-build.yml:steps["Validate secret for private dependency checkout"]
    ├── run(check CI_REPO_READ_TOKEN)
    └── [ERROR] exit 1 with ::error:: annotation
```

### Branching / Fallback Paths

```text
[FALLBACK] secret present
Validation step passes
└── checkout/build steps execute
```

### State And Data Transformations

- Secret presence check -> boolean gate (`pass`/`fail`).

### Observability And Debug Points

- GitHub annotation includes missing-secret guidance.

### Design Smells / Gaps

- None in scope.
