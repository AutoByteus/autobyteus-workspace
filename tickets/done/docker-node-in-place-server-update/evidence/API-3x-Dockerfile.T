# API-3x test image Dockerfile.T (built inside the test daemon; T = test key + local release source; B = T with another image ID; C = T with server-package.json labelled 1.5.21)
FROM 127.0.0.1:5000/ab305/step3
COPY test.pub /opt/autobyteus/starter/server-package-signing-key.pem
ENV AUTOBYTEUS_SERVER_PACKAGE_SOURCE=http://172.18.0.1:18080/releases
