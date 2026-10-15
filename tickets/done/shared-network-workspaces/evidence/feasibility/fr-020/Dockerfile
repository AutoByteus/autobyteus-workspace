# Designer-owned disposable component service, not product code.
FROM ubuntu:24.04@sha256:534baea6a22c03a63003dbc8dbe78fe34bc0d7e595d9a9dc9834884ff530eb55
LABEL org.autobyteus.task="shared-network-workspaces" org.autobyteus.probe="fr-020"
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends nfs-ganesha nfs-ganesha-vfs nfs-common rpcbind python3 git procps iproute2 ca-certificates && rm -rf /var/lib/apt/lists/*
CMD ["sleep", "infinity"]
