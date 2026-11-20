import fs from 'node:fs';
import { startDemoBuildServer } from '/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279/autobyteus-web/tests/e2e/fixtures/demo-build-server.mjs';
const s = await startDemoBuildServer('/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279/autobyteus-web/dist-mobile-demo/public');
fs.writeFileSync('/tmp/abt279b/base.txt', s.baseUrl);
setInterval(() => {}, 1 << 30);
