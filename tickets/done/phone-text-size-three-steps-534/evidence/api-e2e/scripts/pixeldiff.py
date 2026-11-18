# autobyteus-534 API/E2E (from autobyteus-525) API-05 (temporary): pixel difference of each screen of two walks (base vs head at Standard).
# Usage: python3 pixeldiff.py <walks dir> <labelA> <labelB> <outDir>  -> per screen: differing pixels, their bounding box
# (CSS px = image px / 2) and a diff image (differences in red over a faded copy of B).
import sys, json, os, glob
from PIL import Image, ImageChops
walks, a, b, out = sys.argv[1:5]
res = {}
for fa in sorted(glob.glob(os.path.join(walks, f'{a}-*.png'))):
    screen = os.path.basename(fa)[len(a) + 1:-4]
    fb = os.path.join(walks, f'{b}-{screen}.png')
    if not os.path.exists(fb): continue
    A, B = Image.open(fa).convert('RGB'), Image.open(fb).convert('RGB')
    if A.size != B.size: res[screen] = {'size': [A.size, B.size]}; continue
    d = ImageChops.difference(A, B).convert('L').point(lambda v: 255 if v > 24 else 0)
    box = d.getbbox(); n = sum(1 for v in d.getdata() if v)
    res[screen] = {'pixels': n, 'bboxCss': [round(v / 2) for v in box] if box else None}
    if box:
        faded = Image.blend(B, Image.new('RGB', B.size, 'white'), 0.6); faded.paste((220, 0, 0), mask=d)
        faded.save(os.path.join(out, f'{os.environ.get("DIFF_PREFIX", "API-05-diff")}-{screen}.png'))
print(json.dumps(res, indent=1))
