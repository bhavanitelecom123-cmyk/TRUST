// import { NextRequest, NextResponse } from "next/server";
// import puppeteer from "puppeteer";
// import type { Browser } from "puppeteer";
// import { getFamilyTree } from "@/lib/family-tree-service";

// export const dynamic = "force-dynamic";
// export const maxDuration = 60;

// // ─── Helper: Generate standalone HTML for the tree ─────────────────────
// function generateTreeHTML(treeData: any): string {

//   return `
// <!DOCTYPE html>
// <html>
// <head>
//   <meta charset="utf-8">
//   <title>Family Tree PDF</title>
//   <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
//   <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
//   <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
//   <!-- Include Tailwind -->
//   <script src="https://cdn.tailwindcss.com"></script>
//   <script>
//     tailwind.config = {
//       darkMode: 'class',
//       theme: {
//         extend: {}
//       }
//     }
//   </script>
//   <style>
//     body { margin: 0; padding: 0; background: white; }
//     @media print {
//       * { overflow: visible !important; }
//       html, body { overflow: visible !important; background: white !important; }
//       [data-node] { position: absolute; }
//     }
//   </style>
// </head>
// <body>
//   <div id="root"></div>
//   <script type="text/babel">
//     const { useState, useEffect, useRef } = React;

//     // Person card component
//     function PersonCard({ person, isDark }) {
//       const fullName = [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
//       const isMale = person.gender === "Male";
//       const isDeceased = person.isDeceased;

//       const age = person.dateOfBirth ? (new Date().getFullYear() - new Date(person.dateOfBirth).getFullYear()) : null;

//       return (
//         <div style={{
//           position: 'absolute',
//           width: '160px',
//           height: '88px',
//           backgroundColor: isDark ? '#1f2937' : 'white',
//           border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
//           borderRadius: '0.75rem',
//           padding: '0.5rem',
//           display: 'flex',
//           alignItems: 'center',
//           gap: '0.75rem',
//           boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
//           overflow: 'hidden',
//         }}>
//           <div style={{
//             width: '2.25rem',
//             height: '2.25rem',
//             borderRadius: '9999px',
//             backgroundColor: isMale ? (isDark ? '#3b82f620' : '#dbeafe') : (isDark ? '#e11d4820' : '#fce7f3'),
//             border: isDark ? '1px solid #4b5563' : '1px solid #bfdbfe',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             flexShrink: 0,
//           }}>
//             <svg width="20" height="20" style={{ color: isMale ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#f472b6' : '#db2777') }} viewBox="0 0 24 24" fill="currentColor">
//               {isMale ? <path d="M12 2C9.24 2 7 4.24 7 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 10c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z" /> : <path d="M12 2C9.24 2 7 4.24 7 7s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 10c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z" />}
//             </svg>
//           </div>
//           <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
//             <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.875rem', fontWeight: 500, color: isDark ? '#fff' : '#111827' }}>
//               {fullName}
//             </span>
//             {person.education && (
//               <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
//                 {person.education}
//               </span>
//             )}
//             <span style={{ fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
//               {age && (person.dateOfBirth ? new Date().getFullYear() - new Date(person.dateOfBirth).getFullYear() : null) || 'N/A'}
//               {person.isDeceased && ' (†)'}
//             </span>
//           </div>
//         </div>
//       );
//     }

//     // Main tree component
//     function FamilyTree({ tree }) {
//       const [layoutNodes, setLayoutNodes] = React.useState([]);

//       useEffect(() => {
//         // Build layout from tree structure (same as FamilyTree.tsx)
//         function buildLayout() {
//           const nodes = [];
//           const nodeMap = new Map();
//           const CARD_WIDTH = 160;
//           const CARD_HEIGHT = 88;
//           const NODE_V_SPACING = 144;

//           // Recursive function to compute positions and collect nodes
//           function traverse(node, depth = 0) {
//             if (!node) return { x: 0, y: depth * NODE_V_SPACING };

//             // First traverse all children to determine parent's x position
//             let childLayouts = [];
//             if (node.children && node.children.length > 0) {
//               childLayouts = node.children.map(child => traverse(child, depth + 1));
//             }

//             // Also handle spouse of this node if exists
//             let spouseLayout = null;
//             if (node.spouse) {
//               spouseLayout = traverse({ person: node.spouse, children: [] }, depth);
//             }

//             // Determine x: if has children, center over them; else use provided x or 0
//             let x = 0;
//             if (childLayouts.length > 0) {
//               const xs = childLayouts.map(c => c.x);
//               x = (Math.min(...xs) + Math.max(...xs)) / 2;
//             } else if (node._x !== undefined) {
//               x = node._x;
//             }

