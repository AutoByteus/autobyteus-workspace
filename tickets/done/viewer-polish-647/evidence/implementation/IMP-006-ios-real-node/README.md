# IMP-006: the iOS app against a real node: the player's close paths, the phone PDF, the empty reference (AC-002, AC-003, AC-005 phone)

- Commit: `da70e7f049` (working tree equal), on `9072eb89c4`'s web (the production phone bundle built from it).
- Environment: my own simulator (as IMP-005); builds `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web`; one fresh `native-video-node.mjs` stack per class (`--origin-host=<LAN IP> --listen-host=<LAN IP> --secrets-file=<tmp>/…`, its secrets file outside the evidence, mode 600), stopped through its control port after each class. The node runs on its own data root; nothing of the user's.
- Date: 2026-11-25.
- Result: **Pass**: 10/10 and 8/8.

## Commands

```
node autobyteus-web/tests/e2e/native-video-node.mjs --output-dir=<tmp>/rn-<class>/stack --origin-host=<LAN IP> --listen-host=<LAN IP> --secrets-file=<tmp>/rn-<class>/secrets.json
TEST_RUNNER_AUTOBYTEUS_574_REAL_NODE_INFO=<stack-info.json> TEST_RUNNER_AUTOBYTEUS_574_REAL_NODE_SECRETS=<secrets.json> \
  xcodebuild … -only-testing:AutoByteusMobileUITests/<class> test
```

## NativeMediaRealNodeUITests (10/10)

`test0PairsWithTheNodeByItsLink`, `testAAnMP3FromTheChatLinkPlaysInTheAppsPlayer`, `testBTheMP3ReopenedFetchesOnlyTheProbe`, `testCAnM4AOverASlowerLinkSeeksByRange`, `testDATeamsMediaReferencesPlayInTheAppsPlayer`, `testEAMediaReferenceStaysAsItIsWhileMessagesArrive`, `testFTheOtherReferencesShowInThePage`, `testGOggAndWebMStayInThePage`, `testHEachWayToLeaveThePlayerClosesIt` (a swipe down, then iOS's close: each closes iOS's player and the app's screen), `testZRemovingTheNodeFromTheApp`: all passed.

- `phone-pdf-ref-642.png`: the Team's PDF reference drawn in the iOS app's page (WKWebView, production phone bundle) through the shared pdf.js worker (D-5, SR-002).
- `phone-empty-video-reference.png`: the zero-byte `.mp4` reference (D-2): no error in the page; the app's player screen opens and, with nothing to play, says "This video could not be played." with Back (AC-002: "the native player opens (apps)"). testF now asserts this and closes it with Back. Before this change testF's comment expected a page error, and its page-Back step passed that row only because it was the last one.

The first run of this class (before the testF change) also passed 10/10; the run above is after it.

## NativeVideoRealNodeUITests (8/8)

`test0PairsWithTheNodeByItsLink`, `testAWideVideoFromTheChatLink`, `testBDeliversInRealTimeOverASlowerLink`, `testBSkipForwardPlaysOn`, `testCTallVideoFromFilesStaysPortrait`, `testDARewriteDoesNotOpenThePlayerByItself`, `testEThePlayersOwnCloseButton`, `testZRemovingTheNodeFromTheApp`: all passed. These close through iOS's player now (`closePlayer`), as no app Back shows on a playing file.

## Not run

`scripts/ios-simulator-smoke.sh`: it skips all four media classes, and 647 changes only the media screen and the loader's queue label; its default device is another agent's booted simulator.
