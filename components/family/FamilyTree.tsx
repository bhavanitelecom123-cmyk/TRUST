"use client";

import { useState, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import PersonSearchDropdown from "@/components/forms/PersonSearchDropdown";
import { hierarchy, tree, type HierarchyNode } from "d3-hierarchy";
import { exportFamilyTreeToPDF } from "@/lib/pdf-export";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PersonData {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender: string;
  education?: string | null;
  isDeceased?: boolean;
  dateOfBirth?: string | null;
}

interface TreeNode {
  person: PersonData;
  spouse: TreeNode | null;
  parents: Array<{ type: "father" | "mother"; node: TreeNode }>;
  children: TreeNode[];
}

interface FamilyTreeProps {
  defaultPersonId?: string;
  compact?: boolean;
}

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  person: PersonData;
  spouse: TreeNode | null;
  children: LayoutNode[];
  parent: LayoutNode | null;
  depth: number;
  hasSpouse: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Card dimensions — keep in sync with PersonCard styling
const CARD_WIDTH = 160;     // px, matches max-w in PersonCard
const CARD_HEIGHT = 88;     // px, fixed height — fits name + education + DOB/age + badge
const SPOUSE_GAP = 32;      // gap between person card and spouse card (heart icon area)
const COUPLE_WIDTH = CARD_WIDTH * 2 + SPOUSE_GAP; // total width for a node that has a spouse

// FIX 1: Use CARD_WIDTH (not COUPLE_WIDTH) as the base for horizontal spacing.
// Couples render to the right of the anchor and don't need to push siblings apart.
const NODE_H_SPACING = CARD_WIDTH + 20;   // 180px — tight sibling spacing
const NODE_V_SPACING = CARD_HEIGHT + 80;  // 144px — comfortable generation gap

// Elbow stub: how far the line drops straight down before the horizontal bar
const ELBOW_STUB = 20;

// ─── Normalize API response into a top-down tree ─────────────────────────────
//
// The API returns a node-centric structure:
//   { person, spouse, parents: [{ type, node: { person, spouse, children: [...siblings] } }], children }
//
// parents[].node already contains the full subtree for that ancestor including
// all siblings. We walk up the parents chain to find the topmost ancestor and
// use that node directly — it already has everyone as descendants via children[].
//
// One caveat: the searched person's OWN children are in the top-level `children`
// array, but their entry inside the ancestor's children[] may be a stub (no children).
// We merge the two by replacing the stub with the full version.

function normalizeTree(apiNode: TreeNode): TreeNode {
  // The API returns a node-centric response. For a searched person at depth N,
  // the parents[] chain looks like:
  //
  //   apiNode.parents[0].node      = direct parent (father)
  //     .parents[0].node           = grandfather
  //       .parents[0].node         = great-grandfather  ...etc
  //
  // At EACH level, the API omits the child being viewed from that parent's
  // children[] — it only includes siblings at that level.
  //
  // Example (search Abhijit):
  //   Naranbhai.children = [Shital, Indrajit]   ← Abhijit missing
  //   Manaji.children    = [Amrut, Ashok]        ← Naranbhai missing
  //
  // Fix: walk the parents[] chain bottom-up, building a corrected chain where
  // each child is inserted into their parent's children[] if absent.

  // Build the chain from searched person up to root:
  // chain[0] = apiNode (searched), chain[1] = father, chain[2] = grandfather ...
  const chain: TreeNode[] = [apiNode];
  let cursor = apiNode;
  while (cursor.parents && cursor.parents.length > 0) {
    const entry = cursor.parents.find((p) => p.type === "father") ?? cursor.parents[0];
    chain.push(entry.node);
    cursor = entry.node;
  }

  // If no parents at all, searched person IS the root
  if (chain.length === 1) return apiNode;

  // Now rebuild bottom-up: start from the searched person and fold upward.
  // At each step, ensure the current node appears in its parent's children[].
  let current = chain[0]; // start with fully-populated searched node

  for (let i = 1; i < chain.length; i++) {
    const parent = chain[i];

    // Does parent already have current in its children?
    const existingIdx = parent.children.findIndex(
      (c) => c.person.id === current.person.id
    );

    let newChildren: TreeNode[];
    if (existingIdx !== -1) {
      // Replace the stub with our fully-populated current node
      newChildren = parent.children.map((c) =>
        c.person.id === current.person.id ? current : c
      );
    } else {
      // Insert current into parent's children (API omitted it entirely)
      newChildren = [...parent.children, current];
    }

    // Produce a corrected parent node and move up
    current = { ...parent, children: newChildren };
  }

  // current is now the fully-patched root
  return current;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

function computeLayout(rootNode: TreeNode): LayoutNode[] {
  const root = hierarchy(rootNode, (d) =>
    d.children.filter(Boolean) as TreeNode[]
  );

  if (!root.children || root.children.length === 0) {
    return [
      {
        id: root.data.person.id,
        x: 0,
        y: 0,
        person: root.data.person,
        spouse: root.data.spouse,
        children: [],
        parent: null,
        depth: 0,
        hasSpouse: !!root.data.spouse,
      },
    ];
  }

  const treeLayout = tree<TreeNode>().nodeSize([
    NODE_H_SPACING,
    NODE_V_SPACING,
  ]);
  treeLayout(root);

  const layoutMap = new Map<HierarchyNode<TreeNode>, LayoutNode>();

  root.each((d3Node) => {
    // d3Node.x and d3Node.y are added by the tree layout, but not in the type definition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeWithCoords = d3Node as any;
    const layoutNode: LayoutNode = {
      id: d3Node.data.person.id,
      x: nodeWithCoords.x ?? 0,
      y: nodeWithCoords.y ?? 0,
      person: d3Node.data.person,
      spouse: d3Node.data.spouse,
      children: [],
      parent: null,
      depth: d3Node.depth,
      hasSpouse: !!d3Node.data.spouse,
    };
    layoutMap.set(d3Node, layoutNode);
  });

  root.each((d3Node) => {
    const layoutNode = layoutMap.get(d3Node)!;
    if (d3Node.parent) layoutNode.parent = layoutMap.get(d3Node.parent)!;
    if (d3Node.children) {
      layoutNode.children = d3Node.children
        .map((c) => layoutMap.get(c))
        .filter((c): c is LayoutNode => c != null);
    }
  });

  const result = Array.from(layoutMap.values());
  result.forEach((n) => {
    if (!isFinite(n.x)) n.x = 0;
    if (!isFinite(n.y)) n.y = 0;
  });

  return result;
}

// ─── FIX 2: Elbow connector paths ────────────────────────────────────────────
//
// Structure per parent:
//
//   parent-centre
//        │   ← vertical stub (ELBOW_STUB px)
//   ─────┼─────   ← horizontal bar spanning all children
//        │         │
//      child1   child2
//
// Single child → straight vertical line (no bar).

function buildElbowPaths(nodes: LayoutNode[]): string[] {
  const paths: string[] = [];

  // Group children by their parent id
  const byParent = new Map<string, LayoutNode[]>();
  for (const n of nodes) {
    if (!n.parent) continue;
    const pid = n.parent.id;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push(n);
  }

  for (const [, siblings] of byParent) {
    if (!siblings.length) continue;
    const parent = siblings[0].parent!;

    const px = parent.x;
    const py = parent.y + CARD_HEIGHT / 2;   // bottom edge of parent card
    const barY = py + ELBOW_STUB;             // horizontal bar Y

    if (siblings.length === 1) {
      // Single child — straight vertical line
      const cy = siblings[0].y - CARD_HEIGHT / 2;
      paths.push(`M${px},${py} L${siblings[0].x},${cy}`);
    } else {
      const sorted = [...siblings].sort((a, b) => a.x - b.x);
      const leftX  = sorted[0].x;
      const rightX = sorted[sorted.length - 1].x;

      // Vertical stub down from parent
      paths.push(`M${px},${py} L${px},${barY}`);
      // Horizontal bar spanning all children
      paths.push(`M${leftX},${barY} L${rightX},${barY}`);
      // Vertical drop from bar down to each child
      for (const child of sorted) {
        const cy = child.y - CARD_HEIGHT / 2;
        paths.push(`M${child.x},${barY} L${child.x},${cy}`);
      }
    }
  }

  return paths;
}

// Label: placed at the midpoint of each child's vertical drop segment
interface EdgeLabel {
  x: number;
  y: number;
  label: string;
}

function buildEdgeLabels(nodes: LayoutNode[]): EdgeLabel[] {
  const labels: EdgeLabel[] = [];

  const byParent = new Map<string, LayoutNode[]>();
  for (const n of nodes) {
    if (!n.parent) continue;
    const pid = n.parent.id;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push(n);
  }

  for (const [, siblings] of byParent) {
    if (!siblings.length) continue;
    const parent = siblings[0].parent!;
    const py = parent.y + CARD_HEIGHT / 2;
    const barY = siblings.length === 1 ? py : py + ELBOW_STUB;

    for (const child of siblings) {
      const cy = child.y - CARD_HEIGHT / 2;
      labels.push({
        x: child.x,
        y: (barY + cy) / 2,
        label: child.person.gender === "Male" ? "Son" : "Daughter",
      });
    }
  }

  return labels;
}

// ── Tree Bounds Calculation ────────────────────────────────────────────────

interface TreeBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function getTreeBounds(layoutNodes: LayoutNode[]): TreeBounds {
  if (layoutNodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const node of layoutNodes) {
    const top = node.y - CARD_HEIGHT / 2;
    const bottom = node.y + CARD_HEIGHT / 2;
    let left: number;
    let right: number;
    if (node.hasSpouse) {
      left = node.x - CARD_WIDTH / 2;
      right = node.x + (COUPLE_WIDTH - CARD_WIDTH / 2);
    } else {
      left = node.x - CARD_WIDTH / 2;
      right = node.x + CARD_WIDTH / 2;
    }
    if (left < minX) minX = left;
    if (right > maxX) maxX = right;
    if (top < minY) minY = top;
    if (bottom > maxY) maxY = bottom;
  }
  return { minX, maxX, minY, maxY };
}

// ─── PersonCard ───────────────────────────────────────────────────────────────

interface PersonCardProps {
  person: PersonData;
  selected?: boolean;
  isDark: boolean;
}

function PersonCard({ person, selected = false, isDark }: PersonCardProps) {
  const fullName = [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(" ");

  const isMale = person.gender === "Male";
  const isDeceased = person.isDeceased;

  // Calculate age from date of birth
  const age = (() => {
    if (!person.dateOfBirth) return null;
    try {
      const birth = new Date(person.dateOfBirth);
      if (isNaN(birth.getTime())) return null;
      const today = new Date();
      let a = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
      return a;
    } catch { return null; }
  })();

  // Gender-aware accent colours
  const accentBg = isMale
    ? isDark
      ? "bg-blue-500/20"
      : "bg-blue-50"
    : isDark
    ? "bg-rose-500/20"
    : "bg-rose-50";

  const accentBorder = selected
    ? isMale
      ? "border-blue-400"
      : "border-rose-400"
    : isDark
    ? "border-gray-600"
    : "border-gray-200";

  const accentRing = selected
    ? `ring-2 ${isMale ? "ring-blue-400/50" : "ring-rose-400/50"}`
    : "";

  const iconColor = isMale
    ? isDark
      ? "text-blue-400"
      : "text-blue-500"
    : isDark
    ? "text-rose-400"
    : "text-rose-500";

  return (
    <div
      className={`
        relative rounded-xl border ${accentBorder} ${accentRing}
        ${isDark ? "bg-gray-800/90" : "bg-white"}
        shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer
        px-3 py-2.5 flex items-center gap-2.5
        ${isDeceased ? "opacity-70" : ""}
      `}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT, overflow: 'hidden' }}
    >
      {/* Gender avatar circle */}
      <div
        className={`
          flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
          ${accentBg} border ${accentBorder}
        `}
      >
        {isMale ? (
          <svg className={`w-5 h-5 ${iconColor}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        ) : (
          <svg className={`w-5 h-5 ${iconColor}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C9.24 2 7 4.24 7 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 10c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z" />
          </svg>
        )}
      </div>

      {/* Text content */}
      <div className="flex flex-col min-w-0 flex-1">
        <span
          className={`
            font-semibold text-[13px] leading-tight truncate
            ${isDark ? "text-gray-100" : "text-gray-800"}
            ${isDeceased ? "line-through decoration-gray-400" : ""}
          `}
        >
          {fullName}
        </span>

        {person.education && (
          <span className={`text-[10px] mt-0.5 truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {person.education}
          </span>
        )}

        {age !== null && (
          <span className={`text-[10px] mt-0.5 truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Age: {age}
          </span>
        )}

        <span className={`text-[9px] font-medium uppercase tracking-wide mt-0.5 ${iconColor}`}>
          {person.gender}
          {isDeceased && <span className="ml-1 text-gray-400">· Deceased</span>}
        </span>
      </div>
    </div>
  );
}

// ─── SpouseConnector ──────────────────────────────────────────────────────────

function SpouseConnector({ isDark }: { isDark: boolean }) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <div className={`h-px w-3 ${isDark ? "bg-rose-400/60" : "bg-rose-300"}`} />
      <span className="text-rose-500 text-base leading-none select-none">♥</span>
      <div className={`h-px w-3 ${isDark ? "bg-rose-400/60" : "bg-rose-300"}`} />
    </div>
  );
}

// ─── FamilyTree ───────────────────────────────────────────────────────────────

export default function FamilyTree({
  defaultPersonId,
  compact = false,
}: FamilyTreeProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [treeRootId, setTreeRootId] = useState<string | null>(defaultPersonId || null);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isExporting, setIsExporting] = useState(false);

  // ── Pan / pinch state ──
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  // Touch: track last single-touch position and pinch distance
  const lastTouch = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);

  // Derived connector data (recomputed whenever layoutNodes changes)
  const elbowPaths = buildElbowPaths(layoutNodes);
  const edgeLabels = buildEdgeLabels(layoutNodes);

  // ── Auto-load on defaultPersonId ──
  useEffect(() => {
    if (!defaultPersonId) return;
    setSelectedPersonId(defaultPersonId);
    fetchTree(defaultPersonId);
  }, [defaultPersonId]);

  // ── Compute D3 layout ──
  useEffect(() => {
    if (!treeData) return;
    try {
      setLayoutNodes(computeLayout(treeData));
    } catch (e) {
      console.error("Layout error:", e);
      setLayoutNodes([]);
    }
  }, [treeData]);

  // ── Centre tree on first render ──
  useEffect(() => {
    if (layoutNodes.length === 0 || !containerRef.current) return;
    const { width } = containerRef.current.getBoundingClientRect();
    const xs = layoutNodes.map((n) => n.x).filter(isFinite);
    const ys = layoutNodes.map((n) => n.y).filter(isFinite);
    if (!xs.length || !ys.length) return;
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    setTransform({
      x: width / 2 - (minX + maxX) / 2,
      y: 60 - minY,
      scale: 1,
    });
  }, [layoutNodes]);

  // ── Fetch tree data ──
  const fetchTree = async (personId: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/persons/${personId}/tree?ancestorDepth=2&descendantDepth=2`
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch tree");
      }
      const data = await res.json();
      // Normalize: extract root ancestor and build a clean top-down tree
      setTreeData(normalizeTree(data.tree));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Person search selection ──
  const handleSelectPerson = (person: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
  }) => {
    setSelectedPersonId(person.id);
    setSearchQuery("");
    // fetchTree calls normalizeTree internally — it will walk parents[] to find root
    fetchTree(person.id);
  };

  // ── Zoom ──
  const zoom = (delta: number) =>
    setTransform((p) => ({
      ...p,
      scale: Math.max(0.3, Math.min(3, p.scale + delta)),
    }));

  const resetView = () => {
    if (!containerRef.current || !layoutNodes.length) {
      setTransform({ x: 0, y: 0, scale: 1 });
      return;
    }
    const { width } = containerRef.current.getBoundingClientRect();
    const xs = layoutNodes.map((n) => n.x).filter(isFinite);
    const ys = layoutNodes.map((n) => n.y).filter(isFinite);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    setTransform({ x: width / 2 - (minX + maxX) / 2, y: 60 - minY, scale: 1 });
  };

  // ── Export to PDF ──
  const handleExportPDF = async () => {
    if (!containerRef.current || layoutNodes.length === 0) return;

    setIsExporting(true);

    try {
      // Save current transform
      const originalTransform = { ...transform };

      try {
        // Compute fit transform to show entire tree
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        const bounds = getTreeBounds(layoutNodes);
        const treeWidth = bounds.maxX - bounds.minX;
        const treeHeight = bounds.maxY - bounds.minY;

        if (treeWidth <= 0 || treeHeight <= 0) {
          throw new Error("Invalid tree dimensions");
        }

        const padding = 40; // 20px margin on each side
        const availableWidth = containerWidth - padding;
        const availableHeight = containerHeight - padding;

        const scaleX = availableWidth / treeWidth;
        const scaleY = availableHeight / treeHeight;
        const fitScale = Math.min(scaleX, scaleY, 1); // Don't upscale

        const scaledWidth = treeWidth * fitScale;
        const scaledHeight = treeHeight * fitScale;

        const tx = (containerWidth - scaledWidth) / 2 - bounds.minX * fitScale;
        const ty = (containerHeight - scaledHeight) / 2 - bounds.minY * fitScale;

        // Apply fit transform
        setTransform({ x: tx, y: ty, scale: fitScale });

        // Wait for transform to apply and rendering to settle
        await new Promise(resolve => setTimeout(resolve, 250));

        // Get root person name for filename
        const rootNode = layoutNodes.find(n => n.parent === null) || layoutNodes[0];
        const rootPerson = rootNode?.person;
        const rootName = rootPerson
          ? [rootPerson.firstName, rootPerson.middleName, rootPerson.lastName].filter(Boolean).join(" ")
          : "family-tree";

        // Call export utility
        await exportFamilyTreeToPDF(containerRef as RefObject<HTMLElement>, {
          rootPersonName: rootName,
          scale: 3,
        });
      } finally {
        // Always restore original transform
        setTransform(originalTransform);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Pan handlers ──
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setTransform((p) => ({
      ...p,
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    }));
  };
  const onMouseUp = () => { isPanning.current = false; };

  // ── Touch handlers (mobile pan + pinch-zoom) ──
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single finger — start pan
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastPinchDist.current = null;
    } else if (e.touches.length === 2) {
      // Two fingers — start pinch
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault(); // prevent page scroll while interacting with tree
    if (e.touches.length === 1 && lastPinchDist.current === null) {
      // Pan
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setTransform((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
    } else if (e.touches.length === 2) {
      // Pinch-zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastPinchDist.current !== null) {
        const delta = dist - lastPinchDist.current;
        setTransform((p) => ({
          ...p,
          scale: Math.max(0.3, Math.min(3, p.scale + delta * 0.005)),
        }));
      }
      lastPinchDist.current = dist;
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) lastPinchDist.current = null;
    if (e.touches.length === 0) lastTouch.current = { x: 0, y: 0 };
  };

  // ── Styling helpers ──
  const cardClass = isDark
    ? "bg-gray-900/95 border border-gray-700/80"
    : "bg-gray-50 border border-gray-200";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const btnBase = isDark
    ? "bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700"
    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100";

  return (
    <div className={compact ? "max-h-[80vh] overflow-auto p-2" : "min-h-screen p-4 md:p-6"}>
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
              Family Tree
            </h1>
            {layoutNodes.length > 0 && (
              <p className={`text-sm mt-0.5 ${textMuted}`}>
                {layoutNodes.length} member{layoutNodes.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {!compact && (
            <div className={`flex items-center gap-1 rounded-xl p-1 ${isDark ? "bg-gray-800 border border-gray-700" : "bg-gray-100 border border-gray-200"}`}>
              <button
                onClick={() => zoom(-0.15)}
                disabled={transform.scale <= 0.3}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${btnBase}`}
                title="Zoom out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className={`px-2 text-sm font-mono tabular-nums ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {Math.round(transform.scale * 100)}%
              </span>
              <button
                onClick={() => zoom(0.15)}
                disabled={transform.scale >= 3}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${btnBase}`}
                title="Zoom in"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <div className={`w-px h-5 mx-1 ${isDark ? "bg-gray-700" : "bg-gray-300"}`} />
              <button
                onClick={resetView}
                className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors ${btnBase}`}
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* ── Search Bar ── */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-sm">
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Search Person
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <svg className={`w-4 h-4 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a name…"
                className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl border transition-colors outline-none
                  focus:ring-2 ${isDark ? "focus:ring-blue-500/40" : "focus:ring-blue-400/40"}
                  ${isDark
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  }`}
              />
              {searchQuery.length >= 2 && (
                <div className="absolute z-50 w-full mt-1">
                  <PersonSearchDropdown
                    onSelect={handleSelectPerson}
                    onClose={() => {}}
                    initialQuery={searchQuery}
                  />
                </div>
              )}
            </div>
          </div>
          {layoutNodes.length > 0 && (
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${btnBase} disabled:opacity-50`}
              title="Export to PDF"
            >
              {isExporting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span>{isExporting ? "Exporting..." : "Export PDF"}</span>
            </button>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className={`flex items-center gap-3 py-16 justify-center ${textMuted}`}>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-sm">Loading family tree…</span>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className={`p-4 rounded-xl border flex items-start gap-3
            ${isDark ? "bg-red-950/40 text-red-300 border-red-800/60" : "bg-red-50 text-red-700 border-red-200"}`}
          >
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* ── Tree Canvas ── */}
        {!loading && !error && layoutNodes.length > 0 && (
          <div
            ref={containerRef}
            className={`${cardClass} rounded-2xl overflow-hidden`}
            style={{ height: compact ? "60vh" : "75vh", cursor: isPanning.current ? "grabbing" : "grab", touchAction: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={(e) => {
              if (!e.ctrlKey) return;
              e.preventDefault();
              zoom(e.deltaY > 0 ? -0.1 : 0.1);
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transformOrigin: "0 0",
                position: "relative",
                width: "100%",
                height: "100%",
              }}
            >
              {/* ── SVG connector layer ── */}
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: "100%", height: "100%", overflow: "visible" }}
              >
                {/* Elbow paths */}
                {elbowPaths.map((d, i) => (
                  <path
                    key={`ep-${i}`}
                    d={d}
                    fill="none"
                    stroke={isDark ? "#374151" : "#d1d5db"}
                    strokeWidth="1.5"
                    strokeLinecap="square"
                  />
                ))}

                {/* Per-child relationship label pills */}
                {edgeLabels.map((lbl, i) => (
                  <g key={`lbl-${i}`}>
                    <rect
                      x={lbl.x - 18}
                      y={lbl.y - 8}
                      width={36}
                      height={16}
                      rx={8}
                      fill={isDark ? "#1f2937" : "#f9fafb"}
                      stroke={isDark ? "#374151" : "#e5e7eb"}
                      strokeWidth={1}
                    />
                    <text
                      x={lbl.x}
                      y={lbl.y + 4}
                      textAnchor="middle"
                      style={{
                        fill: isDark ? "#9ca3af" : "#6b7280",
                        fontSize: "9px",
                        fontWeight: 500,
                      }}
                    >
                      {lbl.label}
                    </text>
                  </g>
                ))}
              </svg>

              {/* ── Node layer ── */}
              {layoutNodes.map((node) => (
                <div
                  key={node.id}
                  data-node
                  className="absolute flex items-center"
                  style={{
                    left: node.x,
                    top: node.y,
                    transform: "translate(-50%, -50%)",
                    zIndex: node.id === selectedPersonId ? 20 : 5,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPersonId(node.id);
                  }}
                >
                  <PersonCard
                    person={node.person}
                    selected={node.id === selectedPersonId}
                    isDark={isDark}
                  />
                  {node.spouse && (
                    <>
                      <SpouseConnector isDark={isDark} />
                      <PersonCard
                        person={node.spouse.person}
                        selected={node.spouse.person.id === selectedPersonId}
                        isDark={isDark}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && !treeData && (
          <div className={`${cardClass} rounded-2xl flex flex-col items-center justify-center gap-4 py-20`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
              <svg className={`w-8 h-8 ${textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className={`font-medium ${isDark ? "text-gray-200" : "text-gray-700"}`}>No family tree loaded</p>
              <p className={`text-sm mt-1 ${textMuted}`}>Search for a person above to view their family tree.</p>
            </div>
          </div>
        )}

        {/* ── Legend ── */}
        {layoutNodes.length > 0 && (
          <div className={`mt-3 flex items-center gap-4 flex-wrap text-xs ${textMuted}`}>
            <div className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${isDark ? "bg-blue-500/30 border border-blue-400" : "bg-blue-50 border border-blue-300"}`} />
              <span>Male</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${isDark ? "bg-rose-500/30 border border-rose-400" : "bg-rose-50 border border-rose-300"}`} />
              <span>Female</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-rose-500 text-sm">♥</span>
              <span>Spouse</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`line-through ${isDark ? "text-gray-500" : "text-gray-400"}`}>Name</span>
              <span>Deceased</span>
            </div>
            <div className={`ml-auto text-[10px] ${textMuted}`}>
              Ctrl + scroll to zoom · Drag to pan
            </div>
          </div>
        )}
      </div>
    </div>
  );
}