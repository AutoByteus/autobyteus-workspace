ARG CHROME_VNC_TAG=zh

FROM autobyteus/chrome-vnc:${CHROME_VNC_TAG}

RUN apt-get update \
  && apt-get install -y --no-install-recommends git openssh-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

RUN useradd --create-home --shell /bin/bash autobyteus

RUN mkdir -p /home/autobyteus/workspace /home/autobyteus/data /home/autobyteus/.ssh \
  && ssh-keyscan github.com >> /home/autobyteus/.ssh/known_hosts \
  && chown -R autobyteus:autobyteus /home/autobyteus

COPY bootstrap.sh /usr/local/bin/autobyteus-bootstrap.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/autobyteus-bootstrap.sh /usr/local/bin/entrypoint.sh

USER autobyteus
WORKDIR /home/autobyteus/workspace

ENV AUTOBYTEUS_WORKSPACE_ROOT=/home/autobyteus/workspace \
    AUTOBYTEUS_DATA_DIR=/home/autobyteus/data \
    AUTOBYTEUS_SERVER_PORT=8000 \
    AUTOBYTEUS_BIND_HOST=0.0.0.0 \
    AUTOBYTEUS_GIT_AUTH_MODE=pat \
    AUTOBYTEUS_REF=main \
    AUTOBYTEUS_SERVER_REF=main \
    AUTOBYTEUS_TS_REF=main \
    AUTOBYTEUS_REPOSITORY_PRISMA_REF=main \
    APP_ENV=production \
    PERSISTENCE_PROVIDER=sqlite \
    DB_TYPE=sqlite \
    AUTOBYTEUS_NODE_DISCOVERY_ENABLED=true \
    AUTOBYTEUS_NODE_DISCOVERY_ROLE=client \
    AUTOBYTEUS_NODE_DISCOVERY_REGISTRY_URL=http://registry-node:8000 \
    LOG_LEVEL=INFO \
    AUTOBYTEUS_HTTP_ACCESS_LOG_MODE=errors \
    AUTOBYTEUS_HTTP_ACCESS_LOG_INCLUDE_NOISY=false

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
