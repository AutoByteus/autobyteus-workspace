#!/usr/bin/env python3
"""Prints the per-file failure inventory from a vitest JSON report (evidence helper)."""
import json, re, sys
d = json.load(open(sys.argv[1]))
print(f"total={d['numTotalTests']} passed={d['numPassedTests']} failed={d['numFailedTests']} skipped={d['numPendingTests']}")
for f in d['testResults']:
    fails = [a for a in f['assertionResults'] if a['status'] == 'failed']
    if fails or f['status'] == 'failed':
        print('##', f['name'].split('autobyteus-server-ts/')[-1], len(fails) or 'suite-error')
        for a in fails:
            m = (a['failureMessages'][0] if a['failureMessages'] else '').split('\n')[0]
            print('   -', a['title'][:90], '|', re.sub(r'/Users/\S+', '<path>', m)[:150])
