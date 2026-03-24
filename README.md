# Caste Community Portal

A production-ready web application for managing caste community family data with Next.js 14, TypeScript, PostgreSQL, Prisma ORM, NextAuth, and TailwindCSS.

## Features

- User Registration & Login with secure authentication
- Each user can submit ONE family record
- Family form with conditional spouse fields
- Dynamic children management (add/remove)
- Data validation and protection
- Deployable on Vercel with Neon Postgres

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Authentication:** NextAuth v4
- **Styling:** TailwindCSS
- **Hosting:** Vercel

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Create a `.env.local` file in the root directory:

```env
DATABASE_URL="postgresql://username:password@hostname/neondb?connection_limit=10"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-generate-with-openssl-rand-base64-32"
```

Get your `DATABASE_URL` from [Neon Postgres](https://neon.tech).

### 3. Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Create and run migration
npm run prisma:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
/app
  /login          - Login page
  /register       - Registration page
  /dashboard      - User dashboard (protected)
  /family-form    - Family form page (protected)
  /api
    /auth
      /register   - Registration API
      [...nextauth] - NextAuth handler
    /family       - Family CRUD APIs
/components
  /forms          - Family form component
  /providers      - Session provider
  Nav.tsx         - Navigation component
/lib
  auth.ts         - NextAuth configuration
  db.ts           - Prisma client singleton
/prisma
  schema.prisma   - Database schema
/types
  index.ts        - TypeScript types
  next-auth.d.ts  - NextAuth type extensions
```

## Database Schema

### User
- `id` (String, primary key)
- `email` (String, unique)
- `password` (String, hashed)
- `createdAt` (DateTime)

### Family
- `id` (String, primary key)
- `userId` (String, unique, foreign key)
- `headFullName`, `fatherName`, `motherName`
- `education`, `occupationType`, `occupationLocation`
- `gender`, `maritalStatus`
- `createdAt`, `updatedAt`

### Spouse
- `id` (String, primary key)
- `familyId` (String, unique, foreign key)
- `fullName`, `fatherName`, `motherName`
- `education`, `occupationType`, `occupationLocation`
- `gender`

### Child
- `id` (String, primary key)
- `familyId` (String, foreign key)
- `fullName`, `gender`, `education`

**Relations:**
- One User → One Family
- One Family → One Spouse
- One Family → Many Children

## API Routes

| Route | Method | Description | Auth Required |
|-------|--------|-------------|---------------|
| `/api/auth/register` | POST | Register new user | No |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler | No |
| `/api/family` | POST | Create family record | Yes |
| `/api/family` | GET | Get family data | Yes |
| `/api/family` | PUT | Update family data | Yes |

## Deployment on Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `DATABASE_URL` (Neon Postgres connection string)
   - `NEXTAUTH_URL` (Your Vercel app URL)
   - `NEXTAUTH_SECRET` (Generate with: `openssl rand -base64 32`)
4. Deploy

### Build Command

```bash
npm run build
```

### Output Directory

`.next`

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run migrations
- `npm run prisma:studio` - Open Prisma Studio database viewer
- `npm run prisma:push` - Push schema to database

## Security Features

- Passwords hashed with bcrypt (12 rounds)
- NextAuth for session management
- JWT strategy for stateless auth
- Protected API routes
- One family record per user constraint
- CSRF protection via NextAuth

## Notes

- Each family head creates ONE account
- Each account can submit ONE family record only
- Spouse section appears only when marital status is "Married"
- Children can be dynamically added/removed
- All form fields validated appropriately
- Production-ready with proper error handling

## License

ISC
