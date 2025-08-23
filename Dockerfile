# Dockerfile

FROM node:20-bullseye-slim AS deps
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential make g++ git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --production=false

FROM node:20-bullseye-slim AS builder
WORKDIR /app

# Accept build args (these are passed from cloudbuild.yaml)
ARG NEXT_PUBLIC_API_KEY
ARG NEXT_PUBLIC_AUTH_DOMAIN
ARG NEXT_PUBLIC_PROJECT_ID
ARG NEXT_PUBLIC_STORAGE_BUCKET
ARG NEXT_PUBLIC_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_APP_ID

# Export them as ENV so next build sees them (must be present during build)
ENV NEXT_PUBLIC_API_KEY=${NEXT_PUBLIC_API_KEY}
ENV NEXT_PUBLIC_AUTH_DOMAIN=${NEXT_PUBLIC_AUTH_DOMAIN}
ENV NEXT_PUBLIC_PROJECT_ID=${NEXT_PUBLIC_PROJECT_ID}
ENV NEXT_PUBLIC_STORAGE_BUCKET=${NEXT_PUBLIC_STORAGE_BUCKET}
ENV NEXT_PUBLIC_MESSAGING_SENDER_ID=${NEXT_PUBLIC_MESSAGING_SENDER_ID}
ENV NEXT_PUBLIC_APP_ID=${NEXT_PUBLIC_APP_ID}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN npm run build

FROM node:20-bullseye-slim AS runner
WORKDIR /app

# Copy built app and set ownership to existing node user
COPY --from=builder --chown=node:node /app /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD ["node", "-e", "require('http').get('http://localhost:3000/_health', res => process.exit(res.statusCode===200?0:1)).on('error', ()=>process.exit(1))"]

CMD ["npm", "start"]
