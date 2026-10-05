import re,glob
rows=[]
for f in glob.glob('log-*.txt'):
    s=open(f,encoding='utf-8',errors='replace').read()
    if 'testFakeNodeOpensAndRestoresWithFakeMobileMarker' not in s: continue
    date=s[1:17] if s.startswith('﻿') else s[:16]
    fail='FAIL' if re.search(r'AutoByteusMobileUITests\.swift:\d+: error|Failed to synthesize',s) else 'pass'
    lines=s.splitlines()
    gaps=[]
    for i,l in enumerate(lines):
        m=re.search(r't = +([0-9.]+)s +Launch org\.autobyteus\.mobile',l)
        if m:
            for l2 in lines[i+1:i+4]:
                m2=re.search(r't = +([0-9.]+)s',l2)
                if m2: gaps.append(round(float(m2.group(1))-float(m.group(1)))); break
    dur=re.findall(r"testFakeNodeOpensAndRestoresWithFakeMobileMarker\]' (?:passed|failed) \(([0-9.]+) seconds",s)
    unit=re.findall(r"testUnreachableNodeShowsNativeDiagnostic\w*\]' (?:passed|failed) \(([0-9.]+) seconds",s)
    rows.append((date,fail,gaps[:3],dur,unit,f))
for r in sorted(rows): print(r[0],r[1],'launch→next(s):',r[2],'fakeNode test(s):',r[3],'unreachable test(s):',r[4])
