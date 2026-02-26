#!/usr/bin/env bash
# Helper script for creating and pushing release tags for the AutoByteus Web repo.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(realpath "$SCRIPT_DIR/..")"
cd "$REPO_ROOT"

DRY_RUN=false
SKIP_PUSH=false
VERSION=""

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

usage() {
    cat <<'EOF'
Usage: scripts/publish-tag.sh [options]

Options:
  -v, --version <version>  Version to tag (defaults to package.json version)
  -d, --dry-run            Show the git commands without executing them
      --no-push            Create the tag locally without pushing
  -h, --help               Show this help message

The script creates an annotated git tag named v<VERSION> and, unless
--no-push is provided, pushes both commits and the tag to origin.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -v|--version)
            [[ $# -ge 2 ]] || { echo "Missing value for $1" >&2; exit 1; }
            VERSION="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-push)
            SKIP_PUSH=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
done

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "This script must be run inside a git repository." >&2
    exit 1
fi

if [[ -z "$VERSION" ]]; then
    if command -v node >/dev/null 2>&1; then
        VERSION="$(node -p "require('./package.json').version" 2>/dev/null || true)"
    fi
fi

if [[ -z "$VERSION" ]]; then
    VERSION="$(python3 -c "import json;print(json.load(open('package.json'))['version'])" 2>/dev/null || true)"
fi

if [[ -z "$VERSION" ]]; then
    echo "Unable to determine version. Provide one via --version." >&2
    exit 1
fi

TAG_NAME="v$VERSION"

run_cmd() {
    if [[ "$DRY_RUN" == true ]]; then
        echo "[DRY RUN] $*"
    else
        "$@"
    fi
}

echo -e "${CYAN}Preparing to publish ${TAG_NAME}${NC}"

if git rev-parse -q --verify "refs/tags/$TAG_NAME" >/dev/null; then
    echo -e "${YELLOW}Tag ${TAG_NAME} already exists locally. Skipping creation.${NC}"
else
    echo -e "${YELLOW}Creating annotated tag ${TAG_NAME}${NC}"
    run_cmd git tag -a "$TAG_NAME" -m "Release version $VERSION"
fi

if [[ "$SKIP_PUSH" == true ]]; then
    echo -e "${YELLOW}Skipping push because --no-push was supplied.${NC}"
else
    echo -e "${YELLOW}Pushing commits and tag ${TAG_NAME} to origin${NC}"
    run_cmd git push
    run_cmd git push origin "$TAG_NAME"
fi

echo -e "${GREEN}Tag publishing steps completed for ${TAG_NAME}.${NC}"
