# F-1: a replaced package picture of the same size and archive time keeps the old version

Spec: `autobyteus-server-ts/tests/e2e/agent-definitions/definition-avatars-github.e2e.test.ts`, AV-02.

## How it was found

The whole server e2e suite (API-003) failed AV-02 at `expect(writer.avatarUrl).not.toBe(firstAddress.writer)`. Run alone
right after, it passed (API-004, first run). The update writes revision 2's `avatar.png`: different bytes, but the same
size (99 bytes; both are 32×32 one-colour PNGs). Tar keeps an entry's modification time in whole seconds, so both revisions
written within one second extract with the same `mtimeMs`.

## Reproduction (a temporary debug copy of the spec, removed after)

The package file before and after the update (`<data>/agent-packages/github/avatars-e2e__agents/agents/writer/avatar.png`):

```
run 1 (natural timing): before {"size":99,"mtimeMs":1795883014000,"ino":786068752}
                        after  {"size":99,"mtimeMs":1795883014000,"ino":786068822}  diskIsNew: true
                        address after reset ?v=dbc8ddc4e3c6 = the first address ?v=dbc8ddc4e3c6   -> Fail
run 2, 3 (times 1 s apart): after mtimeMs one second later -> ?v=eab3412d05b8, a new version       -> Pass
```

With revision 2's picture pinned to revision 1's time (`fs.utimes`, now in the durable spec), every run fails (3 of 3,
`av-github-pinned-red.txt`). The route then:

```
GET /rest/definition-avatars/agent/writer?v=dbc8ddc4e3c6 -> 200, ETag "99-1795883069000", Cache-Control no-cache, the NEW bytes
GET the same with If-None-Match "99-1795883069000"   -> 304
```

So a client that showed the old picture revalidates, gets 304, and keeps the old picture. The address is unchanged, so the
phone's object-URL cache (keyed by address) also keeps it. AC-001: "Replace the file and update the package: the address's
version changes and the new picture shows" does not hold for this replacement.

## Cause

`readDefinitionAvatar` (`src/agent-package-definitions/domain/definition-avatar-file.ts`) caches each path's hash while
`size` and `mtimeMs` are unchanged (design N-3). A file replaced by one of the same size and modification time (a new inode,
a new `ctime`) reuses the old hash. The hash is the address version and is part of the definition's fingerprint.

## Diagnosis only (not committed)

Adding `ino` and `ctimeMs` to the cache check made the pinned AV-02 pass (2 of 2). The source was restored right after:
`git diff -- autobyteus-server-ts/src/agent-package-definitions/domain/definition-avatar-file.ts` is empty. The fix and
its form are the implementation's to choose.

## When it happens for real

It needs the same size and the same whole-second time:
- an archive tool that sets one fixed time on every entry (reproducible archives);
- two revisions archived within one second;
- a copy that keeps times (`cp -p`, `rsync -t`) of a same-size picture.

A GitHub tarball carries its commit's time, so separate commits normally differ. It is rare, but silent: the old picture
stays until the file changes again or the node restarts (the cache is in memory).
