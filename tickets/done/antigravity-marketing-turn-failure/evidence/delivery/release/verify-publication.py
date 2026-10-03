"""Check documented stable publication surfaces without installing/restarting apps."""
import datetime, hashlib, json, re, subprocess, urllib.parse, urllib.request
from pathlib import Path

out = Path(__file__).resolve().parent
repo, version = 'AutoByteus/autobyteus-workspace', '1.4.93'
tag, release_sha = 'v' + version, '1b976216da0cbd0cc84fef3fe22a2739325b8ad3'

def api(path):
    return json.loads(subprocess.check_output(['gh', 'api', path]))

def get(url, headers=None):
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers or {}), timeout=90) as response:
        return response.read(), dict(response.headers)

rel = api(f'repos/{repo}/releases/tags/{tag}')
latest = api(f'repos/{repo}/releases/latest')
for name, data in [('github-release.json', rel), ('stable-latest-after.json', latest)]:
    (out / name).write_text(json.dumps(data, indent=2) + '\n')
assert rel['tag_name'] == tag and not rel['draft'] and not rel['prerelease']
assert latest['tag_name'] == tag and latest['id'] == rel['id']
assert rel['body'].strip() == (out.parents[2] / 'release-notes.md').read_text().strip()
assets = {asset['name']: asset for asset in rel['assets']}
expected = []
for arch in ['arm64', 'x64']:
    base = f'AutoByteus_personal_macos-{arch}-{version}'
    expected += [base + suffix for suffix in ['.dmg', '.dmg.blockmap', '.zip', '.zip.blockmap']]
expected += [f'AutoByteus_personal_linux-{arch}-{version}.AppImage' for arch in ['arm64', 'x64']]
expected += [f'AutoByteus_personal_windows-{version}.exe', f'AutoByteus_personal_android-{version}-release.apk', f'AutoByteus_personal_android-{version}-release.apk.sha256', 'latest-mac.yml', 'latest-linux.yml', 'latest-linux-arm64.yml', 'latest.yml']
assert not set(expected) - set(assets), sorted(set(expected) - set(assets))
assert all(assets[name]['size'] > 0 and assets[name]['state'] == 'uploaded' for name in expected)
metadata = out / 'updater-metadata'
metadata.mkdir(exist_ok=True)
for name in ['latest-mac.yml', 'latest-linux.yml', 'latest-linux-arm64.yml', 'latest.yml']:
    subprocess.run(['gh', 'release', 'download', tag, '--repo', repo, '--pattern', name, '--dir', str(metadata), '--clobber'], check=True)
    text = (metadata / name).read_text()
    assert re.search(r'^version:\s*[\'\"]?1\.4\.93[\'\"]?\s*$', text, re.M), name
    for url in re.findall(r'^\s*(?:-\s*)?url:\s*(.+?)\s*$', text, re.M):
        assert url.strip('\'\"') in assets, (name, url)
assert 'macos-arm64' in (metadata / 'latest-mac.yml').read_text() and 'macos-x64' in (metadata / 'latest-mac.yml').read_text()
clone = Path('/Users/normy/autobyteus_org/autobyteus-worktrees/antigravity-runtime-error-stable-release')
checks = []
for name, arch in [('latest-linux.yml', 'linux-x64'), ('latest-linux-arm64.yml', 'linux-arm64')]:
    command = ['python3', str(clone / 'scripts/validate_linux_updater_metadata.py'), '--metadata', str(metadata / name), '--arch-token', arch]
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    checks.append({'command': ' '.join(command), 'exitCode': result.returncode, 'output': result.stdout.strip()})
subprocess.run(['gh', 'release', 'download', tag, '--repo', repo, '--pattern', f'*{version}-release.apk.sha256', '--dir', str(metadata), '--clobber'], check=True)
apk = f'AutoByteus_personal_android-{version}-release.apk'
sha = re.match(r'([0-9a-f]{64})', (metadata / (apk + '.sha256')).read_text()).group(1)
assert assets[apk]['digest'] == 'sha256:' + sha
# Anonymous public registry token stays in memory; never output or persist it.
auth_url = 'https://auth.docker.io/token?' + urllib.parse.urlencode({'service': 'registry.docker.io', 'scope': 'repository:autobyteus/autobyteus-server:pull'})
token = json.loads(get(auth_url)[0])['token']
manifests = {}
for name in [version, 'latest', 'beta']:
    raw, headers = get('https://registry-1.docker.io/v2/autobyteus/autobyteus-server/manifests/' + name, {'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json'})
    digest = headers.get('Docker-Content-Digest') or headers.get('docker-content-digest')
    assert digest == 'sha256:' + hashlib.sha256(raw).hexdigest()
    document = json.loads(raw)
    platforms = [item.get('platform', {}) for item in document['manifests']]
    assert {'amd64', 'arm64'} <= {platform.get('architecture') for platform in platforms if platform.get('os') == 'linux'}
    manifests[name] = {'digest': digest, 'mediaType': document.get('mediaType'), 'platforms': platforms}
assert len({item['digest'] for item in manifests.values()}) == 1, manifests
(out / 'docker-publication-verification.json').write_text(json.dumps({'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'image': 'autobyteus/autobyteus-server', 'tags': manifests, 'versionLatestBetaSameDigest': True, 'anonymousTokenPersisted': False}, indent=2) + '\n')
matrix = json.loads((out / 'workflow-matrix.json').read_text())
assert len(matrix['runs']) == 4 and all(run['status'] == 'completed' and run['conclusion'] == 'success' and run['headSha'] == release_sha and run['event'] == 'push' for run in matrix['runs'])
ios = next(run for run in matrix['runs'] if run['name'] == 'iOS App Store Connect Release')
upload = next(step for job in ios['jobs'] for step in job['steps'] if step['name'] == 'Upload IPA to App Store Connect/TestFlight')
assert upload['conclusion'] == 'success'
ios_artifacts = api(f"repos/{repo}/actions/runs/{ios['databaseId']}/artifacts")
assert any(item['name'] == 'ios-app-store-connect-artifacts' and item['size_in_bytes'] > 0 and not item['expired'] for item in ios_artifacts['artifacts'])
(out / 'ios-workflow-artifacts.json').write_text(json.dumps(ios_artifacts, indent=2) + '\n')
result = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'tag': tag, 'releaseCommit': release_sha, 'githubReleaseUrl': rel['html_url'], 'draft': False, 'prerelease': False, 'stableLatestTag': latest['tag_name'], 'curatedNotesExactMatch': True, 'expectedAssets': expected, 'uploadedAssetCount': len(assets), 'assetSizesAndStatesValid': True, 'androidSha256SidecarMatchesGithubAssetDigest': True, 'updaterMetadataVersionAndAssetReferencesValid': True, 'linuxMetadataChecks': checks, 'dockerVersionLatestBetaDigest': manifests[version]['digest'], 'dockerLinuxArchitectures': ['amd64', 'arm64'], 'allFourPushWorkflowsSuccessful': True, 'iosTestFlightUploadStep': 'success', 'iosPublishArtifactPresent': True, 'publicAppStoreReviewOrAvailability': 'External — not claimed', 'localInstalledAppOrUserNodeMutated': False, 'binaryRuntimeOrLiveProviderRecoveryValidation': 'Not claimed; CI packaging and owned earlier runtime scope remain distinct'}
(out / 'publication-verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
