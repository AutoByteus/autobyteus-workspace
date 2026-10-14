#!/usr/bin/env python3
"""Deterministic release metadata/qualification boundary; never publishes or mounts.
Run --check-publish before any publishing step. Empty qualification fails closed.
"""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'autobyteus-nfs/packaging/engine'))
from manifest import validate as validate_engine, embed as embed_engine

LOCK = ROOT / 'autobyteus-nfs/packaging/release-lock.json'
SOURCES = ['autobyteus-nfs/internal', 'autobyteus-nfs/cmd/autobyteus-nfs/main.go',
           'autobyteus-server-ts/src', 'autobyteus-ts/src/tools/terminal',
           'autobyteus-web/components/settings', 'autobyteus-web/utils/nfsLauncherCommands.ts',
           'scripts/public/docker', 'scripts/public/nfs', 'autobyteus-nfs/packaging/Dockerfile',
           'autobyteus-nfs/go.mod', 'autobyteus-nfs/packaging/engine', 'autobyteus-nfs/packaging/release.py',
           '.github/workflows/release-nfs.yml', 'pnpm-lock.yaml',
           'autobyteus-server-ts/package.json', 'autobyteus-web/package.json',
           'autobyteus-ts/package.json']


def source_hash(engine=None):
    digest = hashlib.sha256()
    lock = json.loads(LOCK.read_text())
    inputs = {k: lock[k] for k in ('ubuntuBaseImage', 'ubuntuPackages', 'engine')}
    if engine is not None:
        inputs['engine'] = engine
    digest.update(json.dumps(inputs, sort_keys=True).encode())
    files = []
    for name in SOURCES:
        path = ROOT / name
        files.extend(p for p in path.rglob('*') if p.is_file()) if path.is_dir() else files.append(path)
    for path in sorted(files):
        if path.name.endswith('_test.go') or '__tests__' in path.parts or '__pycache__' in path.parts or path.suffix == '.deb':
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
    p.add_argument('--engine-manifest', type=Path)
    p.add_argument('--engine-artifacts', type=Path)
    p.add_argument('--target', choices=['darwin-arm64','darwin-amd64','linux-arm64','linux-amd64'])
    a = p.parse_args()
    lock = json.loads(LOCK.read_text())
    engine = json.loads(a.engine_manifest.read_text()) if a.engine_manifest else lock["engine"]
    if engine is not None:
        validate_engine(engine)
    digest = source_hash(engine)
    if a.source_hash:
        print(digest)
        return
    if a.check_publish:
        targets = lock['qualifiedTargets']
        if not targets or not set(targets) <= {'darwin-arm64','darwin-amd64','linux-arm64','linux-amd64'}:
            raise SystemExit('No qualified release targets; publishing unavailable.')
        if lock['qualifiedSourceHash'] != digest or not lock['userVerified'] or len(lock['physicalEvidence']) < 3:
            raise SystemExit('Current-source, independent physical Mac/Linux/Docker and explicit user verification gates are incomplete.')
        if engine is None:
            raise SystemExit("Corrected engine candidate is missing.")
        validate_engine(engine, require_both=True)
        if engine != lock['engine']:
            raise SystemExit('Candidate engine bytes differ from qualified lock.')
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
                'engineImage':a.engine_image,
                'qualifiedTargets':lock['qualifiedTargets'] if digest == lock['qualifiedSourceHash'] and engine == lock['engine'] else []}
    if engine is not None:
        metadata['engine'] = engine
    if a.target and a.target.startswith('linux-'):
        if engine is None or a.engine_artifacts is None:
            raise SystemExit('Linux release build requires the matching corrected engine bundle.')
        embed_engine(engine, a.engine_artifacts, a.target.split('-')[1], ROOT/'autobyteus-nfs/internal/backend/engine-assets')
    if a.output:
        a.output.parent.mkdir(parents=True, exist_ok=True)
        a.output.write_text(json.dumps(metadata, indent=2)+'\n')
    else:
        print(json.dumps(metadata, indent=2))


if __name__ == '__main__':
    main()
