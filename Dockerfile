# Stage 1: Install dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Rebuild the source code only when needed
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Build-time args para variables NEXT_PUBLIC_* (Next.js las incrusta en el bundle del cliente)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Sprint 3 Hardening: SUPABASE_SERVICE_ROLE_KEY ya NO se pasa como ARG/ENV en build.
# auth-config.ts evalúa el key de forma LAZY vía getAuthServiceRoleKey() — la var solo
# se necesita en runtime. Pasarla como ENV durante `docker build` dejaba el key (con
# permisos admin que bypassan RLS) embebido en una capa de la imagen, visible vía
# `docker history` o `docker inspect`. En runtime, Dokploy → Environment la inyecta
# normalmente al contenedor sin tocar la imagen.

# Aumentamos la memoria de Node para evitar el error de Out of Memory en Dokploy/VPS
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

# Stage 3: Production image, copy all the files and run next
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build metadata para endpoint /api/version (SP-4-NEW-13). Inyectados por Dokploy
# en el `docker build --build-arg` o equivalente. Sin valor → fallback "unknown".
# Permite verificar post-deploy que el VPS sirve el commit esperado:
#   curl https://dev.linkstation.ai/api/version
ARG GIT_COMMIT_SHA
ARG GIT_BRANCH
ARG BUILD_TIMESTAMP
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}
ENV GIT_BRANCH=${GIT_BRANCH}
ENV BUILD_TIMESTAMP=${BUILD_TIMESTAMP}

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8500

ENV PORT=8500
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
