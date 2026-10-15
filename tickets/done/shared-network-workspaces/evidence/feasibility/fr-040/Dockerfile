# Designer-owned alternate-engine prerequisite, not product/distribution source.
FROM autobyteus/autobyteus-server@sha256:b1411fa6f5004dfe073d4841119a9c5da15c18ea93009fa20d6e312b25cd71d1
USER root
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends build-essential autoconf automake flex bison libtirpc-dev curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN mkdir /tmp/engine && curl -fL --retry 2 https://github.com/unfs3/unfs3/archive/ec1660ba33c80d5c67131e163e68834c1a10e243.tar.gz -o /tmp/engine/source.tar.gz && tar -xzf /tmp/engine/source.tar.gz -C /tmp/engine && cd /tmp/engine/unfs3-* && autoreconf -fi && ./configure --prefix=/opt/ab-probe-unfs && make -j2 && make install && rm -rf /tmp/engine
ENTRYPOINT ["/opt/ab-probe-unfs/sbin/unfsd"]
