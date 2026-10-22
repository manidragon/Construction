# Multi-stage Dockerfile for Construction Project Management ERP
FROM node:20-alpine AS builder

WORKDIR /app

# Ensure devDependencies (Vite, TypeScript, Tailwind) are installed during build
ENV NODE_ENV=development

# Install required system libraries for Prisma engine on Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy package definitions
COPY package.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Force install of all dependencies including devDependencies
RUN npm --prefix backend install --include=dev
RUN npm --prefix frontend install --include=dev

# Copy source files
COPY backend ./backend
COPY frontend ./frontend

# Generate Prisma Client & Build both applications
RUN npm --prefix backend run db:generate
RUN npm --prefix backend run build
RUN npm --prefix frontend run build

# -------------------------------------------------------------
# Production Runner Stage
# -------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install required system libraries for Prisma engine on Alpine
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_URL="file:/app/data/prod.db"
ENV UPLOAD_DIR="/app/data/uploads"

# Install production dependencies for backend
COPY backend/package*.json ./backend/
RUN npm --prefix backend install --omit=dev

# Copy compiled backend, prisma artifacts, and frontend build
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=builder /app/backend/node_modules/@prisma ./backend/node_modules/@prisma
COPY --from=builder /app/frontend/dist ./frontend/dist

# Persistent data directory
RUN mkdir -p /app/data/uploads

# Copy entrypoint script and normalize line endings
COPY docker-entrypoint.sh ./
RUN tr -d '\r' < docker-entrypoint.sh > /tmp/entrypoint.sh && \
    mv /tmp/entrypoint.sh ./docker-entrypoint.sh && \
    chmod +x ./docker-entrypoint.sh

EXPOSE 5000

CMD ["./docker-entrypoint.sh"]
