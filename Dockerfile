# Cisco XDR MCP Server - Docker Image
# Build: docker build -t cisco-xdr-mcp .
# Run:   docker run -it --rm -e XDR_CLIENT_ID=... -e XDR_CLIENT_PASSWORD=... cisco-xdr-mcp

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:20-alpine

# Run as non-root user (MCP security guideline)
RUN addgroup -g 1000 mcp && adduser -u 1000 -G mcp -D mcp
USER mcp

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build

# Credentials MUST be passed via env at runtime - never baked into image
ENV NODE_ENV=production

ENTRYPOINT ["node", "build/index.js"]
