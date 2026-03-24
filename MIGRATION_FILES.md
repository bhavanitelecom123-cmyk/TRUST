# Migration Files Overview

This document lists all files generated for the Person-centric family tree upgrade.

---

## 📁 Schema Files

### `prisma/schema-upgraded.prisma`
**Purpose:** Final upgraded schema with Person, Relationship, and modified Family/Spouse/Child models.

**Changes:**
- Added `Person` model with split name fields
- Added `Relationship` model with `RelationType` enum
- Modified `Family`, `Spouse`, `Child` to use split name fields and `personId` links
- Maintains backward compatibility via old columns (temporarily)

**Usage:**
```bash
cp prisma/schema-upgraded.prisma prisma/schema.prisma
npx prisma generate
```

---

## 📁 Migration SQL Files

### `migrations/upgrade_to_person_model_additive.sql`
**Purpose:** Phase 1 - Add new tables and columns without dropping any data.

**Actions:**
- Creates `RelationType` enum
- Creates `persons` table
- Creates `relationships` table
- Adds new split-name columns to `families`, `spouses`, `children` (nullable)
- Creates all performance indexes
- Does NOT drop old columns

**To apply:**
```bash
psql -h localhost -U postgres -d postgres -f migrations/upgrade_to_person_model_additive.sql
```

---

### `migrations/upgrade_to_person_model_constraints.sql`
**Purpose:** Phase 2 - Add foreign key constraints after data migration.

**Actions:**
- Adds FK constraints: `families.headPersonId`, `fatherId`, `motherId` → `persons.id`
- Adds FK constraints: `spouses.personId` → `persons.id`
- Adds FK constraints: `children.personId` → `persons.id`
- Adds FK constraints: `relationships.parentId`, `childId` → `persons.id`
- **Does NOT drop old columns** (commented out)
- **Does NOT make columns NOT NULL** (commented out)

**To apply (AFTER data migration):**
```bash
psql -h localhost -U postgres -d postgres -f migrations/upgrade_to_person_model_constraints.sql
```

---

## 📁 Scripts

### `scripts/migrate-data.ts`
**Purpose:** Migrate existing name data to Person records and populate `personId` links.

**Actions:**
- For each family:
  - Creates Person for head (from `headFullName`)
  - Creates Person for father (if `fatherName` exists)
  - Creates Person for mother (if `motherName` exists)
  - Creates Person for spouse (if exists)
  - Creates Person for each child
  - Updates all `personId` fields
  - Creates `Relationship` records (FATHER/MOTHER)
- Idempotent: can be re-run safely (skips already migrated records)
- Splits full names using simple algorithm (first word = first name, last word = last name, rest = middle)

**To run:**
```bash
ts-node scripts/migrate-data.ts
```

---

### `scripts/verify-migration.ts`
**Purpose:** Verify data migration completeness.

**Checks:**
- Record counts (Families, Persons, Relationships)
- All families have `headPersonId`
- All children have `personId`
- All spouses have `personId` (if any)
- Relationship coverage
- Shows sample Person records

**To run:**
```bash
ts-node scripts/verify-migration.ts
```

---

### `scripts/cleanup-old-columns.ts`
**Purpose:** Drop old name columns after verification (Phase 3).

**Actions:**
- Drops `headFullName`, `fatherName`, `motherName` from `families`
- Drops `fullName`, `fatherName`, `motherName` from `spouses`
- Drops `fullName` from `children`

**⚠️ WARNING:** IRREVERSIBLE! Only run after thorough testing.

**To run:**
```bash
ts-node scripts/cleanup-old-columns.ts
```

---

### `scripts/dev-migrate.ts`
**Purpose:** All-in-one migration runner for development environments.

**Runs steps in order:**
1. Apply additive migration SQL
2. Copy upgraded schema to main schema
3. Generate Prisma client
4. Run data migration script
5. Apply constraints SQL

**Usage:**
```bash
ts-node scripts/dev-migrate.ts
```

**Note:** Wrap in transaction or use with caution. Best on fresh/dev DB.

---

## 📁 Documentation

### `MIGRATION_GUIDE.md`
Comprehensive step-by-step guide for production deployment, including:
- Pre-migration checklist
- Detailed steps for each phase
- Verification queries
- Rollback strategies
- Environment-specific notes

### `PRISMA_UPGRADE_EXPLAINED.md`
In-depth explanation of the new schema design, covering:
- Person model structure
- Relationship model
- Data flow logic (approval pipeline)
- Autocomplete support
- Backward compatibility strategy
- Query examples
- Key decisions

---

## 🗂️ File Structure

```
.
├── prisma/
│   ├── schema-upgraded.prisma     (upgraded schema)
│   └── migrations/
│       ├── upgrade_to_person_model_additive.sql
│       └── upgrade_to_person_model_constraints.sql
├── scripts/
│   ├── migrate-data.ts
│   ├── verify-migration.ts
│   ├── cleanup-old-columns.ts
│   └── dev-migrate.ts
├── MIGRATION_GUIDE.md
└── PRISMA_UPGRADE_EXPLAINED.md
```

---

## 🚀 Quick Start (Development)

```bash
# 1. Backup database
pg_dump -h localhost -U postgres -d postgres > backup.sql

# 2. Run full migration
ts-node scripts/dev-migrate.ts

# 3. Verify
ts-node scripts/verify-migration.ts

# 4. Test application
npm run dev
```

## 🏭 Production Deployment

Refer to `MIGRATION_GUIDE.md` for complete, cautious procedure including:
- Database backup
- Maintenance mode
- Staging validation
- Monitoring
- Optional cleanup

---

**End of Overview**
