# ---- Base Node image ----
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---- Install dependencies ----
FROM base AS deps
RUN npm install --frozen-lockfile

# ---- Build the Next.js app ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Start Next.js in production
CMD ["npm", "start"]
