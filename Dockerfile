FROM node:20-bullseye-slim AS deps
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential make g++ git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bullseye-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN npm run build

FROM node:20-bullseye-slim AS runner
WORKDIR /app

RUN useradd --create-home --uid 1000 appuser

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./ 
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000
USER appuser

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- --tries=1 --timeout=2 http://localhost:3000/_health || exit 1

CMD ["npm", "start"]