#!/usr/bin/env python3
"""Deterministic release metadata/qualification boundary; never publishes or mounts.
Run --check-publish before any publishing step. Empty qualification fails closed.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOCK = ROOT / 'autobyteus-nfs/packaging/release-lock.json'
SOURCES = ['autobyteus-nfs/internal', 'autobyteus-nfs/cmd/autobyteus-nfs/main.go',
           'autobyteus-server-ts/src', 'autobyteus-ts/src/tools/terminal',
           'autobyteus-web/components/settings', 'autobyteus-web/utils/nfsLauncherCommands.ts',
           'scripts/public/docker', 'scripts/public/nfs', 'autobyteus-nfs/packaging/Dockerfile',
           'autobyteus-nfs/go.mod', 'autobyteus-nfs/packaging/release.py',
           '.github/workflows/release-nfs.yml', 'pnpm-lock.yaml',
           'autobyteus-server-ts/package.json', 'autobyteus-web/package.json',
           'autobyteus-ts/package.json']


def source_hash():
    digest = hashlib.sha256()
    lock = json.loads(LOCK.read_text())
    digest.update(json.dumps({k: lock[k] for k in ('ubuntuBaseImage', 'ubuntuPackages')}, sort_keys=True).encode())
    files = []
    for name in SOURCES:
        path = ROOT / name
        files.extend(p for p in path.rglob('*') if p.is_file()) if path.is_dir() else files.append(path)
    for path in sorted(files):
        if path.name.endswith('_test.go') or '__tests__' in path.parts:
            continue
        digest.update(str(path.relative_to(ROOT)).encode() + b'\0')
        digest.update(path.read_bytes())
    return digest.hexdigest()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--check-publish', action='store_true')
    p.add_argument('--tag')
    p.add_argument('--engine-image', default='')
    p.add_argument('--output', type=Path)
    p.add_argument('--source-hash', action='store_true')
    a = p.parse_args()
    lock = json.loads(LOCK.read_text())
    digest = source_hash()
    if a.source_hash:
        print(digest)
        return
    if a.check_publish:
        targets = lock['qualifiedTargets']
        if not targets or not set(targets) <= {'darwin-arm64','darwin-amd64','linux-arm64','linux-amd64'}:
            raise SystemExit('No qualified release targets; publishing unavailable.')
        if lock['qualifiedSourceHash'] != digest or not lock['userVerified'] or len(lock['physicalEvidence']) < 3:
            raise SystemExit('Current-source, independent physical Mac/Linux/Docker and explicit user verification gates are incomplete.')
        for evidence in lock['physicalEvidence']:
            path = (ROOT / evidence).resolve()
            if not path.is_relative_to(ROOT) or not path.is_file():
                raise SystemExit('Qualification evidence missing or outside repository.')
        return
    if not a.tag or not re.fullmatch(r'v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?', a.tag):
        raise SystemExit('A repository release tag is required.')
    if a.engine_image and not re.fullmatch(r'[a-z0-9][a-z0-9./:_-]+@sha256:[a-f0-9]{64}', a.engine_image):
        raise SystemExit('Engine image must be immutable.')
    metadata = {'version':a.tag, 'sourceHash':digest, 'ubuntuPackages':lock['ubuntuPackages'],
                'engineImage':a.engine_image, 'qualifiedTargets':lock['qualifiedTargets']}
    if a.output:
        a.output.parent.mkdir(parents=True, exist_ok=True)
        a.output.write_text(json.dumps(metadata, indent=2)+'\n')
    else:
        print(json.dumps(metadata, indent=2))


if __name__ == '__main__':
    main()
