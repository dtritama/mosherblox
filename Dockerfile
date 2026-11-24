# Production images. `app` = the website, `tools` = worker + migrations + admin:create.
# Built on the VPS by deploy/remote-deploy.sh (see docs/deploy.md).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_TELEMETRY_DISABLED=1 NEXT_STANDALONE=1
COPY . .
# Fixed key (from the server's .env, as a build secret so it is in no image layer command): Server Action
# IDs stay the same between builds, so pages that are open during a deploy keep working.
RUN --mount=type=secret,id=actions_key,required=true \
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(cat /run/secrets/actions_key)" npm run build \
  && npm run worker:build

# Website: Next.js standalone server, only the files it needs.
FROM node:22-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["node", "server.js"]

# Worker, migrations, admin accounts: needs node_modules and the source.
FROM deps AS tools
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY drizzle ./drizzle
COPY drizzle.config.ts tsconfig.json ./
COPY scripts ./scripts
COPY src ./src
USER node
CMD ["node", "--conditions=react-server", "dist/worker.mjs"]
