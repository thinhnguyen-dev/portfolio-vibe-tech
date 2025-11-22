# Multi-stage Dockerfile for Next.js production deployment
# Optimized for minimal image size (~150MB) and fast builds
# Compatible with Vercel Runtime container and standard Docker deployments

# ==========================================
# Stage 1: Builder
# Build the Next.js application with all dependencies
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat

# Copy package files first for better layer caching
# This layer will be cached unless package.json changes
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
# Using npm ci for faster, reliable, reproducible builds
RUN npm ci && \
    npm cache clean --force

# Copy application source code
COPY . .

# Set build-time environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js application
# This creates .next/standalone and .next/static directories
RUN npm run build

# ==========================================
# Stage 2: Runner
# Minimal production image with only runtime files
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output from builder
# Standalone includes only necessary files (minimal footprint)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user for security
USER nextjs

# Expose the port Next.js runs on
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the Next.js server from standalone output
CMD ["node", "server.js"]
