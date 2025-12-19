import 'dotenv/config'
import { PrismaClient } from './generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Starting gym migration...')

  // 1. Create default gym
  const defaultGym = await prisma.gym.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Gym',
      slug: 'default',
    },
  })
  console.log(`Created/found default gym: ${defaultGym.id}`)

  // 2. Associate all non-ADMIN users with default gym
  const usersUpdated = await prisma.user.updateMany({
    where: {
      role: { not: 'ADMIN' },
      gymId: null,
    },
    data: { gymId: defaultGym.id },
  })
  console.log(`Associated ${usersUpdated.count} users with default gym`)

  // 3. Associate all workouts with default gym
  const workoutsUpdated = await prisma.workoutSession.updateMany({
    where: { gymId: null },
    data: { gymId: defaultGym.id },
  })
  console.log(`Associated ${workoutsUpdated.count} workouts with default gym`)

  // 4. Mark IMPORTED exercises as global
  const globalExercisesUpdated = await prisma.exercise.updateMany({
    where: { source: 'IMPORTED' },
    data: { isGlobal: true },
  })
  console.log(`Marked ${globalExercisesUpdated.count} imported exercises as global`)

  // 5. Associate CUSTOM exercises with default gym
  const customExercisesUpdated = await prisma.exercise.updateMany({
    where: {
      source: 'CUSTOM',
      gymId: null,
    },
    data: { gymId: defaultGym.id },
  })
  console.log(`Associated ${customExercisesUpdated.count} custom exercises with default gym`)

  console.log('Gym migration complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
