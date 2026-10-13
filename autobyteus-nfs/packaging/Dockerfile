# Only Linux storage hosting. No entire-host, credentials or Docker-socket mounts.
ARG UBUNTU_BASE
FROM ${UBUNTU_BASE}
ARG GANESHA_VERSION
RUN test -n "$GANESHA_VERSION" && apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    "nfs-ganesha=$GANESHA_VERSION" "nfs-ganesha-vfs=$GANESHA_VERSION" \
 && mkdir -p /run/ganesha /var/lib/ganesha /export /usr/share/autobyteus-nfs/licenses \
 && cp /usr/share/doc/nfs-ganesha/copyright /usr/share/autobyteus-nfs/licenses/nfs-ganesha \
 && cp /usr/share/doc/nfs-ganesha-vfs/copyright /usr/share/autobyteus-nfs/licenses/nfs-ganesha-vfs \
 && dpkg-query -W > /usr/share/autobyteus-nfs/packages.txt \
 && rm -rf /var/lib/apt/lists/*
COPY autobyteus-nfs/THIRD_PARTY_NOTICES /usr/share/autobyteus-nfs/THIRD_PARTY_NOTICES
EXPOSE 2049/tcp
ENTRYPOINT ["/usr/bin/ganesha.nfsd", "-F", "-f", "/etc/ganesha/ganesha.conf", "-L", "/dev/stdout", "-p", "/run/ganesha/ganesha.pid"]
