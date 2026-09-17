# IR-001 implementation evidence
Not independent API acceptance. Current implementation-handoff/revision record are authoritative.

- publication-order-probe.cjs/.log: Designer-owned old scheduler diagnostic, untouched.
- ir001-install.log / ir001-prepare.log: frozen dependencies and normal Nuxt preparation.
- ir001-baseline-regression.log: new ready-family tests against original loader2fail/7skip; source restored.
- ir001-scoped-tests.log:136tests/10files pass,9new real-owner/render tests plus adjacent history/recovery.
- ir001-current-tests.log: broad190pass/18fail/16unhandled errors, NOT green. ir001-adjacent-baseline.log reproduces same18fail/16errors on original loader; ir001-baseline-comparison.json lists exact failure set match. No broad clean-suite claim.
- ir001-initial-broad.log: prior19fail incl directly affected missing structural mock method, then corrected. ir001-focused.log initial fixture unknown-workspace assumption failed2tests; ir001-focused-current.log52pass intermediate. Final new test suite has9cases and unresolved scoped-expansion query to avoid accidental publication.
- ir001-build-prerequisites.log / ir001-build.log: shared package build prerequisite and Nuxt16route production build pass; temporary page excluded, known generated SDK dist removed.
- ir001-guards.log: web/localization guards and diff check pass.
- ir001-typecheck.log:vue-tsc absent, strict typecheck NOT completed.
- ir001-source-manifest.json: exact final4code/test files at base6f15f446d6.
- render/: actual sidebar synthetic IO feedback loop only, not real server timing/Electron/provider validation.

Other-owner docs/diagnostic preserved; no user profile/history reset or server restart, Git finalization, provider action. API should validate actual startup response→DOM timing and preservation using owned data.
