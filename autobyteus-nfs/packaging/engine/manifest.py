#!/usr/bin/env python3
"""Lock/verify the exact candidate package pair used by native and Docker builds."""
import argparse
import json
import re
import shutil
from pathlib import Path
from source import LOCK, VERSION, NAMES, identity, source_identity

DIGEST = re.compile(r'[a-f0-9]{64}')
LIMIT = 40*1024*1024


def validate(manifest, require_both=False):
    source = manifest['source']
    if source != source_identity(source['buildBase']) or '@sha256:' not in source['buildBase']:
        raise ValueError('Engine source/patch/recipe/build identity differs')
    architectures = manifest['architectures']
    if not architectures or not set(architectures) <= {'arm64', 'amd64'}:
        raise ValueError('Invalid engine architecture set')
    if require_both and set(architectures) != {'arm64', 'amd64'}:
        raise ValueError('Both engine architectures are required for publication')
    for arch, bundle in architectures.items():
        pair = bundle['packages']
        if len(pair) != 2:
            raise ValueError('Only the exact main/VFS pair is accepted')
        for name, p in zip(NAMES, pair):
            if (p['name'], p['version'], p['architecture'], p['file']) != (
                    name, VERSION, arch, f'{name}_{VERSION}_{arch}.deb'):
                raise ValueError('Unexpected engine package identity')
        for p in pair+[bundle['correspondingSource'], bundle['buildInventory']]:
            if not re.fullmatch(r'[A-Za-z0-9_.+~-]+', p['file']) or not DIGEST.fullmatch(p['sha256']) or not 0 < p['size'] <= LIMIT:
                raise ValueError('Invalid engine artifact identity/size')
    return manifest


def verify_files(bundle, directory):
    for record in bundle['packages']+[bundle['correspondingSource'], bundle['buildInventory']]:
        p = directory/record['file']
        if p.is_symlink() or not p.is_file() or identity(p) != {k:record[k] for k in ('file','sha256','size')}:
            raise ValueError('Engine artifact differs: '+str(p))


def merge(inputs, output):
    combined = None
    # Validate every input before emitting an assembled candidate.
    for directory in inputs:
        m = validate(json.loads((directory/'engine-manifest.json').read_text()))
        if combined is None:
            combined = {'source':m['source'], 'architectures':{}}
        if combined['source'] != m['source']:
            raise ValueError('Architectures were built from different recipes/sources')
        for arch,bundle in m['architectures'].items():
            if arch in combined['architectures']:
                raise ValueError('Duplicate engine architecture')
            verify_files(bundle,directory)
            combined['architectures'][arch] = bundle
    validate(combined, require_both=True)
    output.mkdir(parents=True, exist_ok=False)
    for directory in inputs:
        m = json.loads((directory/'engine-manifest.json').read_text())
        for arch,bundle in m['architectures'].items():
            dest=output/arch;dest.mkdir()
            records=bundle['packages']+[bundle['correspondingSource'],bundle['buildInventory']]
            for record in records:
                shutil.copyfile(directory/record['file'],dest/record['file'])
            shutil.copyfile(directory/'COPYRIGHT',dest/'COPYRIGHT')
            (dest/'SHA256SUMS').write_text(''.join(p['sha256']+'  '+p['file']+'\n' for p in records))
    (output/'engine-manifest.json').write_text(json.dumps(combined,indent=2)+'\n')


def embed(manifest, artifacts, arch, destination):
    validate(manifest)
    bundle=manifest['architectures'][arch]
    verify_files(bundle,artifacts/arch)
    destination.mkdir(parents=True,exist_ok=True)
    # Do not silently mix architecture payloads or adopt other build output.
    if any(p.name!='README' for p in destination.iterdir()):
        raise ValueError('Embedding requires a clean generated-assets directory')
    for record in bundle['packages']:
        shutil.copyfile(artifacts/arch/record['file'],destination/record['file'])


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='operation',required=True)
    m=sub.add_parser('merge');m.add_argument('--inputs',type=Path,nargs='+',required=True);m.add_argument('--output',type=Path,required=True)
    v=sub.add_parser('verify');v.add_argument('--directory',type=Path,required=True)
    l=sub.add_parser('lock');l.add_argument('--directory',type=Path,required=True);l.add_argument('--release-lock',type=Path,required=True)
    a=p.parse_args()
    if a.operation=='merge':merge(a.inputs,a.output)
    else:
        manifest=validate(json.loads((a.directory/'engine-manifest.json').read_text()),require_both=True)
        for arch,bundle in manifest['architectures'].items():verify_files(bundle,a.directory/arch)
        if a.operation=='lock':
            lock=json.loads(a.release_lock.read_text());lock['engine']=manifest
            lock.update(qualifiedTargets=[],qualifiedSourceHash='',physicalEvidence=[],userVerified=False)
            a.release_lock.write_text(json.dumps(lock,indent=2)+'\n')
