FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
# prisma generate loads prisma.config.ts, which requires DATABASE_URL
# (no live DB connection needed at build time)
ARG DATABASE_URL=postgresql://auth:auth@db:5432/auth_db?schema=public
ENV DATABASE_URL=$DATABASE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]