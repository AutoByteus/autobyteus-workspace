FROM node:20-bookworm-slim

WORKDIR /app

RUN corepack enable
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first to maximize layer cache reuse.
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY autobyteus-ts/package.json autobyteus-ts/package.json
COPY autobyteus-message-gateway/package.json autobyteus-message-gateway/package.json

# pnpm v10 blocks dependency build scripts unless explicitly approved.
RUN printf "\nonlyBuiltDependencies:\n  - '@whiskeysockets/baileys'\n  - esbuild\n  - node-pty\n  - protobufjs\n  - sharp\n" >> pnpm-workspace.yaml

# Install only the gateway workspace and its local workspace dependencies.
RUN pnpm install --frozen-lockfile --filter autobyteus-message-gateway...

COPY autobyteus-ts autobyteus-ts
COPY autobyteus-message-gateway autobyteus-message-gateway

RUN pnpm -C autobyteus-message-gateway build

WORKDIR /app/autobyteus-message-gateway

ENV NODE_ENV=production
ENV GATEWAY_HOST=0.0.0.0
ENV GATEWAY_PORT=8010

EXPOSE 8010

CMD ["node", "dist/index.js"]
