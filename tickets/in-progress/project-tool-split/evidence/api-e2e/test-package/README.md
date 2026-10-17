# project-tool-split test agent package

LOCAL_PATH agent package for the API/E2E real-app checks (AC-005, AC-006). Import it into an isolated
instance with `importAgentPackage(input: {sourceKind: LOCAL_PATH, source: <this folder>})`.
Four agents differ only in their configured Project tools; `pts-old-tool` has the shape of the
current Project Task Manager package (`create_or_update_project` only).
