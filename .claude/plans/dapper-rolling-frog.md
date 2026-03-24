# Plan: Family Tree Feature

## Context

The application currently stores family data in two parallel structures:
1. **Family table** - Denormalized storage for a user's immediate family (head, father, mother, spouse, children). Each user has exactly one family record.
2. **Relationship table** - Normalized parent-child relationships between Person records with `relationType` (FATHER/MOTHER). This can link persons across families and track complex relationships.

The FamilyPage (`app/dashboard/family/page.tsx`) displays the current user's family in a flat card-based view.

**Goal:** Implement a visual family tree that shows ancestry and descendants in a hierarchical tree format, leveraging the Relationship table for complete connectivity.

---

## Requirements (Based on User Input)

### Core Functionality
1. **Entry via Search**: User searches any person in database, selects them as root
2. **Tree Display**: Top-down layout showing:
   - **Ancestors (up to 3 generations)**: parents, grandparents, great-grandparents
   - **Root person**: selected person, centered
   - **Spouse**: displayed alongside root (same generation)
   - **Descendants (up to 3 generations)**: children, grandchildren, great-grandchildren
3. **Blood relations only**: Excludes in-laws (e.g., spouse's parents are not shown)
4. **Person node details**: Name, gender indicator, maybe education
5. **Expandable/collapsible**: Can expand nodes to reveal deeper generations if initial depth limited

### User Experience
- Tree should be responsive and fit on screen
- Loading states and error handling
- Zoom/pan optional (v2)
- Clicking a node could drill-down to make that person the new root (v2)

---

## Data Model Analysis

### Current Structure

```
Family (per user)
├── headPersonId → Person
├── fatherId → Person
├── motherId → Person
├── spouse → Spouse (with personId → Person)
└── children[] → Child (each with personId → Person)

Relationship (links Person ↔ Person)
├── parentId → Person
├── childId → Person
└── relationType (FATHER/MOTHER)
```

### Tree Query Strategy

For a given **root person**, we need to recursively fetch:

1. **Parents**:
   - If person is a `head` of a family: use `Family.fatherId` and `Family.motherId`
   - Also check `Relationship` where `childId = person.id` to capture additional parent links (e.g., biological vs adoptive, or parents from previous families)

2. **Spouse**:
   - If person is a `head` of a family: use `Family.spouse.personId`
   - Could also have spouse relationships in `Relationship` if we ever extend (currently only FATHER/MOTHER types)

3. **Children**:
   - If person is a `head` of a family: use `Child.personId` from that family's children
   - Also check `Relationship` where `parentId = person.id` to capture children linked through Relationship table

4. **Person Details**: Query `Person` table for each person ID to get full name, gender, etc.

5. **Person's own family**: To show their spouse/children in their subtree, we need to fetch their `Family` record if they are a head.

---

## Implementation Plan

### Phase 1: API Endpoint - Get Family Tree

**New endpoint:** `GET /api/person/[id]/tree?ancestorDepth=3&descendantDepth=3`

**Implementation:**
- Create helper service `lib/family-tree-service.ts` with `buildFamilyTree(personId, ancestorDepth, descendantDepth, visited?)`
- The service:
  1. Fetches the person
  2. Fetches their immediate family:
     - **Parents**: from `Family` where `headPersonId = personId` (fatherId, motherId) + `Relationship` where `childId = personId` (additional parent links)
     - **Spouse**: from `Family.spouse.personId` if family exists and married
     - **Children**: from `Child` records of that family + `Relationship` where `parentId = personId`
  3. Recursively builds parent subtrees (up to ancestorDepth) and child subtrees (up to descendantDepth)
  4. Uses a `visited` Set to prevent circular reference loops
  5. Batches Person queries to avoid N+1: collect all person IDs, fetch with `findMany`, map results
  6. Returns a `TreeNode` object
- Create API route `app/api/person/[id]/tree/route.ts` that calls the service and returns JSON

**Key Prisma queries:**
```ts
// Get person's own family if they are head
const family = await prisma.family.findFirst({
  where: { headPersonId: personId },
  include: {
    spouse: { select: { personId: true } },
    children: { select: { personId: true } }
  }
});

// Get parent relationships from Relationship table
const parentRels = await prisma.relationship.findMany({
  where: { childId: personId },
  select: { parentId: true, relationType: true }
});

// Get child relationships from Relationship table
const childRels = await prisma.relationship.findMany({
  where: { parentId: personId },
  select: { childId: true }
});
```

### Phase 2: Frontend Component - TreeVisualization

**New component:** `components/family/FamilyTree.tsx`

**Libraries:** Use `react-d3-tree` or a custom nested div layout with flexbox. Since the app uses Tailwind and simple layouts, a custom recursive component with Tailwind is feasible.

Given the simplicity (tree nodes as cards), we can implement a CSS-based tree using:
- Flexbox for horizontal alignment (generations side by side)
- Nested lists `<ul><li>` for vertical connections
- SVG lines for connecting edges (optional, can use simple borders)

**Simpler alternative:** Show tree as expandable nested cards (accordion style) - each person card shows their spouse and children as indented sub-cards. This avoids complex drawing.

**Proposed design:**
```
         [Root Person - Head]
          /       |        \
    [Father]  [Mother]   [Spouse]
       |         |
   [Grandpa]  [Grandma]
       |
   [Great...]
       |
    [Siblings?]
       |
    [Children] - [Child1]
                [Child2]
```

But we'll use a **vertical lineage** layout:
- Root at top (or center)
- Parents above root
- Spouse next to root (same level)
- Children below root
- Grandparents above parents, grandchildren below children

**Component structure:**
```
FamilyTree
├── TreeNode (recursive)
│   ├── PersonCard (displays person info)
│   ├── ChildrenContainer (maps to child TreeNode components)
│   └── ParentsContainer (maps to parent TreeNode components)
└── Controls (depth slider, zoom buttons)
```

**Styling:**
- Use Tailwind for cards (rounded borders, shadows)
- Connector lines: CSS borders or SVG
- Gender colors: blue for Male, pink/red for Female

**Implementation:** We'll build a simple initial version without complex libraries, then improve.

### Phase 3: Integration

**Add new page:** `app/dashboard/family-tree/page.tsx`

**Or:** Add a "Family Tree" tab/button on the existing FamilyPage that opens a modal or navigates to a new page.

**Route protection:** Should be accessible only to authenticated users.

**Data flow:**
- Page loads → fetch current user's family → get head person ID → fetch tree data from `/api/person/[headId]/tree`
- Render `<FamilyTree data={treeData} />`

**Loading state:** Show spinner while fetching.

### Phase 4: Enhancements (Optional)

1. **Person click**: Opens modal with detailed info and actions (edit, view their tree)
2. **Highlight lineage**: When clicking a node, highlight path to root
3. **Add missing links**: Quick-add spouse/children from tree view
4. **Print/export**: PDF or image export
5. **Multiple tree roots**: Allow starting from any person (search to select root)

---

## Technical Considerations

### Performance
- With caching (React Query or SWR) we can avoid refetching subtrees
- Limit default depth to 2 (parents, children) to keep initial render fast
- Use `personId` deduplication in recursive builds to prevent infinite loops (cycles)
- Lazy-load deeper generations on demand

### Infinite Loop Prevention
- The Relationship table could theoretically have cycles (person A as parent of B, B as parent of A). We'll track visited person IDs in the recursion.

### Edge Cases
- **Partial families**: Many persons may not have a Family record (e.g., only known as father in someone else's family). The API should handle missing families gracefully.
- **Multiple parent relationships**: Relationship table allows both father and mother relations. We'll respect both. However, the Family table has separate fatherId/motherId fields, so we need to combine sources.
- **Deceased persons**: Show indicator
- **Privacy**: All API endpoints require authentication. We should only return persons that the logged-in user has access to (currently any person linked to any family of the user? Or global access?). For now, assume all persons are visible to all users since the app is a closed community.

### API Design

**Chosen approach: Single endpoint with server-side recursion (Option A)**

Endpoint: `GET /api/person/[id]/tree?ancestorDepth=3&descendantDepth=3`

The backend will recursively fetch the tree up to the specified depths, using batched queries to avoid N+1. This provides one network call for the entire tree.

**Response structure:**
```json
{
  "person": { "id": "...", "firstName": "...", "lastName": "...", "gender": "...", "education": "..." },
  "spouse": { ... } | null,
  "parents": [
    { "type": "father", "person": { ... }, "parents": [...], "spouse": ... },
    { "type": "mother", "person": { ... }, "parents": [...], "spouse": ... }
  ],
  "children": [
    {
      "person": { ... },
      "spouse": { ... },
      "children": [...]
    }
  ]
}
```

- Each parent node can include their own parents (up to remaining depth)
- Each child node can include their children (spouse included but not their parents)
- Deduplication ensures a person appears once even if reachable through multiple paths

---

## Implementation Steps

### Backend
1. Create `lib/family-tree-service.ts`:
   - `async function buildFamilyTree(personId: string, depth: number): Promise<TreeNode>`
   - Uses Prisma to fetch person, their family, relationships
   - Recursively builds up to depth
   - Deduplicates nodes by personId

2. Create `app/api/person/[id]/tree/route.ts`:
   - GET handler with query params `depth`, `includeSpouse`
   - Calls `buildFamilyTree`
   - Returns JSON tree

3. Add error handling: person not found, circular reference protection

### Frontend
1. Create `components/family/TreeNode.tsx`:
   - Recursive component rendering a person card and its children
   - Uses Tailwind for styling

2. Create `components/family/FamilyTree.tsx`:
   - Main container, fetches data (or receives as prop)
   - Renders root `TreeNode`
   - Adds controls (zoom, depth)

3. Create `app/dashboard/family-tree/page.tsx`:
   - Page wrapper with DashboardLayout
   - Loads tree for current user's head person
   - Shows loading/error states

4. Link from FamilyPage: Add "View Family Tree" button that navigates to `/dashboard/family-tree`

### Testing
- Seed a multi-generational family
- Verify tree shows correct hierarchy
- Check that clicking nodes works
- Verify no infinite loops with circular data

---

## Files to Create/Modify

### New Files
- `lib/family-tree-service.ts`
- `app/api/person/[id]/tree/route.ts`
- `components/family/TreeNode.tsx`
- `components/family/FamilyTree.tsx`
- `app/dashboard/family-tree/page.tsx`

### Modified Files
- `app/dashboard/family/page.tsx` - Add link/button to tree page
- Possibly `types/index.ts` - Add `TreeFamily` type definitions

---

## Questions for User

1. Should the tree include **only the current user's data** (their lineage and descendants) or allow viewing any person's tree by search?
2. What is the **maximum depth** you want initially? I suggest 2 (parents + children) with option to expand.
3. Do you want to see **spouse's parents** in the tree (in-laws)? This adds complexity.
4. Should the tree show **half-siblings** (children from different marriages)?
5. Preferred layout:
   - **Top-down** (ancestors above, descendants below)
   - **Left-right** (ancestors left, descendants right)
   - **Center-out** (root in center, all directions)

---

## Success Criteria

- User can view a 3-generation tree (grandparents → parents → self → children) on one screen without scrolling
- All person nodes show name and gender
- Clicking a node can expand/collapse their children (if depth limit reached)
- Tree loads within 2 seconds for typical family sizes (10-50 persons)
- No console errors, proper TypeScript types

---
