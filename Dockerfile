# Build client
FROM node:20-alpine AS client-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build backend production node_modules
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Production image
FROM node:20-alpine AS production
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy backend dependencies and source
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend/node_modules ./node_modules
COPY --chown=nodejs:nodejs backend/src ./src
COPY --chown=nodejs:nodejs backend/package*.json ./

# Copy compiled frontend into client/dist
COPY --from=client-builder --chown=nodejs:nodejs /app/frontend/dist ./client/dist

USER nodejs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "src/index.js"]
