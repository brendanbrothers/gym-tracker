import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from './generated/client'
import exercises from './exercises.json'
import bcrypt from 'bcryptjs'

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db',
})

const prisma = new PrismaClient({ adapter })

const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

interface ExerciseData {
  id: string
  name: string
  force?: string | null
  level?: string
  mechanic?: string | null
  equipment?: string | null
  primaryMuscles?: string[]
  secondaryMuscles?: string[]
  instructions?: string[]
  category?: string
  images?: string[]
}

async function main() {
  console.log('Seeding exercises...')

  const exerciseData = exercises as ExerciseData[]

  for (const exercise of exerciseData) {
    const images = exercise.images?.map(img => `${IMAGE_BASE_URL}/${img}`) || []

    await prisma.exercise.upsert({
      where: {
        name_source_sourceId: {
          name: exercise.name,
          source: 'IMPORTED',
          sourceId: exercise.id,
        },
      },
      update: {},
      create: {
        name: exercise.name,
        instructions: exercise.instructions?.join('\n\n') || null,
        category: exercise.category || null,
        primaryMuscle: exercise.primaryMuscles?.[0] || null,
        equipment: exercise.equipment || null,
        images: JSON.stringify(images),
        source: 'IMPORTED',
        sourceId: exercise.id,
      },
    })
  }

  console.log(`Seeded ${exerciseData.length} exercises`)

// Create a trainer user
const trainerPassword = await bcrypt.hash('trainer123', 10)
await prisma.user.upsert({
  where: { email: 'trainer@example.com' },
  update: {},
  create: {
    email: 'trainer@example.com',
    name: 'Test Trainer',
    password: trainerPassword,
    role: 'TRAINER',
  },
})

// Create a client user
const clientPassword = await bcrypt.hash('client123', 10)
await prisma.user.upsert({
  where: { email: 'client@example.com' },
  update: {},
  create: {
    email: 'client@example.com',
    name: 'Test Client',
    password: clientPassword,
    role: 'CLIENT',
  },
})

console.log('Created test users')

}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })