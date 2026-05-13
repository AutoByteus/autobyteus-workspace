# Future-State Runtime Call Stack Review

Status: Go Confirmed

## Round 1: Candidate Go

- Blocking findings: none.
- Missing-use-case sweep:
  - no managed containers exist: `upgrade --all`/`destroy --all` should report no managed nodes rather than failing destructively.
  - managed container without state: enumeration through Docker labels covers it; upgrade may allocate fresh ports if state is absent.
  - image still used by a different container: targeted cleanup skips image IDs still referenced by any container.
  - legacy command names: not part of the new command model; no compatibility route required.
- Required persisted artifact updates: none.
- Decision: Candidate Go.

## Round 2: Go Confirmed

- Blocking findings: none.
- Missing-use-case sweep repeated:
  - reset after old legacy containers: all managed labels are destroyed first, state cleared, then indexed `-0` is created.
  - repeated `new-container`: first available index lookup gives `-0`, `-1`, `-2`.
  - volumes: no removal path uses `docker volume rm` or `docker system prune`.
  - self-install/update: `install` remains outside Docker lifecycle and is preserved as the only public launcher replacement command.
- Required persisted artifact updates: none.
- Decision: Go Confirmed.