//             // Add this node
//             const layoutNode = { id: node.person.id, x, y: depth * NODE_V_SPACING, person: node.person, spouse: node.spouse };
//             nodes.push(layoutNode);
//             nodeMap.set(node.person.id, layoutNode);

//             // Add spouse as separate node
//             if (node.spouse) {
//               const spouseX = x + CARD_WIDTH + 32; // spouse to the right
//               const spouseNode = { id: node.spouse.person.id + '-spouse', x: spouseX, y: depth * NODE_V_SPACING, person: node.spouse.person, spouse: null };
//               nodes.push(spouseNode);
//             }

//             return { x, y: depth * NODE_V_SPACING };
//           }

//           traverse(tree);

//           // Add parent references
//           nodes.forEach(n => {
//             // Find parent by checking tree structure
//             if (tree.parents) {
//               for (const p of tree.parents) {
//                 if (p.node.children) {
//                   const found = p.node.children.find(c => c.person.id === n.id);
//                   if (found) {
//                     n.parent = nodeMap.get(p.node.person.id) || null;
//                   }
//                 }
//               }
//             }
//           });

//           return nodes;
//         }

//         const nodes = buildLayout();
//         setLayoutNodes(nodes);

//         // Build elbow paths from parent-child relationships
//         const buildElbowPaths = (nodes) => {
//           const byParent = new Map();
//           nodes.forEach(n => {
//             if (!n.parent) return;
//             const pid = n.parent.id;
//             if (!byParent.has(pid)) byParent.set(pid, []);
//             byParent.get(pid).push(n);
//           });

//           const paths = [];
//           const CARD_WIDTH = 160;
//           const CARD_HEIGHT = 88;
//           const ELBOW_STUB = 20;

//           byParent.forEach((siblings, pid) => {
//             if (!siblings.length) return;
//             const parent = siblings[0].parent;
//             const px = parent.x + CARD_WIDTH / 2;
//             const py = parent.y + CARD_HEIGHT / 2;
//             const barY = py + ELBOW_STUB;

//             if (siblings.length === 1) {
//               const cy = siblings[0].y + CARD_HEIGHT / 2;
//               paths.push(\`M\${px},\${py} L\${siblings[0].x + CARD_WIDTH/2},\${cy}\`);
//             } else {
//               const sorted = [...siblings].sort((a,b) => a.x - b.x);
//               const leftX = sorted[0].x + CARD_WIDTH / 2;
//               const rightX = sorted[sorted.length-1].x + CARD_WIDTH / 2;
//               paths.push(\`M\${px},\${py} L\${px},\${barY}\`);
//               paths.push(\`M\${leftX},\${barY} L\${rightX},\${barY}\`);
//               sorted.forEach(child => {
//                 const cy = child.y + CARD_HEIGHT / 2;
//                 paths.push(\`M\${child.x + CARD_WIDTH/2},\${barY} L\${child.x + CARD_WIDTH/2},\${cy}\`);
//               });
//             }
//           });
//           return paths;
//         };

//         // Insert SVG
//         const container = document.getElementById('svg-container');
//         if (container) {
//           container.innerHTML = '';
//           const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
//           svg.style.position = 'absolute';
//           svg.style.top = '0';
//           svg.style.left = '0';
//           svg.style.width = '100%';
//           svg.style.height = '100%';
//           svg.style.overflow = 'visible';
//           svg.style.pointerEvents = 'none';

//           const paths = buildElbowPaths(layoutNodes);
//           paths.forEach(d => {
//             const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
//             path.setAttribute('d', d);
//             path.setAttribute('fill', 'none');
//             path.setAttribute('stroke', '#000000');
//             path.setAttribute('stroke-width', '2');
//             path.setAttribute('stroke-linecap', 'square');
//             svg.appendChild(path);
//           });

//           container.appendChild(svg);
//         }
//       }, [tree]);

//       if (!layoutNodes.length) {
//         return <div style={{ padding: '40px' }}>Loading tree...</div>;
//       }

//       // Calculate bounds
//       const CARD_WIDTH = 160;
//       const CARD_HEIGHT = 88;
//       let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
//       layoutNodes.forEach(n => {
//         minX = Math.min(minX, n.x);
//         minY = Math.min(minY, n.y);
//         maxX = Math.max(maxX, n.x + CARD_WIDTH);
//         maxY = Math.max(maxY, n.y + CARD_HEIGHT);
//       });

//       const offsetX = -minX + 40;
//       const offsetY = -minY + 40;
//       const width = maxX - minX + 80;
//       const height = maxY - minY + 80;

