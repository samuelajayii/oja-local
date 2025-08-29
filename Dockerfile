# ---- Base Node image ----
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- Install dependencies ----
FROM base AS deps
RUN npm ci --only=production

# Install dev dependencies for build
FROM base AS dev-deps
RUN npm ci

# ---- Build the Next.js app ----
FROM base AS builder
COPY --from=dev-deps /app/node_modules ./node_modules

# Build arguments for Next.js public environment variables
ARG NEXT_PUBLIC_API_KEY
ARG NEXT_PUBLIC_AUTH_DOMAIN
ARG NEXT_PUBLIC_PROJECT_ID
ARG NEXT_PUBLIC_STORAGE_BUCKET
ARG NEXT_PUBLIC_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_APP_ID

# Runtime environment variables for server-side
ARG FIREBASE_CLIENT_EMAIL
ARG FIREBASE_PRIVATE_KEY
ARG GOOGLE_CLOUD_STORAGE_BUCKET

# Set environment variables for build
ENV NEXT_PUBLIC_API_KEY=${NEXT_PUBLIC_API_KEY}
ENV NEXT_PUBLIC_AUTH_DOMAIN=${NEXT_PUBLIC_AUTH_DOMAIN}
ENV NEXT_PUBLIC_PROJECT_ID=${NEXT_PUBLIC_PROJECT_ID}
ENV NEXT_PUBLIC_STORAGE_BUCKET=${NEXT_PUBLIC_STORAGE_BUCKET}
ENV NEXT_PUBLIC_MESSAGING_SENDER_ID=${NEXT_PUBLIC_MESSAGING_SENDER_ID}
ENV NEXT_PUBLIC_APP_ID=${NEXT_PUBLIC_APP_ID}

# Copy source code and build
COPY . .

# Generate Prisma client and build the app
RUN npx prisma generate
RUN npm run build

# ---- Production runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Install Cloud SQL Proxy
RUN apk add --no-cache curl
RUN curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64 \
    && chmod +x cloud-sql-proxy \
    && mv cloud-sql-proxy /usr/local/bin/

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create startup script
RUN echo '#!/bin/sh\n\
# Start Cloud SQL Proxy in background\n\
cloud-sql-proxy --port 5432 oja-local-46990:europe-west1:marketplace-db &\n\
\n\
# Wait a moment for proxy to start\n\
sleep 5\n\
\n\
# Start the Next.js application\n\
exec node server.js' > /usr/local/bin/start.sh

RUN chmod +x /usr/local/bin/start.sh
RUN chown nextjs:nodejs /usr/local/bin/start.sh

USER nextjs

EXPOSE 8080

CMD ["/usr/local/bin/start.sh"]