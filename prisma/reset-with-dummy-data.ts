import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from './generated/client'
import bcrypt from 'bcryptjs'

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db',
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Clearing database...')
  
  // Delete in order of dependencies
  await prisma.setExercise.deleteMany()
  await prisma.workoutSet.deleteMany()
  await prisma.workoutSession.deleteMany()
  await prisma.exercise.deleteMany()
  await prisma.user.deleteMany()

  console.log('Creating users...')
  
  const password = await bcrypt.hash('password123', 10)

  const brendan = await prisma.user.create({
    data: {
      email: 'brendan@example.com',
      name: 'Brendan Brothers',
      password,
      role: 'CLIENT',
    },
  })

  const erin = await prisma.user.create({
    data: {
      email: 'erin@example.com',
      name: 'Erin Brothers',
      password,
      role: 'CLIENT',
    },
  })

  const jon = await prisma.user.create({
    data: {
      email: 'jon@example.com',
      name: 'Jon K',
      password,
      role: 'TRAINER',
    },
  })

  const thomas = await prisma.user.create({
    data: {
      email: 'thomas@example.com',
      name: 'Thomas K',
      password,
      role: 'TRAINER',
    },
  })

  console.log('Creating exercises...')

  // Core exercises that will repeat
  const benchPress = await prisma.exercise.create({
    data: {
      name: 'Bench Press',
      category: 'strength',
      primaryMuscle: 'chest',
      equipment: 'barbell',
      source: 'CUSTOM',
    },
  })

  const squat = await prisma.exercise.create({
    data: {
      name: 'Barbell Squat',
      category: 'strength',
      primaryMuscle: 'quadriceps',
      equipment: 'barbell',
      source: 'CUSTOM',
    },
  })

  const deadlift = await prisma.exercise.create({
    data: {
      name: 'Deadlift',
      category: 'strength',
      primaryMuscle: 'back',
      equipment: 'barbell',
      source: 'CUSTOM',
    },
  })

  const shoulderPress = await prisma.exercise.create({
    data: {
      name: 'Shoulder Press',
      category: 'strength',
      primaryMuscle: 'shoulders',
      equipment: 'dumbbell',
      source: 'CUSTOM',
    },
  })

  const bicepCurl = await prisma.exercise.create({
    data: {
      name: 'Bicep Curl',
      category: 'strength',
      primaryMuscle: 'biceps',
      equipment: 'dumbbell',
      source: 'CUSTOM',
    },
  })

  const tricepExtension = await prisma.exercise.create({
    data: {
      name: 'Tricep Extension',
      category: 'strength',
      primaryMuscle: 'triceps',
      equipment: 'dumbbell',
      source: 'CUSTOM',
    },
  })

  const latPulldown = await prisma.exercise.create({
    data: {
      name: 'Lat Pulldown',
      category: 'strength',
      primaryMuscle: 'lats',
      equipment: 'cable',
      source: 'CUSTOM',
    },
  })

  const legPress = await prisma.exercise.create({
    data: {
      name: 'Leg Press',
      category: 'strength',
      primaryMuscle: 'quadriceps',
      equipment: 'machine',
      source: 'CUSTOM',
    },
  })

  const plank = await prisma.exercise.create({
    data: {
      name: 'Plank',
      category: 'strength',
      primaryMuscle: 'abdominals',
      equipment: 'body only',
      source: 'CUSTOM',
    },
  })

  const tricepCountdown = await prisma.exercise.create({
    data: {
      name: 'Tricep Countdown',
      category: 'strength',
      primaryMuscle: 'triceps',
      equipment: 'dumbbell',
      source: 'CUSTOM',
    },
  })

  // Random exercises for variety
  const lunges = await prisma.exercise.create({
    data: {
      name: 'Walking Lunges',
      category: 'strength',
      primaryMuscle: 'quadriceps',
      equipment: 'dumbbell',
      source: 'CUSTOM',
    },
  })

  const facePulls = await prisma.exercise.create({
    data: {
      name: 'Face Pulls',
      category: 'strength',
      primaryMuscle: 'shoulders',
      equipment: 'cable',
      source: 'CUSTOM',
    },
  })

  const calfRaise = await prisma.exercise.create({
    data: {
      name: 'Calf Raise',
      category: 'strength',
      primaryMuscle: 'calves',
      equipment: 'machine',
      source: 'CUSTOM',
    },
  })

  console.log('Creating workout sessions...')

  // Helper to create workout with sets and exercises
  async function createWorkout(
    clientId: string,
    trainerId: string,
    date: Date,
    sets: {
      exercises: {
        exerciseId: string
        modifier?: string
        targetReps: number
        targetWeight: number
        actualReps: number
        actualWeight: number
        rounds: number
      }[]
    }[]
  ) {
    const workout = await prisma.workoutSession.create({
      data: {
        date,
        clientId,
        trainerId,
        status: 'COMPLETED',
      },
    })

    for (let setIndex = 0; setIndex < sets.length; setIndex++) {
      const set = sets[setIndex]
      const workoutSet = await prisma.workoutSet.create({
        data: {
          workoutSessionId: workout.id,
          order: setIndex + 1,
        },
      })

      for (let exIndex = 0; exIndex < set.exercises.length; exIndex++) {
        const ex = set.exercises[exIndex]
        for (let round = 1; round <= ex.rounds; round++) {
          // Add slight variation to actuals
          const repsVariation = Math.floor(Math.random() * 3) - 1
          const weightVariation = Math.floor(Math.random() * 5)
          
          await prisma.setExercise.create({
            data: {
              workoutSetId: workoutSet.id,
              exerciseId: ex.exerciseId,
              order: exIndex + 1,
              round,
              modifier: ex.modifier || null,
              targetReps: ex.targetReps,
              targetWeight: ex.targetWeight,
              actualReps: Math.max(1, ex.actualReps + repsVariation),
              actualWeight: ex.actualWeight + weightVariation,
              completed: true,
            },
          })
        }
      }
    }

    return workout
  }

  // Generate 4 weeks of workouts (3 per week)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 28) // Start 4 weeks ago

  const clients = [
    { user: brendan, startBench: 135, startSquat: 185 },
    { user: erin, startBench: 65, startSquat: 95 },
  ]
  const trainers = [jon, thomas]

  // Workout templates
  const workoutTemplates = [
    // Day 1: Chest/Triceps
    (week: number, client: typeof clients[0]) => ({
      sets: [
        {
          exercises: [
            { exerciseId: benchPress.id, targetReps: 10, targetWeight: client.startBench + week * 5, actualReps: 10, actualWeight: client.startBench + week * 5, rounds: 3 },
            { exerciseId: tricepExtension.id, targetReps: 12, targetWeight: 25 + week * 2.5, actualReps: 12, actualWeight: 25 + week * 2.5, rounds: 3 },
            { exerciseId: shoulderPress.id, targetReps: 10, targetWeight: 30 + week * 2.5, actualReps: 10, actualWeight: 30 + week * 2.5, rounds: 3 },
          ],
        },
        {
          exercises: [
            { exerciseId: tricepCountdown.id, modifier: 'start at 10', targetReps: 10, targetWeight: 15, actualReps: 10, actualWeight: 15, rounds: 4 },
            { exerciseId: plank.id, targetReps: 1, targetWeight: 0, actualReps: 1, actualWeight: 0, rounds: 3 },
          ],
        },
      ],
    }),
    // Day 2: Back/Biceps
    (week: number, client: typeof clients[0]) => ({
      sets: [
        {
          exercises: [
            { exerciseId: deadlift.id, targetReps: 8, targetWeight: client.startSquat + week * 10, actualReps: 8, actualWeight: client.startSquat + week * 10, rounds: 3 },
            { exerciseId: latPulldown.id, targetReps: 12, targetWeight: 80 + week * 5, actualReps: 12, actualWeight: 80 + week * 5, rounds: 3 },
            { exerciseId: bicepCurl.id, targetReps: 12, targetWeight: 20 + week * 2.5, actualReps: 12, actualWeight: 20 + week * 2.5, rounds: 3 },
          ],
        },
        {
          exercises: [
            { exerciseId: facePulls.id, targetReps: 15, targetWeight: 40 + week * 2.5, actualReps: 15, actualWeight: 40 + week * 2.5, rounds: 3 },
          ],
        },
      ],
    }),
    // Day 3: Legs
    (week: number, client: typeof clients[0]) => ({
      sets: [
        {
          exercises: [
            { exerciseId: squat.id, targetReps: 10, targetWeight: client.startSquat + week * 10, actualReps: 10, actualWeight: client.startSquat + week * 10, rounds: 3 },
            { exerciseId: legPress.id, targetReps: 12, targetWeight: 180 + week * 20, actualReps: 12, actualWeight: 180 + week * 20, rounds: 3 },
            { exerciseId: lunges.id, targetReps: 10, targetWeight: 25 + week * 5, actualReps: 10, actualWeight: 25 + week * 5, rounds: 3 },
          ],
        },
        {
          exercises: [
            { exerciseId: calfRaise.id, targetReps: 15, targetWeight: 100 + week * 10, actualReps: 15, actualWeight: 100 + week * 10, rounds: 3 },
            { exerciseId: plank.id, targetReps: 1, targetWeight: 0, actualReps: 1, actualWeight: 0, rounds: 3 },
          ],
        },
      ],
    }),
  ]

  for (let week = 0; week < 4; week++) {
    for (let day = 0; day < 3; day++) {
      const workoutDate = new Date(startDate)
      workoutDate.setDate(startDate.getDate() + week * 7 + day * 2 + (day > 0 ? 1 : 0))

      for (const client of clients) {
        const trainer = trainers[(week + day) % 2]
        const template = workoutTemplates[day](week, client)

        await createWorkout(
          client.user.id,
          trainer.id,
          workoutDate,
          template.sets
        )
      }
    }
  }

  console.log('Done! Created:')
  console.log('- 4 users (2 clients, 2 trainers)')
  console.log('- 13 exercises')
  console.log('- 24 workout sessions (4 weeks × 3 days × 2 clients)')
  console.log('')
  console.log('Login credentials (all use password: password123):')
  console.log('- brendan@example.com (client)')
  console.log('- erin@example.com (client)')
  console.log('- jon@example.com (trainer)')
  console.log('- thomas@example.com (trainer)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })