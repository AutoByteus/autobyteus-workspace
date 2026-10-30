# API-3x test image Dockerfile.C (built inside the test daemon; T = test key + local release source; B = T with another image ID; C = T with server-package.json labelled 1.5.21)
FROM 127.0.0.1:5000/autobyteus/autobyteus-server:beta
RUN node -e "const f='/opt/autobyteus/server-package/server-package.json';const j=require(f);j.version='1.5.21';require('fs').writeFileSync(f,JSON.stringify(j,null,2)+'\n')"
