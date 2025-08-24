# Dockerfile - Next.js app (build-time injection of NEXT_PUBLIC_* env vars)
FROM node:18-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# install deps (including dev deps needed for build)
COPY package*.json ./
RUN npm ci

# accept build args and export them as env vars so Next.js build sees them
ARG NEXT_PUBLIC_API_KEY
ARG NEXT_PUBLIC_AUTH_DOMAIN
ARG NEXT_PUBLIC_PROJECT_ID
ARG NEXT_PUBLIC_STORAGE_BUCKET
ARG NEXT_PUBLIC_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_APP_ID

ENV NEXT_PUBLIC_API_KEY=${NEXT_PUBLIC_API_KEY}
ENV NEXT_PUBLIC_AUTH_DOMAIN=${NEXT_PUBLIC_AUTH_DOMAIN}
ENV NEXT_PUBLIC_PROJECT_ID=${NEXT_PUBLIC_PROJECT_ID}
ENV NEXT_PUBLIC_STORAGE_BUCKET=${NEXT_PUBLIC_STORAGE_BUCKET}
ENV NEXT_PUBLIC_MESSAGING_SENDER_ID=${NEXT_PUBLIC_MESSAGING_SENDER_ID}
ENV NEXT_PUBLIC_APP_ID=${NEXT_PUBLIC_APP_ID}

# copy source and build
COPY . .
RUN npm run build

# production image
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# copy only production bits
COPY --from=base /app/package*.json ./
RUN npm ci --only=production

COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.js ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.env* ./

# if your start script is "next start -p 8080" or similar, ensure port matches
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
