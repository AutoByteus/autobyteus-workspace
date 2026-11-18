# Test-owned image for autobyteus-363: the released beta image with this worktree's server package
# (TESTING.md § Docker server nodes: the worktree's package in place of the built-in one).
FROM autobyteus/autobyteus-server:beta
RUN rm -rf /opt/autobyteus/server-package
COPY server-package /opt/autobyteus/server-package
