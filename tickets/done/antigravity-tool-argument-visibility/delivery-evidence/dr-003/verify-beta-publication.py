"""Verify beta publication surfaces without installing or mutating the user's app/data."""
import datetime, hashlib, json, re, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path

out = Path(__file__).resolve().parent
repo = 'AutoByteus/autobyteus-workspace'
launch = json.loads((out / 'beta-launch.json').read_text())
tag, version, sha = launch['tag'], launch['version'], launch['releaseCommit']
clone = Path(sys.argv[1])

def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path]))

def get(url, headers=None):
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers or {}), timeout=90) as response:
        return response.read(), dict(response.headers)

matrix = json.loads((out / 'workflow-status-final.json').read_text())
required = {'Desktop Release', 'Android APK Release', 'iOS App Store Connect Release', 'Server Docker Release'}
assert len(matrix) == 4 and {r['workflowName'] for r in matrix} == required
assert all(r['event'] == 'push' and r['headSha'] == sha and r['status'] == 'completed' and r['conclusion'] == 'success' for r in matrix)
jobs = []
for row in matrix:
    detail = json.loads(subprocess.check_output(['gh', 'run', 'view', str(row['databaseId']), '--repo', repo,
        '--json', 'databaseId,name,status,conclusion,jobs,event,headSha,attempt,url']))
    assert detail['headSha'] == sha and detail['conclusion'] == 'success'
    jobs.append(detail)
(out / 'workflow-matrix.json').write_text(json.dumps({'runs': jobs}, indent=2) + '\n')
ios = next(r for r in jobs if r['name'] == 'iOS App Store Connect Release')
upload = next(s for j in ios['jobs'] for s in j['steps'] if s['name'] == 'Upload IPA to App Store Connect/TestFlight')
assert upload['conclusion'] == 'success'
ios_artifacts = api(f"repos/{repo}/actions/runs/{ios['databaseId']}/artifacts")
assert any(a['name'] == 'ios-app-store-connect-artifacts' and a['size_in_bytes'] > 0 and not a['expired'] for a in ios_artifacts['artifacts'])
(out / 'ios-workflow-artifacts.json').write_text(json.dumps(ios_artifacts, indent=2) + '\n')

release = api(f'repos/{repo}/releases/tags/{tag}')
latest = api(f'repos/{repo}/releases/latest')
before = json.loads((out / 'stable-release-before.json').read_text())
assert release['tag_name'] == tag and release['prerelease'] and not release['draft']
assert release['body'].strip(), 'Missing generated beta notes'
assert latest['id'] == before['id'] and latest['tag_name'] == before['tag_name']
for name, data in [('github-release.json', release), ('stable-release-after.json', latest)]:
    (out / name).write_text(json.dumps(data, indent=2) + '\n')
assets = {a['name']: a for a in release['assets']}
expected = []
for arch in ['arm64', 'x64']:
    base = f'AutoByteus_personal_macos-{arch}-{version}'
    expected += [base + suffix for suffix in ['.dmg', '.dmg.blockmap', '.zip', '.zip.blockmap']]
expected += [f'AutoByteus_personal_linux-{a}-{version}.AppImage' for a in ['arm64', 'x64']]
apk = f'AutoByteus_personal_android-{version}-release.apk'
expected += [f'AutoByteus_personal_windows-{version}.exe', apk, apk + '.sha256',
             'latest-mac.yml', 'latest-linux.yml', 'latest-linux-arm64.yml', 'latest.yml']
assert not set(expected) - set(assets), sorted(set(expected) - set(assets))
assert all(assets[n]['state'] == 'uploaded' and assets[n]['size'] > 0 for n in expected)
metadata = out / 'updater-metadata'; metadata.mkdir(exist_ok=True)
for name in ['latest-mac.yml', 'latest-linux.yml', 'latest-linux-arm64.yml', 'latest.yml']:
    subprocess.run(['gh', 'release', 'download', tag, '--repo', repo, '--pattern', name, '--dir', str(metadata), '--clobber'], check=True)
    text = (metadata / name).read_text()
    assert re.search(r'^version:\s*[\'\"]?' + re.escape(version) + r'[\'\"]?\s*$', text, re.M), name
    for url in re.findall(r'^\s*(?:-\s*)?url:\s*(.+?)\s*$', text, re.M):
        assert url.strip('\'\"') in assets, (name, url)
