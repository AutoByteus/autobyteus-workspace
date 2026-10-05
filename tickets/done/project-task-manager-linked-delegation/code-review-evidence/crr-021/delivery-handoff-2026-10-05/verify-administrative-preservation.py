#!/usr/bin/env python3
"""Administrative preservation only. Does not execute tests or applications."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

A = Path(__file__).resolve().parent
T = A.parents[2]
W = T.parents[2]
INPUT = json.loads((A / "input-preservation.json").read_text())
ALLOWED = set(INPUT["authorizedReportAppends"])

def sha(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as stream:
        while block := stream.read(1024 * 1024):
            h.update(block)
    return h.hexdigest()

def git(*args):
    return subprocess.check_output(["git", *args], cwd=W,
        env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"})

def records_without(status, prefix):
    return [r for r in status.split(b"\0") if r and not r[3:].startswith(prefix)]

changed = [p for p, h in INPUT["referenceHashes"].items() if sha(p) != h]
assert set(changed) == ALLOWED, ("Unexpected reference changes", changed)
for name, backup in [
    ("api-e2e-test-review-report.md", "prior-test-review-report.md"),
    ("code-review-revision-record.md", "prior-revision-record.md"),
]:
    assert (T / name).read_bytes().startswith((A / backup).read_bytes()), name
assert sha(T / "code-review-report.md") == INPUT["sourceReportHash"]
scope = json.loads((T / "code-review-evidence/crr-021/durable-scope.json").read_text())
assert len(scope) == 20
assert all(sha(r["path"]) == r["sha256"] for r in scope)
assert git("rev-parse", "HEAD").decode().strip() == INPUT["head"]
assert git("branch", "--show-current").decode().strip() == INPUT["branch"]
assert git("rev-parse", "--verify", "refs/stash").decode().strip() == INPUT["stash"]
assert sha(INPUT["indexPath"]) == INPUT["indexHash"]
assert hashlib.sha256(git("ls-files", "--stage", "-z")).hexdigest() == INPUT["stagesHash"]
assert not git("ls-files", "--unmerged")
status = git("status", "--porcelain=v1", "-z", "--untracked-files=all")
baseline = (A / "input-status.z").read_bytes()
admin_prefix = (str(A.relative_to(W)) + "/").encode()
assert records_without(status, admin_prefix) == records_without(baseline, admin_prefix)
ticket_prefix = (str(T.relative_to(W)) + "/").encode()
assert records_without(status, ticket_prefix) == records_without(baseline, ticket_prefix)
for args in [("diff", "HEAD", "--check"), ("diff", "--cached", "--check")]:
    r = subprocess.run(["git", *args], cwd=W, capture_output=True,
        env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"})
    assert r.returncode == 0, r.stdout + r.stderr
result = {
    "at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "purpose": "Administrative preservation only; no new review or executable validation",
    "incomingReferences": len(INPUT["referenceHashes"]),
    "exactIncomingReferences": len(INPUT["referenceHashes"]) - len(changed),
    "onlyAuthorizedReviewerAdministrativeAppends": changed,
    "priorCanonicalBodiesAndChronologyByteExactAsPrefixes": True,
    "all20DurableHashesExact": True,
    "sourceReportExact": True,
    "HEADBranchStashBinaryIndexStagesExact": True,
    "all300NonTicketDirtyStatusesExact": True,
    "noOtherDirtyStatusChangeOutsideNewAdministrativeEvidenceDirectory": True,
    "zeroUnmerged": True,
    "diffHEADAndCachedChecksExit0": True,
    "newSourceOrTestReviewResult": False,
    "newAPITestPaidOrApplicationExecution": False,
    "currentCanonicalHashes": {p: sha(p) for p in sorted(ALLOWED)},
}
name = sys.argv[1] if len(sys.argv) > 1 else "pre-handoff-preservation.json"
assert name in ["pre-handoff-preservation.json", "post-handoff-preservation.json"]
(A / name).write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({k: v for k, v in result.items() if k != "currentCanonicalHashes"}, indent=2))

