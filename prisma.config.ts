import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Migrations use a DIRECT (unpooled) connection — DDL + advisory locks
    // misbehave over Neon's pooled endpoint. Falls back to DATABASE_URL for
    // local dev, where there's only one (unpooled) database.
    url: process.env.DIRECT_URL ?? env('DATABASE_URL'),
  },
})