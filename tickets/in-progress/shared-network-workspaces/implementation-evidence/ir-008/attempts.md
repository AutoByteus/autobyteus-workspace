# IR008 local check attempts

Initial focused backend/setup checks passed. First full race run failed only
TestProbeSameIdentityAndNoProjectChanges: the test-owned /tmp scratch/tmp inherited
macOS wheel group 0, incompatible with the existing nonroot data identity contract.
UID501/GID20 is the invoking identity. No product/source failure was found or
guard weakened. Corrected only newly owned scratch/home/tmp group to primary20
before rerun. Raw failure, exact runner and command/result remain in attempt-1.
The rerun runner prepares these owned directories explicitly. No existing user
directory, runtime source, permission policy or service test was modified.

Before final checks, strengthened the new setup negative fixture with an exact
probe receipt so reaching selected-node cleanup would necessarily touch the
deliberately unusable Docker adapter; the guarded receipt must remain unchanged.
