# 🎯 START HERE - Development Fresh Start

## Quick Answer

Since you're in development with only 2 dummy families:

```bash
# Run this ONE command (after reading warnings):
fresh-start.bat
```

Or manually:
```bash
psql -h localhost -U postgres -d postgres -f migrations/fresh_start_development.sql
cp prisma/schema-fresh.prisma prisma/schema.prisma
npx prisma generate
npm run dev
```

---

## What This Does

1. ✅ **DROPS** all family data (families, spouses, children)
2. ✅ **CREATES** new tables with Person & Relationship models
3. ✅ **SETS UP** all foreign keys and indexes
4. ✅ **READY** for you to start fresh with new schema

---

## Files Created for You

| File | Purpose |
|------|---------|
| `migrations/fresh_start_development.sql` | SQL that clears everything and creates new schema |
| `prisma/schema-fresh.prisma` | Fresh Prisma schema (no old columns) |
| `prisma/schema-upgraded.prisma` | Full schema with migration path (for production) |
| `fresh-start.bat` | Windows batch file to run all steps |
| `FRESH_START_DEV.md` | Detailed guide (read if you have questions) |
| `MIGRATION_GUIDE.md` | Production migration guide (preserves data) |
| `PRISMA_UPGRADE_EXPLAINED.md` | Schema design explanation |
| `MIGRATION_FILES.md` | All files overview |

---

## Do I Need Data Migration?

**NO.** Since you only have 2 dummy families and you're okay deleting them:
- Just drop the tables
- Apply fresh schema
- Start building with new Person model

**OR if you wanted to KEEP the 2 families** → Use the full data migration approach in `MIGRATION_GUIDE.md` with `scripts/migrate-data.ts`.

---

## After Fresh Start

Your application needs updates:

### 1. Forms must use split name fields
```tsx
// OLD:
<input name="headFullName" />

// NEW:
<input name="firstName" placeholder="First Name" />
<input name="middleName" placeholder="Middle Name (optional)" />
<input name="lastName" placeholder="Last Name" />
```

### 2. Add Person autocomplete
```tsx
// Query persons for autocomplete
const persons = await prisma.person.findMany({
  where: {
    OR: [
      { firstName: { contains: query, mode: 'insensitive' } },
      { lastName: { contains: query, mode: 'insensitive' } }
    ]
  },
  take: 10
});
```

### 3. Approval flow creates Person records (if you have admin approval)
See `PRISMA_UPGRADE_EXPLAINED.md` for the complete logic.

---

## Verification Queries

After running fresh start, check the new tables:

```sql
-- Should show new tables
\d persons
\d relationships
\d families

-- Should be empty (except users)
SELECT COUNT(*) FROM families;  -- 0
SELECT COUNT(*) FROM persons;   -- 0
SELECT COUNT(*) FROM relationships;  -- 0
```

---

## Rollback (If Something Goes Wrong)

```bash
# Restore from the backup created by fresh-start.bat
psql -h localhost -U postgres -d postgres < backup_before_fresh_start.sql
```

---

## Summary

✅ **You have 2 dummy families → delete them, use fresh start** ✅

Just run: **`fresh-start.bat`** then update your code to use the new schema.

---

**Questions?** Read `FRESH_START_DEV.md` for detailed steps.
