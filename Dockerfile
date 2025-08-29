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

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]