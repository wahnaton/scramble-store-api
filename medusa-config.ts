import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils"
import { FOURTHWALL_MODULE } from "./src/modules/fourthwall"

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

export default defineConfig({
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    //redisUrl: process.env.REDIS_URL,
   // workerMode: process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server",
  },
  modules: {
    [FOURTHWALL_MODULE]: {
      resolve: "./src/modules/fourthwall",
      dependencies: [Modules.PRODUCT, Modules.SALES_CHANNEL],
      options: {
        token: process.env.FOURTHWALL_STOREFRONT_TOKEN,
        apiBase: process.env.FOURTHWALL_API_BASE,
      },
    },
    // [Modules.CACHE]: {
    //   resolve: "@medusajs/cache-redis",
    //   options: { redisUrl: process.env.REDIS_URL },
    // },
    // [Modules.EVENT_BUS]: {
    //   resolve: "@medusajs/event-bus-redis",
    //   options: { redisUrl: process.env.REDIS_URL },
    // },
    // [Modules.WORKFLOW_ENGINE]: {
    //   resolve: "@medusajs/workflow-engine-redis",
    //   options: { redis: { url: process.env.REDIS_URL } },
    // },
  },
})