//       return (
//         <div style={{ width: width + 'px', height: height + 'px', position: 'relative', background: 'white' }}>
//           <div id="svg-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></div>
//           {layoutNodes.map(node => (
//             <div key={node.id} data-node style={{ position: 'absolute', left: (node.x + offsetX) + 'px', top: (node.y + offsetY) + 'px' }}>
//               <PersonCard person={node.person} isMale={node.person.gender === 'Male'} />
//               {node.spouse && (
//                 <div data-node style={{ position: 'absolute', left: (node.x + CARD_WIDTH + 32) + 'px', top: (node.y + offsetY) + 'px' }}>
//                   <PersonCard person={node.spouse.person} isMale={node.spouse.person.gender === 'Male'} />
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       );
//     }

//     // Render
//     const tree = ${JSON.stringify(treeData)};
//     ReactDOM.createRoot(document.getElementById('root')).render(
//       <FamilyTree tree={tree} />
//     );
//   </script>
// </body>
// </html>
//   `;
// }

// export async function POST(req: NextRequest) {
//   let browser: Browser | null = null;

//   try {
//     const { personId } = await req.json();

//     if (!personId) {
//       return NextResponse.json({ error: "Missing 'personId' parameter" }, { status: 400 });
//     }

//     // ── Fetch tree data using the existing service function (no auth needed) ──
//     console.log("Fetching tree for personId:", personId);
//     const tree = await getFamilyTree(personId, 2, 2);

//     if (!tree) {
//       return NextResponse.json({ error: "Person not found or no tree data" }, { status: 404 });
//     }

//     // Generate standalone HTML
//     const html = generateTreeHTML(tree);

//     browser = await puppeteer.launch({
//       headless: true,
//       args: [
//         "--no-sandbox",
//         "--disable-setuid-sandbox",
//         "--disable-dev-shm-usage",
//       ],
//     });

//     const page = await browser.newPage();
//     await page.setContent(html);
//     await page.setViewport({ width: 2400, height: 1600 });

//     // Wait for React to render
//     await page.waitForSelector("[data-node]", { timeout: 30000 });

//     // Extra time for SVG draw
//     await new Promise(r => setTimeout(r, 1000));

//     // Measure bounds
//     const bounds = await page.evaluate(() => {
//       const nodes = Array.from(document.querySelectorAll("[data-node]"));
//       if (!nodes.length) return null;
//       let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
//       nodes.forEach(el => {
//         const r = el.getBoundingClientRect();
//         if (r.left < minX) minX = r.left;
//         if (r.top < minY) minY = r.top;
//         if (r.right > maxX) maxX = r.right;
//         if (r.bottom > maxY) maxY = r.bottom;
//       });
//       return { minX, minY, maxX, maxY };
//     });

//     if (!bounds) {
//       throw new Error("Could not measure tree bounds.");
//     }

//     const PADDING = 48;
//     const contentWidth = Math.ceil(bounds.maxX - bounds.minX + PADDING * 2);
//     const contentHeight = Math.ceil(bounds.maxY - bounds.minY + PADDING * 2);

//     // A4 dimensions in pixels at 96 DPI (standard screen)
//     // A4 = 210mm × 297mm = 794px × 1123px
//     const A4_WIDTH = 794;
//     const A4_HEIGHT = 1123;

//     // Scale factor to fit tree on A4
//     const scaleX = A4_WIDTH / contentWidth;
//     const scaleY = A4_HEIGHT / contentHeight;
//     const scale = Math.min(scaleX, scaleY, 1); // Don't upscale, only downscale if needed

//     // Center the content on the page
//     const finalWidth = contentWidth * scale;
//     const finalHeight = contentHeight * scale;
//     const marginX = (A4_WIDTH - finalWidth) / 2;
//     const marginY = (A4_HEIGHT - finalHeight) / 2;

//     // Inject CSS to scale the entire tree container
//     await page.evaluate((scale, marginX, marginY, cw, ch) => {
//       const container = document.querySelector('div[style*="position: relative"]');
//       if (container) {
//         container.style.transform = `scale(${scale}) translate(${marginX/scale}px, ${marginY/scale}px)`;
//         container.style.transformOrigin = 'top left';
//         container.style.width = cw + 'px';
//         container.style.height = ch + 'px';
//       }
//     }, scale, marginX, marginY, contentWidth, contentHeight);

//     const pdfBuffer = await page.pdf({
//       width: `${A4_WIDTH}px`,
//       height: `${A4_HEIGHT}px`,
//       printBackground: true,
//       margin: { top: "0", right: "0", bottom: "0", left: "0" },
//     });

//     return new Response(pdfBuffer as any, {
//       status: 200,
//       headers: {
//         "Content-Type": "application/pdf",
//         "Content-Disposition": `attachment; filename="family-tree.pdf"`,
//       },
//     });

