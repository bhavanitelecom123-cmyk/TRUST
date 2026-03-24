"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { RefObject } from "react";

export interface ExportOptions {
  rootPersonName?: string;
  filename?: string;
  pageSize?: "a4" | "letter";
  margin?: number;
  scale?: number;
}

/**
 * Export a family tree container to PDF.
 *
 * Strategy:
 * 1. Find the inner transformed div (the panning/zooming layer).
 * 2. Temporarily strip its transform so all nodes sit at their natural coords.
 * 3. Temporarily remove overflow:hidden from the outer container so html2canvas
 *    can see the full content — and force the container to a size that fits everything.
 * 4. Capture with html2canvas.
 * 5. Restore everything.
 */
export async function exportFamilyTreeToPDF(
  containerRef: RefObject<HTMLElement>,
  options: ExportOptions = {}
): Promise<void> {
  const {
    rootPersonName = "family-tree",
    filename,
    pageSize = "a4",
    margin = 10,
    scale = 2,
  } = options;

  if (!containerRef.current) throw new Error("Container element not found");
  if (typeof window === "undefined") throw new Error("PDF export requires a browser");

  const container = containerRef.current;

  // ── 1. Find the inner transform layer ──────────────────────────────────────
  const innerDiv = container.querySelector<HTMLElement>('[style*="transform"]');
  if (!innerDiv) throw new Error("Tree transform layer not found");

  // ── 2. Measure actual content bounds ────────────────────────────────────────
  // Walk all [data-node] elements to find how wide/tall the real content is
  const nodeEls = container.querySelectorAll<HTMLElement>("[data-node]");
  if (nodeEls.length === 0) throw new Error("No tree nodes found");

  // Parse current transform so we can offset positions
  const transformMatch = innerDiv.style.transform.match(
    /translate\(([^,]+)px,\s*([^)]+)px\)\s*scale\(([^)]+)\)/
  );
  const tx = transformMatch ? parseFloat(transformMatch[1]) : 0;
  const ty = transformMatch ? parseFloat(transformMatch[2]) : 0;
  const sc = transformMatch ? parseFloat(transformMatch[3]) : 1;

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  nodeEls.forEach((el) => {
    const r = el.getBoundingClientRect();
    const contR = container.getBoundingClientRect();
    // Position relative to container in screen px, then unscale back to content px
    const elLeft = (r.left - contR.left - tx) / sc;
    const elTop = (r.top - contR.top - ty) / sc;
    const elRight = (r.right - contR.left - tx) / sc;
    const elBottom = (r.bottom - contR.top - ty) / sc;
    if (elLeft < minX) minX = elLeft;
    if (elTop < minY) minY = elTop;
    if (elRight > maxX) maxX = elRight;
    if (elBottom > maxY) maxY = elBottom;
  });

  const PAD = 40;    // px padding around content
  const contentW = (maxX - minX) + PAD * 2;
  const contentH = (maxY - minY) + PAD * 2;

  // ── 3. Snapshot / override styles ───────────────────────────────────────────
  const prevContainerOverflow = container.style.overflow;
  const prevContainerW = container.style.width;
  const prevContainerH = container.style.height;
  const prevInnerTransform = innerDiv.style.transform;

  // Remove clip from container and size it to the full content
  container.style.overflow = "visible";
  container.style.width = `${contentW}px`;
  container.style.height = `${contentH}px`;

  // Reset inner transform: content starts at (PAD - minX, PAD - minY)
  innerDiv.style.transform = `translate(${PAD - minX}px, ${PAD - minY}px) scale(1)`;

  // Wait for layout/paint
  await new Promise((r) => setTimeout(r, 120));

  try {
    // ── 4. Capture ────────────────────────────────────────────────────────────
    const bgColor =
      getComputedStyle(container).backgroundColor || "#ffffff";

    const canvas = await html2canvas(container, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: bgColor,
      logging: false,
      // Tell html2canvas the full content size
      windowWidth: contentW,
      windowHeight: contentH,
      width: contentW,
      height: contentH,
      x: 0,
      y: 0,
    });

    // ── 5. Build PDF ──────────────────────────────────────────────────────────
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "mm",
      format: pageSize,
    });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgW = pageW - 2 * margin;
    const imgH = (canvas.height * imgW) / canvas.width;

    const yOff = Math.max(margin, (pageH - imgH) / 2);

    // If taller than page, scale down to fit height instead
    if (imgH > pageH - 2 * margin) {
      const fittedH = pageH - 2 * margin;
      const fittedW = (canvas.width * fittedH) / canvas.height;
      const xOff = Math.max(margin, (pageW - fittedW) / 2);
      pdf.addImage(imgData, "PNG", xOff, margin, fittedW, fittedH);
    } else {
      pdf.addImage(imgData, "PNG", margin, yOff, imgW, imgH);
    }

    const date = new Date().toISOString().split("T")[0];
    const safeName = rootPersonName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    pdf.save(`${filename || `${safeName}-${date}`}.pdf`);
  } finally {
    // ── Restore ───────────────────────────────────────────────────────────────
    container.style.overflow = prevContainerOverflow;
    container.style.width = prevContainerW;
    container.style.height = prevContainerH;
    innerDiv.style.transform = prevInnerTransform;
  }
}