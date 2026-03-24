# Plan: Fix Family Tree Layout Using D3 Tree Layout Algorithm

## Context

The current FamilyTree.tsx uses a manual CSS flexbox recursive layout that has inherent positioning problems with sibling relationships. The root cause is that when a node has both parents and children, the CSS-only approach cannot properly position all nodes in 2D space without causing overlapping or incorrect hierarchy perception.

**Issue**: When searching for person A, if A has brothers B and C, the current layout makes it appear as if A is a descendant of B and C due to positioning errors.

**Solution**: Use D3's tree layout algorithm (`d3.tree()`) to compute x,y coordinates for each node, while keeping our own React components (PersonCard) for rendering. We'll:
- Transform our tree data into a D3 hierarchy
- Let D3 compute positions using a proper tree layout algorithm
- Render our nodes as absolutely positioned React components
- Draw SVG connector lines between nodes

This hybrid approach gives us D3's intelligent layout while maintaining full control over node appearance.

---

## Approach

### Why react-d3-tree?

1. **Already in dependencies**: Listed in package.json (line 46) at version ^3.6.6
2. **Purpose-built**: Designed exactly for rendering hierarchical tree data in React
3. **Layout algorithm**: Uses D3's tree layout to compute optimal node positions (no manual CSS positioning needed)
4. **Interactive**: Built-in zoom, pan, and node selection
5. **Customizable**: Supports custom node rendering, styling, and connectors
6. **Proven**: Widely used, well-maintained

### Data Structure Compatibility

The current API returns the exact structure react-d3-tree expects:
- Each node has children (array)
- Each node carries node data (our `person` + `spouse` info)

**Challenge**: Our `TreeNode` has:
- `person` (node data)
- `spouse` (sibling-like in tree, should be rendered alongside)
- `parents` (should become the parent node with both father/mother shown as a couple)
- `children` (direct descendants)

We need to transform this to match D3's hierarchy. The typical approach:
- Each D3 node represents a **person**
- The spouse is rendered as part of the same node (side-by-side in card)
- Parents are the parent node in the tree

**Alternative**: Use a "virtual root" structure:
- Root = the selected person
- Children = their children
- Parents = transformed to be part of the parent node (both parents shown together)

But react-d3-tree expects a simple tree where each node has an array of children. Our challenge is handling:
1. Both parents need to appear at the parent level (not as separate parent nodes)
2. Spouse needs to appear with the person

We can solve this by:
- **Transform TreeNode to D3 node**: Where node data includes { person, spouse, parentsSummary }
- **Custom node component**: Renders the person card + spouse card side by side
- **Parent node** in D3 hierarchy = the father (or creates a "parent couple" virtual node representing both parents)

Let me think through the simplest transformation:

```
Current structure:
{
  person: A
  spouse: B
  parents: [
    { type: 'father', node: { person: F, spouse: M, ... } },
    { type: 'mother', node: { person: M, spouse: F, ... } }
  ]
  children: [C1, C2]
}

Desired D3 hierarchy:
Root: A (with spouse: B)
  └── Children: [C1, C2]
Parent (in D3 sense): F (with spouse: M)
  └── Their children: [A, ...maybe siblings?]
```

So the D3 tree structure would be:
```
{
  name: 'A',  // actually our person data
  spouse: { person: B, ... },
  children: [
    { name: 'C1', spouse: null, children: [] },
    { name: 'C2', spouse: null, children: [] }
  ]
}
```

And the parent would be:
```
{
  name: 'F',
  spouse: { person: 'M' },
  children: [
    { name: 'A', spouse: B, children: [...] }, // THIS IS THE PROBLEM
    { name: 'Sibling1', ... }
  ]
}
```

This creates a **graph cycle** if we naively include A in both places. D3 hierarchies are trees (acyclic). So we cannot represent the full family graph in a single tree without duplication or cycles.

### The True Nature of the Problem

A family tree is **not a tree** - it's a **graph** with cross links (spouses, multiple parent references). But common family tree visualizations treat it as a tree by:
- Root = selected person
- Parent branch = father's lineage only (paternal line) OR create a "parent couple" node
- Children = direct descendants
- Siblings appear as children of the parent (so they're at the same level as the selected person in the parent's children array)

