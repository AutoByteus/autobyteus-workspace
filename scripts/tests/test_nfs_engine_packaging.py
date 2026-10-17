"""Durable source/manifest/embed/qualification fixtures, no download/root/Docker.
Run python3 -m unittest scripts/tests/test_nfs_engine_packaging.py -v.
Fixture .deb bytes are not native engine qualification; actual recipe build is separate.
"""
import copy
import hashlib
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[2]
ENGINE=ROOT/'autobyteus-nfs/packaging/engine'
sys.path.insert(0,str(ENGINE))
import manifest
import source
spec=importlib.util.spec_from_file_location('nfs_release',ROOT/'autobyteus-nfs/packaging/release.py')
release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)


def fixture(directory,arch):
    directory.mkdir()
    pairs=[]
    for name in source.NAMES:
        p=directory/f'{name}_{source.VERSION}_{arch}.deb';p.write_bytes((name+arch).encode())
        pairs.append(source.identity(p)|{'name':name,'version':source.VERSION,'architecture':arch})
    src=directory/f'corresponding-{arch}.tar.gz';src.write_bytes(b'full-source-fixture')
    inv=directory/f'build-{arch}.txt';inv.write_text('build-inventory-fixture')
    (directory/'COPYRIGHT').write_text('notices fixture')
    m={'source':source.source_identity('ubuntu:24.04@sha256:'+'a'*64),'architectures':{arch:{
        'packages':pairs,'correspondingSource':source.identity(src),'buildInventory':source.identity(inv)}}}
    (directory/'engine-manifest.json').write_text(json.dumps(m));return m


class EnginePackagingTest(unittest.TestCase):
    def test_backport_is_only_two_fields_with_correct_provenance(self):
        p=ENGINE/'get-dir-delegation.patch';self.assertEqual(source.sha(p),source.LOCK['patchSha256'])
        lines=p.read_text().splitlines()
        added=[s for s in lines if s.startswith('+') and not s.startswith('+++')]
        removed=[s for s in lines if s.startswith('-') and not s.startswith('---')]
        self.assertEqual(len(added),2);self.assertEqual(len(removed),2)
        self.assertTrue(all('nfs4_op_notsupp' in x for x in added));self.assertTrue(all('nfs4_op_illegal' in x for x in removed))
        self.assertIn('98eb77c4fd94effa6882b214698a77752ec79f6e',p.read_text())
        self.assertNotIn('template',p.read_text());self.assertEqual(source.LOCK['sourceDateEpoch'],1791936000)

    def test_merge_embed_same_bytes_and_reject_mixed_inputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);a=fixture(root/'a','arm64');fixture(root/'b','amd64')
            manifest.merge([root/'a',root/'b'],root/'merged')
            m=json.loads((root/'merged/engine-manifest.json').read_text())
            self.assertEqual(set(m['architectures']),{'arm64','amd64'})
            manifest.embed(m,root/'merged','arm64',root/'assets')
            self.assertEqual(len(list((root/'assets').iterdir())),2)
            for p in (root/'assets').iterdir():self.assertEqual(p.read_bytes(),(root/'merged/arm64'/p.name).read_bytes())
            with self.assertRaises(ValueError):manifest.embed(m,root/'merged','arm64',root/'assets')
            with self.assertRaises(ValueError):manifest.merge([root/'a',root/'a'],root/'duplicate')
            changed=copy.deepcopy(a);changed['source']['patchCommit']='wrong'
            with self.assertRaises(ValueError):manifest.validate(changed)
            with self.assertRaises(ValueError):manifest.validate(a,require_both=True)

    def test_artifact_mutations_fail_before_embed(self):
        for mode in ['truncated','digest','architecture','name','version','path','size','source-missing','recipe']:
            with self.subTest(mode=mode),tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);m=fixture(root/'arm64','arm64');bundle=m['architectures']['arm64'];p=bundle['packages'][0]
                if mode=='truncated':(root/'arm64'/p['file']).write_bytes(b'x')
                if mode=='digest':p['sha256']='b'*64
                if mode=='architecture':p['architecture']='amd64'
                if mode=='name':p['name']='nfs-ganesha-ceph'
                if mode=='version':p['version']='4.3-8ubuntu1'
                if mode=='path':p['file']='../escape.deb'
                if mode=='size':p['size']=manifest.LIMIT+1
                if mode=='source-missing':(root/'arm64'/bundle['correspondingSource']['file']).unlink()
                if mode=='recipe':m['source']['recipeSha256']='0'*64
                with self.assertRaises((ValueError,FileNotFoundError)):manifest.embed(m,root,'arm64',root/'assets')
                self.assertFalse((root/'assets').exists())

    def test_engine_bytes_part_of_source_hash_and_stale_qualification_clears(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);m=fixture(root/'arm64','arm64')
            lock=json.loads((ROOT/'autobyteus-nfs/packaging/release-lock.json').read_text())
            lock.update(engine=m,qualifiedTargets=['linux-arm64'],qualifiedSourceHash='old')
            p=root/'release-lock.json';p.write_text(json.dumps(lock))
            with patch.object(release,'LOCK',p):
                before=release.source_hash();changed=copy.deepcopy(m);changed['architectures']['arm64']['packages'][0]['sha256']='b'*64
                self.assertNotEqual(before,release.source_hash(changed))
                out=root/'release.json'
                with patch.object(sys,'argv',['release.py','--tag','v1.2.3','--output',str(out)]):release.main()
                self.assertEqual(json.loads(out.read_text())['qualifiedTargets'],[])
                with patch.object(sys,'argv',['release.py','--tag','v1.2.3','--target','linux-arm64']):
                    with self.assertRaises(SystemExit):release.main()

    def test_pipeline_pair_reuse_and_size_gate(self):
        w=(ROOT/'.github/workflows/release-nfs.yml').read_text()
        self.assertIn('candidate_run_id:',w);self.assertIn('run-id: ${{ inputs.candidate_run_id }}',w)
        self.assertIn("if: needs.prepare.outputs.publish != 'true'",w)
        self.assertIn('manifest.py verify --directory engine-candidate',w)
        self.assertIn('100*1024*1024',w);self.assertIn('autobyteus-nfs-ganesha-source-',w)
        d=(ROOT/'autobyteus-nfs/packaging/Dockerfile').read_text()
        self.assertIn('COPY engine-candidate/${TARGETARCH}/',d);self.assertIn('sha256sum -c SHA256SUMS',d)
        self.assertNotIn('GANESHA_VERSION',d);self.assertNotIn('build-essential',d)
        self.assertNotIn('nfs-ganesha',json.loads((ROOT/'autobyteus-nfs/packaging/release-lock.json').read_text())['ubuntuPackages'])


if __name__=='__main__':unittest.main()
