# Release Notes

## Fixes

- Fixed `autobyteus-docker upgrade --all` so mixed Docker fleets keep each node's saved image ref by default, including `latest-zh` nodes, instead of retargeting every node to the default `latest` image.
- Kept intentional all-node retargeting available through explicit `--tag` or `--image` options and updated launcher guidance to make that distinction clear.
