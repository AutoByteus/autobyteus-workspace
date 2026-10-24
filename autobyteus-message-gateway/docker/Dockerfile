FROM node:20-bookworm-slim

WORKDIR /app

# AutoByteus licence files and OCI licence label.
COPY LICENSE LICENSING.md NOTICE /app/
LABEL org.opencontainers.image.licenses="AGPL-3.0-only"

RUN corepack enable
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# The gateway keeps its in-container path: the compose files mount
# /app/autobyteus-message-gateway/memory, the default runtime data root.
WORKDIR /app/autobyteus-message-gateway

# The gateway is its own pnpm workspace: install only from its lockfile, with the
# pnpm version pinned by its packageManager field. Copy the manifests first to
# maximize layer cache reuse.
COPY autobyteus-message-gateway/package.json autobyteus-message-gateway/pnpm-lock.yaml autobyteus-message-gateway/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY autobyteus-message-gateway/ ./

RUN pnpm build

ENV NODE_ENV=production
ENV GATEWAY_HOST=0.0.0.0
ENV GATEWAY_PORT=8010

EXPOSE 8010

CMD ["node", "dist/index.js"]
