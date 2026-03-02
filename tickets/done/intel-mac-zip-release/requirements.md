# Requirements

- **Status:** Design-ready
- **Goal:** Ensure `.zip` release artifact is uploaded for MacOS Intel (`x64`), avoiding "no file provided" on update.
- **In-Scope Use Cases:** 
  - `UC-001`: Generate and upload release files for MacOS Intel (`x64`) during GitHub Actions release workflow.
- **Acceptance Criteria:**
  - `AC-001`: The generated `.zip` artifact is uploaded to the GitHub artifact `macos-x64` during build-macos-x64.
  - `AC-002`: The generated `.zip` artifact is published to the GitHub Release.
- **Constraints/Dependencies:** GitHub Actions workflow `.github/workflows/release-desktop.yml`.
- **Assumptions:** Mac ARM (`arm64`) is already generating and uploading a `.zip` properly. The x64 workflow misses it in the upload step.
- **Scope Assessment:** Small.
