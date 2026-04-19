import * as pdfjs from "pdfjs-dist";

// Use CDN worker for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    textParts.push(pageText);
  }

  return textParts.join("\n\n");
}

/**
 * Find the page range for the "3Ds Vs Actual Site Photos" section.
 *
 * Strategy:
 * 1. Scan all pages for the section header "3Ds Vs Actual Site Photos" (or close variants)
 * 2. Once found, include all subsequent pages that contain area keywords
 *    (Reception, Machine, Pantry, Cabin, Conference, Work Station, etc.)
 *    until we hit a different major section or end of PDF
 * 3. Only return these specific pages - NOT the entire PDF
 */
async function findSitePhotoPageRange(pdf: pdfjs.PDFDocumentProxy): Promise<number[]> {
  const allPageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ").toLowerCase();
    allPageTexts.push(pageText);
  }

  // Step 1: Find the start of "3Ds Vs Actual Site Photos" section
  const sectionHeaders = [
    "3ds vs actual site photos",
    "3d vs actual site photos",
    "3ds vs actual site",
    "actual site photos",
  ];

  let sectionStartPage = -1;
  for (let i = 0; i < allPageTexts.length; i++) {
    const text = allPageTexts[i];
    if (sectionHeaders.some((h) => text.includes(h))) {
      sectionStartPage = i + 1; // 1-indexed
      break;
    }
  }

  if (sectionStartPage === -1) {
    // Fallback: look for pages with area keywords that also have image-like content
    // (these pages typically have very little text - just area names)
    const areaKeywords = [
      "reception area",
      "machine area",
      "pantry area",
      "cabin area",
      "conference",
      "work station",
      "workstation",
      "meeting room",
      "server room",
      "manager cabin",
      "director cabin",
      "lounge",
      "cafeteria",
    ];

    const candidatePages: number[] = [];
    for (let i = 0; i < allPageTexts.length; i++) {
      const text = allPageTexts[i];
      const hasAreaKeyword = areaKeywords.some((kw) => text.includes(kw));
      // Site photo pages have area names but relatively little other text
      if (hasAreaKeyword && text.length < 500) {
        candidatePages.push(i + 1);
      }
    }

    return candidatePages.length > 0 ? candidatePages : [];
  }

  // Step 2: From the section start, collect all pages until we hit a non-photo section
  const nonPhotoSectionHeaders = [
    "risk register",
    "selection schedule",
    "project timeline",
    "design revision",
    "floor plan",
    "summary",
    "annexure",
  ];

  const pages: number[] = [sectionStartPage];

  for (let i = sectionStartPage; i < allPageTexts.length; i++) {
    const text = allPageTexts[i];

    // Check if we've hit a new major section that's NOT the photo section
    const isNewSection = nonPhotoSectionHeaders.some((h) => text.includes(h));
    if (isNewSection) break;

    // Include this page if it's after the start
    if (i + 1 > sectionStartPage) {
      pages.push(i + 1);
    }
  }

  return pages;
}

/**
 * Extract ONLY site photo pages from the "3Ds Vs Actual Site Photos" section.
 * Returns page images as JPEG blobs for AI vision analysis.
 */
export async function extractSitePhotoPages(
  file: File,
  options?: { maxPages?: number; scale?: number; quality?: number }
): Promise<Blob[]> {
  const { maxPages = 12, scale = 1.5, quality = 0.7 } = options || {};
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let targetPages = await findSitePhotoPageRange(pdf);

  if (targetPages.length === 0) {
    console.warn("No '3Ds Vs Actual Site Photos' section found in PDF");
    return [];
  }

  // Cap to maxPages
  targetPages = targetPages.slice(0, maxPages);

  console.log(`Extracting ${targetPages.length} site photo pages: ${targetPages.join(", ")}`);

  const blobs: Blob[] = [];
  for (const pageNum of targetPages) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/jpeg", quality);
    });
    blobs.push(blob);
    canvas.remove();
  }

  return blobs;
}

/**
 * Get the page numbers of the site photo section (for display/debug purposes).
 */
export async function getSitePhotoPageNumbers(file: File): Promise<number[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  return findSitePhotoPageRange(pdf);
}
