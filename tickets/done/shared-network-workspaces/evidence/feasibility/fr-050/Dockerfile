# Designer-owned causal patch experiment, not the product/release image.
FROM ab-sf-fr040-unfs:probe
COPY fix-verifier.py /tmp/fix-verifier.py
RUN mkdir /tmp/verifier-source && curl -fL --retry 2 https://codeload.github.com/unfs3/unfs3/tar.gz/ec1660ba33c80d5c67131e163e68834c1a10e243 -o /tmp/verifier-source/source.tar.gz \
 && echo '1fb13de8a15f535c3fea92cc6aaa731b42936a3a29839ec9db4d2833b216ecb5  /tmp/verifier-source/source.tar.gz' | sha256sum -c - \
 && tar -xzf /tmp/verifier-source/source.tar.gz -C /tmp/verifier-source \
 && cd /tmp/verifier-source/unfs3-* \
 && cp nfs.c nfs.c.original \
 && python3 /tmp/fix-verifier.py nfs.c \
 && (diff -u nfs.c.original nfs.c || test "$?" = 1) \
 && autoreconf -fi && ./configure --prefix=/opt/ab-probe-unfs && make -j2 && make install \
 && rm -rf /tmp/verifier-source /tmp/fix-verifier.py
ENTRYPOINT ["/opt/ab-probe-unfs/sbin/unfsd"]
