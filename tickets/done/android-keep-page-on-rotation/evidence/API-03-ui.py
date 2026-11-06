#!/usr/bin/env python3
"""autobyteus-415 API/E2E: minimal uiautomator helper for the emulator.
Usage: ui.py texts              -> visible texts / descriptions with bounds
       ui.py tap <substring>    -> tap the first node whose text or content-desc contains <substring>
       ui.py find <substring>   -> print the node's text, class and bounds (no tap)
"""
import re, subprocess, sys, xml.etree.ElementTree as ET
ADB = __import__('os').path.expanduser('~/Library/Android/sdk/platform-tools/adb')

def dump():
    subprocess.run([ADB, 'shell', 'uiautomator', 'dump', '/sdcard/abx415-ui.xml'], check=True, capture_output=True)
    xml = subprocess.run([ADB, 'shell', 'cat', '/sdcard/abx415-ui.xml'], check=True, capture_output=True, text=True).stdout
    return ET.fromstring(xml)

def nodes(root):
    for n in root.iter('node'):
        label = n.get('text') or n.get('content-desc') or ''
        yield n, label

def center(bounds):
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', bounds))
    return (x1 + x2) // 2, (y1 + y2) // 2

cmd = sys.argv[1]
root = dump()
if cmd == 'texts':
    for n, label in nodes(root):
        if label.strip():
            print(f"{label[:110]!r} [{n.get('class').rsplit('.', 1)[-1]}] {n.get('bounds')}")
else:
    needle = sys.argv[2]
    for n, label in nodes(root):
        if needle in label:
            if cmd == 'find':
                print(f"{label[:200]!r} [{n.get('class')}] {n.get('bounds')} checked={n.get('checked')}")
            else:
                x, y = center(n.get('bounds'))
                subprocess.run([ADB, 'shell', 'input', 'tap', str(x), str(y)], check=True)
                print(f"tapped {label[:60]!r} at {x},{y}")
            break
    else:
        print(f"not found: {needle!r}")
        sys.exit(1)
