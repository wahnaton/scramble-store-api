# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.medusa/server ./.medusa/server
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 CMD node -e "const http=require('http');const req=http.request({host:'localhost',port:9000,path:'/health',timeout:4000},res=>{process.exit(res.statusCode===200?0:1)});req.on('error',()=>process.exit(1));req.end()"
USER node
CMD ["node",".medusa/server/index.js"]