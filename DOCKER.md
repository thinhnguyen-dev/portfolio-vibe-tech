# Docker Deployment Guide

This Dockerfile is optimized for deploying the Next.js application in containerized environments, including Vercel Runtime containers.

## Features

- **Multi-stage build**: Reduces final image size from ~1GB to ~150MB
- **Alpine Linux base**: Minimal Linux distribution for smaller images
- **Security**: Runs as non-root user (nextjs:nodejs)
- **Layer caching**: Optimized for fast rebuilds
- **Standalone output**: Includes only necessary runtime files

## Building the Docker Image

### Basic Build

```bash
docker build -t portfolio-vibe-tech:latest .
```

### Build with Cache Optimization

```bash
docker build \
  --cache-from portfolio-vibe-tech:latest \
  -t portfolio-vibe-tech:latest \
  .
```

### Build for Production

```bash
docker build \
  --target runner \
  -t portfolio-vibe-tech:production \
  .
```

## Running the Container

### Basic Run

```bash
docker run -p 3000:3000 portfolio-vibe-tech:latest
```

### Run with Environment Variables

```bash
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  portfolio-vibe-tech:latest
```

### Run in Detached Mode

```bash
docker run -d -p 3000:3000 \
  --name portfolio-app \
  --restart unless-stopped \
  portfolio-vibe-tech:latest
```

## Image Size Optimization

The multi-stage build approach results in:

- **Stage 1 (deps)**: ~150MB (includes production dependencies)
- **Stage 2 (builder)**: ~800MB (includes build tools and dev dependencies)
- **Stage 3 (runner)**: ~150MB (final production image)

Only the final runner stage is included in the image, resulting in significant size reduction.

## Deployment to Vercel

### Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy using Docker:
   ```bash
   vercel --prod
   ```

### Using Vercel Dashboard

1. Connect your Git repository to Vercel
2. In project settings, select "Docker" as the framework preset
3. Vercel will automatically detect the Dockerfile and deploy

### Environment Variables

Set environment variables in Vercel dashboard:
- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1`

## Docker Compose (Optional)

Create a `docker-compose.yml` for local development:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      target: runner
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

Run with:
```bash
docker-compose up -d
```

## Troubleshooting

### Build Fails

- Ensure `next.config.ts` has `output: 'standalone'` configured
- Check that all dependencies are in `package.json`
- Verify Node.js version matches (20.x)

### Container Won't Start

- Check logs: `docker logs <container-id>`
- Verify port 3000 is not in use: `lsof -i :3000`
- Ensure `.next/standalone` directory exists after build

### Large Image Size

- Ensure you're using `--target runner` to only build final stage
- Check `.dockerignore` is excluding unnecessary files
- Verify standalone output is being used

## Security Best Practices

1. **Non-root user**: Container runs as `nextjs:nodejs` user (UID 1001)
2. **Minimal dependencies**: Only production dependencies included
3. **Alpine Linux**: Smaller attack surface than full Linux distributions
4. **Health checks**: Container orchestration can monitor application health

## Performance Tips

1. **Layer caching**: Build frequently changes last to maximize cache hits
2. **BuildKit**: Use Docker BuildKit for faster builds:
   ```bash
   DOCKER_BUILDKIT=1 docker build -t portfolio-vibe-tech:latest .
   ```
3. **Multi-platform**: Build for specific platform to reduce size:
   ```bash
   docker build --platform linux/amd64 -t portfolio-vibe-tech:latest .
   ```

## Monitoring

The container includes a health check endpoint. Monitor container health:

```bash
docker ps  # Check STATUS column
docker inspect --format='{{.State.Health.Status}}' <container-id>
```

