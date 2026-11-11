#!/usr/bin/env python3
# autobyteus-472 API/E2E round 5 (temporary): reads the last `pinch` or `dtap` step in a journey transcript and reports
# whether the document point under the fingers stayed under them: as fractions of the scrolled size,
# y = (scrollTop + cy - 48 [the scroller's top]) / scrollHeight and x = (scrollLeft + cx) / scrollWidth, before and after.
# Usage: anchor.py <journey.md> <cx> <cy>
import json, re, sys
text = open(sys.argv[1]).read(); cx, cy = float(sys.argv[2]), float(sys.argv[3])
block = re.findall(r'## (\S+) · step ((?:pinch|dtap) [^\n]*?) · ([^ ]+) · exit \d+\n```json\n(.*?)\n```', text, re.S)[-1]
d = json.loads(block[3]); b = d['before']; a = d.get('settled') or d.get('after')
fy = lambda v: (v['scroll']['top'] + cy - 48) / v['scroll']['height']
fx = lambda v: (v['scroll']['left'] + cx) / v['scroll']['width']
print(f"{block[1]}: width {b['pagesCssWidth']} -> {a['pagesCssWidth']}, scroll {(b['scroll']['left'], b['scroll']['top'])} -> {(a['scroll']['left'], a['scroll']['top'])}, "
      f"page {b['firstVisiblePage']} -> {a['firstVisiblePage']}; point under the fingers y {fy(b):.4f} -> {fy(a):.4f} (Δ {abs(fy(a)-fy(b))*a['scroll']['height']:.0f} px), "
      f"x {fx(b):.4f} -> {fx(a):.4f}; sharp {a['allBitmapsMatch']}")
