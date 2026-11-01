# API-3x test image Dockerfile.B (built inside the test daemon; T = test key + local release source; B = T with another image ID; C = T with server-package.json labelled 1.5.21)
FROM 127.0.0.1:5000/autobyteus/autobyteus-server:beta
LABEL ab305.variant=b