//   } catch (err: unknown) {
//     const message = err instanceof Error ? err.message : "PDF export failed";
//     console.error("PDF export error:", message);
//     return NextResponse.json({ error: message }, { status: 500 });
//   } finally {
//     if (browser) await browser.close();
//     await prisma.$disconnect();
//   }
// }







import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import type { Browser } from "puppeteer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let browser: Browser | null = null;

  try {
    const { personId } = await req.json();

    if (!personId) {
      return NextResponse.json(
        { error: "Missing 'personId' parameter" },
        { status: 400 }
      );
    }

    const cookieHeader = req.headers.get("cookie") ?? "";

    const origin =
      req.headers.get("origin") ??
      (() => {
        const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] ?? "http";
        const host = req.headers.get("host") ?? "localhost:3000";
        return `${proto}://${host}`;
      })();

    const printUrl = `${origin}/dashboard/family-tree?personId=${personId}&print=true`;

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    if (cookieHeader) {
      const urlObj = new URL(printUrl);
      const parsedCookies = cookieHeader
        .split(";")
        .map((s) => {
          const [name, ...rest] = s.trim().split("=");
          return { name: name.trim(), value: rest.join("=").trim() };
        })
        .filter((c) => c.name);

      if (parsedCookies.length > 0) {
        await page.setCookie(
          ...parsedCookies.map((c) => ({
            name: c.name,
            value: c.value,
            domain: urlObj.hostname,
            path: "/",
          }))
        );
      }
    }

    // ── Step 1: Render at a large natural size to measure the real tree bounds ──
    await page.setViewport({ width: 6000, height: 6000, deviceScaleFactor: 1 });
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 45000 });
    await page.waitForSelector("[data-node]", { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Measure the true pixel bounding box of all tree nodes
    const bounds = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("[data-node]"));
      if (!nodes.length) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.left   < minX) minX = r.left;
        if (r.top    < minY) minY = r.top;
        if (r.right  > maxX) maxX = r.right;
        if (r.bottom > maxY) maxY = r.bottom;
      });
      return { minX, minY, maxX, maxY };
    });

    if (!bounds) {
      throw new Error("Could not measure tree bounds — no [data-node] elements found.");
    }

    const PADDING = 40;
    const treeW = bounds.maxX - bounds.minX + PADDING * 2;
    const treeH = bounds.maxY - bounds.minY + PADDING * 2;

    // ── Step 2: Target page = A3 landscape at 96 DPI ──
    // A3 landscape: 420mm × 297mm at 96 DPI = 1587 × 1123 px
    const PAGE_W = 1587;
    const PAGE_H = 1123;

    // Scale so the tree fills the page edge-to-edge
    const scale = Math.min(PAGE_W / treeW, PAGE_H / treeH);

    // ── Step 3: Resize viewport to exactly the page size, reload, then zoom ──
    // This makes Puppeteer treat the page as exactly PAGE_W × PAGE_H,
    // so there is no overflow and no blank second page.
    await page.setViewport({ width: PAGE_W, height: PAGE_H, deviceScaleFactor: 1 });

    // Inject a <style> tag before the page fully re-renders so layout uses
    // the correct zoom from the start — avoids a flash of unscaled content.
    await page.evaluateOnNewDocument(
      (args: { scale: number; offsetX: number; offsetY: number }) => {
        // Runs before any script — inject a style block into <head>
        document.addEventListener("DOMContentLoaded", () => {
          const style = document.createElement("style");
          style.textContent = `
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: ${args.scale * 6000}px !important;
              height: ${args.scale * 6000}px !important;
              overflow: hidden !important;
              background: white !important;
            }
            body {
              zoom: ${args.scale};
              transform-origin: top left;
            }
          `;
          document.head.appendChild(style);
        });
      },
      { scale, offsetX: bounds.minX - PADDING, offsetY: bounds.minY - PADDING }
    );

    // Navigate again with the correct viewport and zoom pre-injected
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 45000 });
    await page.waitForSelector("[data-node]", { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    // Scroll to the top-left of the tree content so it starts at (0,0)
    await page.evaluate(
      (args: { offsetX: number; offsetY: number }) => {
        window.scrollTo(args.offsetX, args.offsetY);
      },
      { offsetX: Math.max(0, bounds.minX - PADDING), offsetY: Math.max(0, bounds.minY - PADDING) }
    );

    await new Promise((r) => setTimeout(r, 300));

    // ── Step 4: Print exactly one page, sized to the viewport ──
    const pdfBuffer = await page.pdf({
      width:  `${PAGE_W}px`,
      height: `${PAGE_H}px`,
      printBackground: true,
      pageRanges: "1",
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="family-tree.pdf"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PDF export failed";
    console.error("PDF export error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}