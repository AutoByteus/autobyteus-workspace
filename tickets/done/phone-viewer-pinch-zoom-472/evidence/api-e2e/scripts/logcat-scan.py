#!/usr/bin/env python3
# autobyteus-472 API/E2E (temporary): scans the emulator's logcat (the capture through the whole journey and a final dump of
# the device's buffer) for what REQ-005 says never goes into a log: the phone credential (mra_…), the probe's owner
# credential, the pairing link's one-time code, the saved files' names, and the files' bytes (base64 of "%PDF-" /
# the PNG signature, and the first 24 base64 characters of each saved file). Prints counts and, for the app's own process,
# its log tags; never prints a secret.
import json, re, base64, sys, collections
state = json.load(open('/tmp/abtest472/state.json'))
link = open('/tmp/abtest472/pairing-link.txt').read().strip()
code = re.search(r'pairing=([^&\s]+)', link).group(1)
lines = []
for f in ('/tmp/abtest472/logcat-full.txt', '/tmp/abtest472/logcat-dump.txt'):
    lines += open(f, encoding='utf-8', errors='replace').read().splitlines()
text = '\n'.join(lines)
first24 = {}
for k, p in state['files'].items():
    first24[k] = base64.b64encode(open(p, 'rb').read()[:18]).decode()
checks = {
    'phone credential (mra_ + 20 chars)': len(re.findall(r'mra_[A-Za-z0-9_-]{20,}', text)),
    'owner credential (own_ + 20 chars)': len(re.findall(r'own_[A-Za-z0-9_-]{20,}', text)),
    "the probe's owner credential itself": text.count(state['owner']),
    'pairing one-time code': text.count(code),
    'access_token=': text.count('access_token='),
    'authorization / bearer': len(re.findall(r'(?i)authorization|bearer ', text)),
    'base64 of %PDF- (JVBERi0)': text.count('JVBERi0'),
    'base64 of the PNG signature (iVBORw0)': text.count('iVBORw0'),
}
for k, b in first24.items(): checks[f'first 24 base64 chars of {k}'] = text.count(b)
names = {n: text.count(n) for n in ('photo-472.png', 'resume-472.pdf', 'big-472.pdf', 'control-472.pdf')}
pids = set()
for l in lines:
    m = re.match(r'\S+ \S+\s+(\d+)\s+\d+ \w (.*?):', l)
    if m and 'org.autobyteus.mobile' in l and 'ActivityManager' in l: pass
app_pid = None
for l in lines:
    m = re.search(r'Start proc (\d+):org\.autobyteus\.mobile/', l)
    if m: app_pid = m.group(1)
app_tags = collections.Counter()
for l in lines:
    m = re.match(r'\S+ \S+\s+(\d+)\s+\d+ (\w) (.*?)\s*:', l)
    if m and app_pid and m.group(1) == app_pid: app_tags[f'{m.group(2)} {m.group(3)}'] += 1
name_lines = [re.sub(r'^\S+ \S+\s+', '', l)[:220] for l in lines if any(n in l for n in names)]
print(json.dumps({'lines_scanned': len(lines), 'checks': checks, 'saved file names': names,
                  'lines naming a saved file (who logged them)': name_lines[:12], 'app pid': app_pid, 'app process log tags': app_tags.most_common(25)}, indent=1))
