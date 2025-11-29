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

# Copy .env file explicitly (needed for runtime environment variables)
# The standalone build should include it, but we copy it explicitly to ensure availability
COPY --from=builder --chown=nextjs:nodejs /app/.env ./.env

# Create writable directories for runtime operations
# These directories need write permissions for the nextjs user
# Note: content directory may already exist from standalone build
RUN mkdir -p /app/temp/blog-extracts && \
    mkdir -p /app/content/blog && \
    mkdir -p /app/public/blog-images && \
    mkdir -p /app/.cache/blog && \
    chown -R nextjs:nodejs /app/temp && \
    chown -R nextjs:nodejs /app/content && \
    chown -R nextjs:nodejs /app/public/blog-images && \
    chown -R nextjs:nodejs /app/.cache && \
    chmod -R 755 /app/temp && \
    chmod -R 755 /app/content && \
    chmod -R 755 /app/public/blog-images && \
    chmod -R 755 /app/.cache

# Switch to non-root user for security
USER nextjs

# Expose the port Next.js runs on
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the Next.js server from standalone output
# The standalone build creates server.js in the root
CMD ["node", "server.js"]
