FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache openssl
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app

COPY package*.json ./
# Install ALL dependencies (prisma CLI + ts-node needed for entrypoint)
RUN npm install --ignore-scripts

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY entrypoint.sh ./entrypoint.sh

RUN mkdir -p /app/storage/qrcodes /app/storage/invitations /app/storage/monograms \
             /app/storage/templates /app/storage/seating-plans /app/storage/room-photos \
  && chmod +x /app/entrypoint.sh \
  && chown -R appuser:appgroup /app

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

EXPOSE 3000
ENTRYPOINT ["/app/entrypoint.sh"]
