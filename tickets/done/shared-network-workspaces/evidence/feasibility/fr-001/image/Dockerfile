# Disposable filesystem feasibility image, not product implementation.
FROM ubuntu:24.04
LABEL org.autobyteus.task="shared-network-workspaces" org.autobyteus.probe="fr-001"
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends nfs-ganesha nfs-ganesha-vfs nfs-common rpcbind python3 git procps iproute2 ca-certificates && rm -rf /var/lib/apt/lists/*
CMD ["sleep", "infinity"]
