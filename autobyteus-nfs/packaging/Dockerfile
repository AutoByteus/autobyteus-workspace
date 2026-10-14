# Same candidate pair as the native CLI; no compiler, stock engine or extra FSAL.
ARG UBUNTU_BASE
FROM ${UBUNTU_BASE}
ARG TARGETARCH
COPY engine-candidate/${TARGETARCH}/ /tmp/autobyteus-engine/
RUN set -eu; cd /tmp/autobyteus-engine; sha256sum -c SHA256SUMS; \
 for name in nfs-ganesha nfs-ganesha-vfs; do \
   file="${name}_4.3-8ubuntu1+autobyteus1_${TARGETARCH}.deb"; \
   test "$(dpkg-deb -f "$file" Package)" = "$name"; \
   test "$(dpkg-deb -f "$file" Version)" = '4.3-8ubuntu1+autobyteus1'; \
   test "$(dpkg-deb -f "$file" Architecture)" = "$TARGETARCH"; \
 done; \
 apt-get update; DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
   /tmp/autobyteus-engine/nfs-ganesha_*.deb /tmp/autobyteus-engine/nfs-ganesha-vfs_*.deb; \
 for name in nfs-ganesha nfs-ganesha-vfs; do \
   test "$(dpkg-query -W -f='${Status} ${Version}' "$name")" = 'install ok installed 4.3-8ubuntu1+autobyteus1'; \
 done; \
 mkdir -p /run/ganesha /var/lib/ganesha /export /usr/share/autobyteus-nfs/licenses; \
 cp COPYRIGHT /usr/share/autobyteus-nfs/licenses/nfs-ganesha; \
 cp engine-build-*.txt SHA256SUMS /usr/share/autobyteus-nfs/; \
 dpkg-query -W > /usr/share/autobyteus-nfs/packages.txt; \
 rm -rf /var/lib/apt/lists/* /tmp/autobyteus-engine
COPY engine-candidate/engine-manifest.json /usr/share/autobyteus-nfs/engine-manifest.json
COPY autobyteus-nfs/THIRD_PARTY_NOTICES /usr/share/autobyteus-nfs/THIRD_PARTY_NOTICES
EXPOSE 2049/tcp
ENTRYPOINT ["/usr/bin/ganesha.nfsd", "-F", "-f", "/etc/ganesha/ganesha.conf", "-L", "/dev/stdout", "-p", "/run/ganesha/ganesha.pid"]
