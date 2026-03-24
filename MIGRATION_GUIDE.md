# Migration Guide: Upgrade to Person-Centric Family Tree

## ⚠️ IMPORTANT: Data Preservation Strategy

This migration is designed to **preserve all existing data** while upgrading the schema. It uses a **two-phase approach**:

1. **Phase 1 (Additive)**: Add new tables/columns without dropping anything
2. **Phase 2 (Constraints + Cleanup)**: Add foreign keys and optionally drop old columns **AFTER** verifying data integrity

---

## Pre-Migration Checklist

✅ Backup your database:
```bash
pg_dump -h localhost -U postgres -d postgres > backup_before_person_migration.sql
```

✅ Ensure no writes are happening during migration (maintenance mode)

✅ Review the schema files:
- `prisma/schema-upgraded.prisma` (new schema)
- `prisma/schema.prisma` (current schema)

---

## Step-by-Step Migration

### **Step 1: Apply Phase 1 (Additive)**

This adds new tables and columns without touching existing data.

```bash
psql -h localhost -U postgres -d postgres -f migrations/upgrade_to_person_model_additive.sql
```

**What this does:**
- Creates `RelationType` enum
- Creates `persons` table
- Creates `relationships` table
- Adds new split-name columns to `families`, `spouses`, `children` (nullable)
- Creates all indexes
- **Does NOT drop any old columns**

**Expected output:** All commands succeed with no errors.

---

### **Step 2: Update Prisma Schema**

After applying the database changes, update your main schema file:

```bash
cp prisma/schema-upgraded.prisma prisma/schema.prisma
```

Then regenerate Prisma client:

```bash
npx prisma generate
```

---

### **Step 3: Run Data Migration Script**

This script:
- Reads all existing families
- Creates Person records for heads, fathers, mothers, spouses, children
- Populates the new split-name columns
- Creates Relationship records
- Updates Family/Spouse/Child with `personId` links

```bash
# Install ts-node if needed
npm install -g ts-node

# Run migration
ts-node scripts/migrate-data.ts
```

**Monitor output carefully.** It should show:
```
Starting data migration...
Migrating families...
Migrated X families
Data migration complete!
```

**If errors occur:**
- Check database connectivity
- Ensure Phase 1 completed successfully
- Check for duplicate names or special characters

---

### **Step 4: Verify Data Migration**

Run these checks:

```sql
-- Count persons created
SELECT COUNT(*) FROM persons;  -- Should match total heads + fathers + mothers + spouses + children

-- Check that all families have headPersonId set
SELECT COUNT(*) FROM families WHERE headPersonId IS NULL;  -- Should be 0

-- Check that children have personId
SELECT COUNT(*) FROM children WHERE personId IS NULL;  -- Should be 0 (unless there were no children)

-- Check relationships created
SELECT COUNT(*) FROM relationships;  -- Should have father->head, mother->head, head->child, spouse->child links
```

If any counts are unexpected, investigate before proceeding.

---

### **Step 5: Apply Phase 2 (Constraints)**

**Only after verification passes!**

```bash
psql -h localhost -U postgres -d postgres -f migrations/upgrade_to_person_model_constraints.sql
```

This:
- Adds foreign key constraints
- **Does NOT drop old columns yet** (commented out)
- **Does NOT make columns NOT NULL yet** (commented out)

---

### **Step 6: Post-Migration Testing**

1. **Run application tests** (if any)
2. **Verify forms still work** with split name fields
3. **Test autocomplete** for Person selection
4. **Check admin approval flow** creates correct Person and Relationship records
5. **Verify family tree queries** work via relationships

---

## Optional: Cleanup Old Columns (After 30 Days)

Once you're confident the new system works correctly and all old code paths are updated:

1. **Ensure no code uses old columns** (`headFullName`, `fatherName`, `motherName`, `fullName`)
2. **Update any remaining queries** to use split fields or Person model
3. **Uncomment the DROP COLUMN statements** in `migrations/upgrade_to_person_model_constraints.sql`
4. **Apply the cleanup**:

```bash
psql -h localhost -U postgres -d postgres -f migrations/upgrade_to_person_model_cleanup.sql
```

**⚠️ WARNING:** This is irreversible. Old name data will be permanently lost. Only do this after full validation.

---

## Rollback Plan

If something goes wrong:

### **Before Phase 2:**
- Simply restore from backup (Step 1 backup)
- Drop new tables manually
- Continue using old schema (`schema.prisma`)

### **After Phase 2:**
- More complex; may need to manually remove constraints/tables
- Restore from backup is safest

---

## Frequently Asked Questions

**Q: What about families that are still PENDING?**
A: They are migrated with NULL personIds. When admin approves, they will get Person records created via the new approval flow. The existing split-name fields serve as fallback.

**Q: Does the name splitting handle complex names?**
A: The migration script uses simple splitting: first word = first name, last word = last name, everything else = middle name. This may not be perfect for all cultures. Manual review may be needed.

**Q: What happens to existing Relationship records?**
A: We create new Relationships based on family structure. Old data doesn't have Relationship table, so we're building the graph from scratch.

**Q: Can I combine phases into one transaction?**
A: Not recommended due to long-running data migration. But for dev environments, you could wrap everything in a single transaction.

**Q: How do I handle gender for parents?**
A: The script assumes father is Male and mother is Female based on the gender stored in Family for head. For spouse, it uses the stored gender. Adjust the script if your logic differs.

---

## Environment-Specific Notes

### Development
- You can combine steps more aggressively
- Consider resetting DB and applying additive + constraints in one go
- Use `prisma db push` after schema change instead of raw SQL

### Production
- **Take full backup**
- **Downtime required** (at least during data migration)
- Test migration on staging first with production data copy
- Monitor performance; data migration may be slow on large datasets
- Consider batching the data migration if >10k families

---

## Support

If migration fails:
1. Check `migrate-data.ts` logs
2. Verify database connection
3. Check for constraint violations (duplicate personIds, etc.)
4. Restore from backup and retry after fixing

---

**End of Migration Guide**
