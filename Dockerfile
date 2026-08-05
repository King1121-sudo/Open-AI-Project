FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
EXPOSE 8787
# Keys are injected via environment variables (see .env / docker run -e).
CMD ["node", "dist/gateway/index.js"]