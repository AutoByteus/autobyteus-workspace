# Repository Instructions

- **Design:** respect the project-specific design principles in
  [DESIGN.md](DESIGN.md). Read it before designing a solution, architecture, or
  refactor, and revisit it during implementation and review.
- **Testing:** respect the project-specific testing principles in
  [TESTING.md](TESTING.md). Read it before planning or running validation.
- **Release:** respect the project-specific finalization, release and rollout
  rules in [RELEASE.md](RELEASE.md). Read it before merging into the target
  branch, tagging, publishing or deploying.
- **Real provider keys** for tests and investigation: set
  `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` (check it with `pnpm test-vault status`)
  plus the test's live gate. Never read keys from `.env` files or the environment. See
  [TESTING.md](TESTING.md#test-vault).
- Also follow the applicable package-level `AGENTS.md` instructions.
