# O-4 controls (round 3, delivery's request)

Same simulator (`api574-o4`, iPhone 17, iOS 26.1), same stack, same video (`wide-574.mp4`, 22,867,306 bytes, SHA-256 9e5ad17c149b1005…; the plain copy is byte-identical).
Temporary, uncommitted harness changes, all reverted before the commit:
- a launch-environment switch in `NativeVideoPlayer.start` that plays a local file with no loader;
- loader logging;
- an `isEntireLengthAvailableOnDemand` switch;
- two control test files.

- (a) `strip-A.png` (loader, first open), `strip-C.png` (loader, fully cached): frozen at 15.533 after the AVKit scrubber drag. `strip-B.png`, `strip-D.png` (plain file, the same screen and drag): plays on 15.367 → 21.867. `a-ui-runs.log`.
- (b), (c) `b-c-frames-and-bytes.log`: loader frames pixel-identical to the file's after 6 precise seeks and 105 frames after a scrub-like burst; 72 served ranges; the cache's 16.6 MB in 5 ranges byte-identical to the file.
- `loader-requests-during-scrub.txt`: from the cache the loader answers the whole file at once; AVFoundation makes no request during or after the scrub (nothing pending).
- `strip-E.png`, `strip-C2-E2.png`, `on-demand-runs.log`: with `contentInformationRequest.isEntireLengthAvailableOnDemand = true` the same drag plays on (2/2); without it, frozen again (C2, 16.000).
- `picture-check.log`: the durable check added to `testAWideVideoFromTheChatLink` fails on the shipped loader and reads "moves" on the plain file and the loader with the flag.
