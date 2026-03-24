# 🚀 Fresh Start Migration - Development Guide

## When to Use This

You're in **development phase** with only **2 dummy families** and want to:
- Remove all existing family data
- Switch to the new Person-centric schema
- Start with a clean slate (no data migration needed)

---

## ⚠️ WARNING

**This will PERMANENTLY DELETE all family-related data:**
- Families
- Spouses
- Children
- (Posts, Comments, Likes, Users, etc. are NOT affected)

Only run if you're okay with losing the 2 dummy families!

---

## Step-by-Step

### **Option A: Automated Fresh Start (Recommended)**

```bash
# 1. Backup first just in case
pg_dump -h localhost -U postgres -d postgres > backup_before_fresh_start.sql

# 2. Run the fresh start SQL
psql -h localhost -U postgres -d postgres -f migrations/fresh_start_development.sql

# 3. Update your main schema
cp prisma/schema-fresh.prisma prisma/schema.prisma

# 4. Generate Prisma client
npx prisma generate

# 5. Verify schema
npx prisma validate

# 6. Start dev server
npm run dev
```

Your database is now fresh with the new schema! The application will work with the new Person model from the start.

---

### **Option B: Manual Drop & Reset**

If you prefer manual control:

```sql
-- In psql or database GUI:

-- 1. Drop old tables
DROP TABLE IF EXISTS "children" CASCADE;
DROP TABLE IF EXISTS "spouses" CASCADE;
DROP TABLE IF EXISTS "families" CASCADE;

-- 2. Run the fresh_start_development.sql to create new tables
\i migrations/fresh_start_development.sql

-- OR manually apply from schema-fresh.prisma using:
npx prisma db push --schema=prisma/schema-fresh.prisma

-- 3. Update schema file
cp prisma/schema-fresh.prisma prisma/schema.prisma

-- 4. Generate client
npx prisma generate
```

---

## What Changed

### ✅ New Schema Features

1. **Person Model** - Central table for all individuals
2. **Relationship Model** - Links parents to children (FATHER/MOTHER)
3. **Split Name Fields** - `firstName`, `middleName`, `lastName` everywhere
4. **Person Links** - `headPersonId`, `fatherId`, `motherId`, `personId` for Spouse/Child
5. **Proper Indexes** - Fast searches on `firstName`, `lastName`

### ❌ Removed (Compared to Old Schema)

- `Family.headFullName` → replaced with split fields + `headPersonId`
- `Family.fatherName` → replaced with `fatherFirstName`, `fatherMiddleName`, `fatherLastName`, `fatherId`
- `Family.motherName` → replaced with mother split fields + `motherId`
- `Spouse.fullName` → replaced with split fields + `personId`
- `Spouse.fatherName`, `motherName` → split fields
- `Child.fullName` → replaced with split fields + `personId`

---

## Next Steps

1. **Update Your Forms**
   - Split full name inputs into three fields (first, middle, last)
   - Add autocomplete for Person selection (using `firstName`/`lastName` indexes)
   - Store `personId` when selecting existing person

2. **Admin Approval Flow** (if applicable)
   - When family is approved, ensure Person records are created
   - Create Relationship records linking parents to children
   - Populate `personId` fields on Family/Spouse/Child

3. **Test Thoroughly**
   - Create a new family through the form
   - Verify Person records are created
   - Verify Relationships are created
   - Check that family tree queries work

---

## Need the Old Data Back?

If you accidentally ran this without backup:

```bash
# Restore from backup (if you made one)
psql -h localhost -U postgres -d postgres < backup_before_fresh_start.sql
```

Otherwise, the data is gone. You'll need to re-enter the dummy families manually.

---

## Still Have Questions?

- Check `PRISMA_UPGRADE_EXPLAINED.md` for schema design details
- Check `MIGRATION_GUIDE.md` for production migration steps (preserves data)
- Check `MIGRATION_FILES.md` for file reference

---

## ✅ Done!

You now have a fresh development database with the new Person-centric schema.

**Summary:**
- All old family data deleted ✓
- New tables created ✓
- Schema updated ✓
- Ready for development ✓
