#!/usr/bin/env python3
"""autobyteus-407 API/E2E: minimal uiautomator helper (native screens and system UI only).
Usage: ui.py texts | tap <substring> | find <substring>"""
import os, re, subprocess, sys, xml.etree.ElementTree as ET
ADB = os.path.expanduser('~/Library/Android/sdk/platform-tools/adb')
subprocess.run([ADB, 'shell', 'uiautomator', 'dump', '/sdcard/abx407-ui.xml'], check=True, capture_output=True)
root = ET.fromstring(subprocess.run([ADB, 'shell', 'cat', '/sdcard/abx407-ui.xml'], check=True, capture_output=True, text=True).stdout)
cmd = sys.argv[1]
for n in root.iter('node'):
    label = n.get('text') or n.get('content-desc') or ''
    if cmd == 'texts':
        if label.strip(): print(f"{label[:110]!r} [{n.get('class').rsplit('.', 1)[-1]}] {n.get('bounds')}")
        continue
    if sys.argv[2] in label:
        if cmd == 'find': print(f"{label[:200]!r} [{n.get('class')}] {n.get('bounds')}"); break
        x1, y1, x2, y2 = map(int, re.findall(r'\d+', n.get('bounds')))
        subprocess.run([ADB, 'shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2)], check=True)
        print(f"tapped {label[:60]!r}"); break
else:
    if cmd != 'texts': print(f"not found: {sys.argv[2]!r}"); sys.exit(1)