The key insight: In a **paternal lineage** tree:
- Each node = a male person (if following father's line)
- Each node's spouse is displayed alongside but NOT part of the hierarchy
- Siblings appear as siblings under the same father

For a **bilateral** tree (both parents):
- We need to show both father and mother as a couple that are the parents
- Their children include the selected person and siblings
- This means we create a "couple" node that branches to children

react-d3-tree doesn't directly support couple nodes. But we can:
- Treat the **father** as the parent node, with mother rendered as part of his node (side-by-side)
- Then father.children includes all children (including the selected person)

This matches our original intended layout. And this is what we should do.

### Transformation Strategy

Given the root person R:
1. Find root person's father F (if exists) → F becomes the actual tree root
2. If no father, use mother. If no parents, use the person themselves.
3. Build D3 hierarchy starting from that root
4. For each person node:
   - Include person data + spouse data
   - Children = their children (from Family + relationships)
   - Use `visited` Set to avoid cycles

This way:
- Tree root = oldest ancestor we're showing (typically grandfather or great-grandfather)
- Selected person appears somewhere in the tree as a child of their father
- All siblings appear together as children of the same father
- No incorrect hierarchy

---

## Implementation Plan

### Overview

We'll replace the manual CSS flexbox recursive layout with a D3-based layout engine while keeping our React PersonCard components. The approach:

1. **Keep existing data fetching** (API calls return same TreeNode structure)
2. **Transform tree to D3 hierarchy** using `d3.hierarchy()`
3. **Apply D3 tree layout** (`d3.tree()`) to compute x,y coordinates
4. **Render as absolute positioned nodes** in a relative container
5. **Draw SVG connectors** between nodes using the computed coordinates
6. **Add zoom/pan** using our existing state or d3-zoom

### Step 1: Install D3 if needed (verify)

D3 is already in package.json (line 39), so we can import:
```ts
import { hierarchy, tree, TreeLayout, HierarchyNode } from 'd3';
```

### Step 2: Create D3 layout helper

We'll add a custom hook or utility in FamilyTree.tsx (or new file `lib/use-d3-layout.ts`):

**Function**: `computeLayout(rootNode: TreeNode): LayoutNode[]`

Where `LayoutNode`:
```typescript
interface LayoutNode {
  id: string;
  x: number;
  y: number;
  person: PersonData;
  spouse: TreeNode['spouse'];
  children: LayoutNode[];
  parent: LayoutNode | null; // for drawing connectors
  depth: number;
}
```

**Implementation**:
1. Convert our `TreeNode` to D3 hierarchy:
   ```ts
   const root = hierarchy(treeNode, d => d.children);
   ```
2. Configure tree layout:
   ```ts
   const treeLayout = tree<TreeNode>().nodeSize([120, 250]); // [height, width] spacing
   treeLayout(root);
   ```
3. Traverse D3 hierarchy and extract:
   - `x`, `y` (coordinates, where y is vertical distance, x is horizontal)
   - `person`, `spouse`, `children`
   - Store parent reference
4. Return flat array of all layout nodes

**Orientation**: D3's tree default is top-to-bottom. `nodeSize([verticalSpacing, horizontalSpacing])` gives us control.

### Step 3: Update FamilyTree.tsx rendering

**Remove**: The entire `PersonNode` function (lines 115-220) - we'll replace it with a flat map.

**New render structure**:
```tsx
const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);

useEffect(() => {
  if (treeData) {
    const nodes = computeLayout(treeData);
    setLayoutNodes(nodes);
  }
}, [treeData]);

return (
  <div
    className="relative overflow-auto"
    style={{ height: '75vh', cursor: 'grab' }}
    ref={containerRef}
  >
    {/* SVG layer for connectors */}
    <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
      {layoutNodes.map(node => {
        if (!node.parent) return null;
        return (
          <line
            key={`${node.id}-${node.parent.id}`}
            x1={node.parent.x}
            y1={node.parent.y + 40} // offset to bottom of parent card
            x2={node.x}
            y2={node.y - 40} // offset to top of child card
            stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
            strokeWidth="2"
          />
        );
      })}
    </svg>

    {/* Node layer */}
    {layoutNodes.map(node => (
      <div
        key={node.id}
        className="absolute flex flex-col items-center"
        style={{
          left: node.x,
          top: node.y,
          transform: 'translate(-50%, -50%)', // center on coordinate
        }}
      >
        <PersonCard
          person={node.person}
          selected={node.id === selectedPersonId}
          compact={compact}
        />
        {node.spouse && (
          <>
            <span className="text-lg mx-2">♥</span>
            <PersonCard
              person={node.spouse.person}
              selected={node.spouse.person.id === selectedPersonId}
              compact={compact}
            />
          </>
        )}
      </div>
    ))}
  </div>
);
```

**Key details**:
- Container `position: relative`
- SVG covers entire container, draws lines between parent and child nodes
- Nodes are `position: absolute` with centered transform
- Card dimensions: approximately 200px wide, 100px tall (compact mode smaller)
- Offsets on connector lines account for card size so lines connect to edges

### Step 4: Zoom and pan

We'll reuse our existing zoom state but apply it to the container via CSS transform:

```tsx
const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

const handleWheel = (e: React.WheelEvent) => {
  if (e.ctrlKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(s => Math.max(0.5, Math.min(3, s + delta)));
  }
};

// Apply to container:
<div
  style={{
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${scale})`,
    transformOrigin: '0 0',
  }}
  onWheel={handleWheel}
>
  {/* SVG and nodes inside */}