assert all(a in (metadata / 'latest-mac.yml').read_text() for a in ['macos-arm64', 'macos-x64'])
linux_checks = []
for name, arch in [('latest-linux.yml', 'linux-x64'), ('latest-linux-arm64.yml', 'linux-arm64')]:
    command = ['python3', str(clone / 'scripts/validate_linux_updater_metadata.py'), '--metadata', str(metadata / name), '--arch-token', arch]
    r = subprocess.run(command, check=True, text=True, capture_output=True)
    linux_checks.append({'command': ' '.join(command), 'exitCode': r.returncode, 'output': r.stdout.strip()})
subprocess.run(['gh', 'release', 'download', tag, '--repo', repo, '--pattern', apk + '.sha256', '--dir', str(metadata), '--clobber'], check=True)
apk_sha = re.match(r'([0-9a-f]{64})', (metadata / (apk + '.sha256')).read_text()).group(1)
assert assets[apk]['digest'] == 'sha256:' + apk_sha
package = json.loads(subprocess.check_output(['git', 'show', f'{tag}:autobyteus-web/package.json'], cwd=clone))
assert package['version'] == version
remote_rows = subprocess.check_output(['git', 'ls-remote', 'origin', f'refs/tags/{tag}*'], cwd=clone, text=True).splitlines()
remote_tags = {line.split()[1]: line.split()[0] for line in remote_rows}
remote_tag_commit = remote_tags.get(f'refs/tags/{tag}^{{}}', remote_tags.get(f'refs/tags/{tag}'))
assert remote_tag_commit == sha

# Public anonymous registry token stays in memory, not logs/artifacts.
u = 'https://auth.docker.io/token?' + urllib.parse.urlencode({'service': 'registry.docker.io', 'scope': 'repository:autobyteus/autobyteus-server:pull'})
token = json.loads(get(u)[0])['token']
manifests = {}
for name in [version, 'beta', 'latest']:
    raw, h = get('https://registry-1.docker.io/v2/autobyteus/autobyteus-server/manifests/' + name,
        {'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json'})
    digest = h.get('Docker-Content-Digest') or h.get('docker-content-digest')
    assert digest == 'sha256:' + hashlib.sha256(raw).hexdigest()
    doc = json.loads(raw); platforms = [m.get('platform', {}) for m in doc['manifests']]
    assert {'amd64', 'arm64'} <= {p.get('architecture') for p in platforms if p.get('os') == 'linux'}
    manifests[name] = {'digest': digest, 'mediaType': doc.get('mediaType'), 'platforms': platforms}
baseline = json.loads((out / 'docker-channels-before.json').read_text())
assert manifests['latest']['digest'] == baseline['tags']['latest']['digest'], 'Stable Docker latest changed'
subprocess.run(['git', 'fetch', '--tags', 'origin'], cwd=clone, check=True, capture_output=True)
newest = subprocess.check_output(['python3', str(clone / 'scripts/release_versions.py'), 'is-newest', tag], cwd=clone, text=True).strip() == 'true'
if newest:
    assert manifests[version]['digest'] == manifests['beta']['digest'], 'Newest beta channel not moved to this version'
assert manifests[version]['digest'] != manifests['latest']['digest']
(out / 'docker-publication-verification.json').write_text(json.dumps({'tags': manifests,
    'newestRecognizedRelease': newest, 'versionBetaSameDigest': manifests[version]['digest'] == manifests['beta']['digest'],
    'stableLatestUnchanged': True, 'anonymousTokenPersisted': False}, indent=2) + '\n')
r = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'tag': tag, 'version': version,
    'releaseCommit': sha, 'githubReleaseUrl': release['html_url'], 'draft': False, 'prerelease': True,
    'tagPackageVersionAndRemoteCommitMatch': True, 'generatedNotesPresent': True,
    'stableGithubLatestUnchanged': latest['tag_name'], 'expectedAssets': expected, 'uploadedAssetCount': len(assets),
    'assetSizesAndStatesValid': True, 'updaterMetadataVersionAndAssetReferencesValid': True,
    'linuxMetadataChecks': linux_checks, 'androidChecksumMatchesGithubDigest': True,
    'dockerVersionDigest': manifests[version]['digest'], 'dockerVersionBetaSameDigest': manifests[version]['digest'] == manifests['beta']['digest'],
    'dockerStableLatestUnchanged': True, 'dockerLinuxArchitectures': ['amd64', 'arm64'],
    'allFourTagPushWorkflowsSuccessful': True, 'iosTestFlightUploadStep': 'success', 'iosPublishArtifactPresent': True,
    'publicAppStoreAvailability': 'External — not claimed', 'userInstalledAppOrDataMutated': False,
    'binaryRuntimeOrUniversalProviderValidation': 'Not claimed; current runtime/test scope and packaging/publication checks are distinct'}
(out / 'publication-verification.json').write_text(json.dumps(r, indent=2) + '\n')
print(json.dumps(r, indent=2))
