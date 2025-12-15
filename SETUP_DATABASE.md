# Database Setup Steps

Your schema is configured for PostgreSQL, but you need to:

## 1. Set up a PostgreSQL Database

You have a few options:

### Option A: Local PostgreSQL (via Docker - easiest)
```bash
docker run --name gym-tracker-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=gymtracker -p 5432:5432 -d postgres:16
```

### Option B: Local PostgreSQL (if installed)
```bash
createdb gymtracker
```

### Option C: Use a cloud service (Neon, Supabase, etc.)

## 2. Set DATABASE_URL Environment Variable

Create or update your `.env` file in the project root:

```bash
# For local PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gymtracker"

# Or if you have a different user/password:
# DATABASE_URL="postgresql://username:password@localhost:5432/gymtracker"
```

## 3. Run Migrations

```bash
# This will apply all pending migrations to your PostgreSQL database
npx prisma migrate deploy
# OR for development (will prompt to create migration if schema changed):
npx prisma migrate dev
```

## 4. Generate Prisma Client (if needed)

```bash
npx prisma generate
```

## 5. Seed the Database (optional)

```bash
npm run seed
# or
npm run reset-dummy
```

## 6. Verify Connection

You can verify your connection works by running:
```bash
npx prisma studio
```

This opens a browser UI to view your database.

---

**Note:** The `dev.db` file in your project root is a SQLite database from a previous setup. You can ignore it or delete it once PostgreSQL is set up and working.