</div>
```

We'll keep the zoom buttons that update `scale` state.

**Pan**: Could add drag-to-pan. We'll implement if user requests, but zoom is priority.

### Step 5: Keep selection highlighting

- Already have `selectedPersonId` state
- Pass to `PersonCard` as `selected` prop
- Already implemented in PersonCard (our earlier changes)
- On node click: `setSelectedPersonId(node.id)`

We'll add click handler to node divs.

### Step 6: Dynamic centering

After layout is computed, we should center the tree in the viewport:

```tsx
useEffect(() => {
  if (layoutNodes.length > 0 && containerRef.current) {
    const { width, height } = containerRef.current.getBoundingClientRect();
    // Find bounding box of all nodes
    const xs = layoutNodes.map(n => n.x);
    const ys = layoutNodes.map(n => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;

    // Center the tree
    const centerX = (minX + maxX) / 2;
    const centerY = minY + 50; // show top generations initially

    setTransform({
      x: width / 2 - centerX,
      y: 20 - centerY,
      scale: 1
    });
  }
}, [layoutNodes]);
```

### Step 7: Remove old code

- Delete `PersonNode` function entirely
- Remove `selectedId` prop propagation (no longer needed recursively)
- Remove `EdgeConnector` component (we're using SVG lines)
- Keep `PersonCard` and enhance if needed

### Step 8: Preserve and test features

- **Search**: Keep PersonSearchDropdown
- **Initial load**: Same logic (auto-select defaultPersonId, fetch tree, reroot to father)
- **Selected highlighting**: Works via `selected` prop on PersonCard
- **Compact mode**: PersonCard already supports it
- **Theme**: PersonCard already themed
- **Loading/error states**: Keep existing
- **Zoom controls**: Update to use new transform state

### Step 9: Tune layout parameters

- Adjust `nodeSize([vertical, horizontal])` to control spacing
- Account for card dimensions: card width ~200px, height ~120px (full) or ~60px (compact)
- Ensure sufficient spacing to avoid overlapping
- Test with multi-generational trees (3 generations ancestors + descendants)

---

## Files to Modify

### Modified
1. **`components/family/FamilyTree.tsx`** - Complete render overhaul:
   - Remove `PersonNode` and `EdgeConnector`
   - Add D3 layout computation
   - Replace JSX with SVG + absolute positioned nodes
   - Add zoom/pan transform
   - Keep state/handlers/PersonCard

### New (optional)
1. **`lib/family-tree-d3-utils.ts`** - Extract layout computation logic (could keep in component file if simple)

---

## Verification Steps

1. Load the page, search for person A (with siblings B, C)
2. Verify A's father AA at top-center
3. Verify A, B, C at same level horizontally under AA
4. Verify each person's spouse shown alongside with heart symbol
5. Verify children appear below each person
6. Verify no nodes overlap
7. Select different persons → highlight appears correctly
8. Zoom in/out with buttons or Ctrl+scroll
9. Test with AA as root → should show AA's parents above, A/B/C as children below
10. Test edge cases: person with no spouse, no children, only one parent

---

## Alternative Consideration

If D3's tree layout doesn't handle spouse display well (vertical spacing might not account for double-width nodes), we can:
- Increase horizontal spacing for nodes with spouse
- Or adjust the `nodeSize` to be wider
- Or treat spouse as separate "child" in layout but visually place inline

We'll tune during implementation.

### Modified
1. `components/family/FamilyTree.tsx` - Replace entire rendering logic, keep API state/handlers
2. `lib/family-tree-service.ts` may need minor adjustments if we want to change how spouse/children are structured, but the current output should be fine.

### New
1. `components/family/CustomNodeLabel.tsx` - The node label component for react-d3-tree (or keep inline)
2. `lib/family-tree-d3-transform.ts` - Transformation utilities

---

## Verification Steps

1. Load the page and search for a person with siblings (e.g., A)
2. Verify that A's father AA is at top
3. Verify that A, B, C appear horizontally as siblings under AA
4. Verify that A's children (d, e) appear below A
5. Verify that B's children (f, g) appear below B
6. Verify that C's children (h, i) appear below C
7. Select A → A card highlighted
8. Select B → B card highlighted, A no longer highlighted
9. Search for AA → AA at root, children A/B/C visible
10. Zoom in/out using buttons or scroll+ctrl
11. Test on mobile (responsive)

---

## Alternative Consideration

If react-d3-tree proves incompatible with our exact node structure (spouse + parents coupling), we could consider:

- **dagre-d3**: Another D3-based layout specifically for directed graphs. More flexible but more complex.
- **react-flow**: For node-based diagrams, but might be overkill.
- **Custom SVG with D3 hierarchy**: Use D3's `d3.tree()` to compute positions manually, then render SVG ourselves.

I'll start with react-d3-tree as it's simplest and already declared in package.json.

---

## Go/No-Go Decision

Before implementing, verify that:
- `react-d3-tree` can be successfully installed and imported
- The node customization API meets our needs (render custom React components as node labels)
- Performance is acceptable with ~50 nodes

If any of these fail, consider the alternatives.
