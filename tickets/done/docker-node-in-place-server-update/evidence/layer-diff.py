"""Measure what a Docker node downloads when it upgrades from one release image to the next.

Reads the per-architecture image manifests saved in this folder (man-<tag>.json) and prints, for each
consecutive pair, the layers the newer image adds (layers the older image does not have) and their
compressed size: what `docker pull` downloads on a machine that already has the older image.

Refresh the manifests (linux/arm64 shown; take the digest from idx-<tag>.json for another arch):
  docker buildx imagetools inspect --raw autobyteus/autobyteus-server:<tag> > idx-<tag>.json
  docker buildx imagetools inspect --raw autobyteus/autobyteus-server@<arm64-digest> > man-<tag>.json
Run: python3 -I layer-diff.py <dir> <tag> <tag> ...
"""
import json
import sys
from pathlib import Path

folder = Path(sys.argv[1])
tags = sys.argv[2:]
layers = {tag: json.loads((folder / f"man-{tag}.json").read_text())["layers"] for tag in tags}
for tag in tags:
    print(f"{tag}: {len(layers[tag])} layers, {sum(l['size'] for l in layers[tag]) / 1e6:.1f} MB compressed")
for older, newer in zip(tags, tags[1:]):
    known = {l["digest"] for l in layers[older]}
    added = [(i, l) for i, l in enumerate(layers[newer]) if l["digest"] not in known]
    print(f"{older} -> {newer}: {len(added)} new layers, {sum(l['size'] for _, l in added) / 1e6:.1f} MB to download")
    for index, layer in added:
        if layer["size"] > 1e6:
            print(f"   layer {index}: {layer['size'] / 1e6:.1f} MB")
