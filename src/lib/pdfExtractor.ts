// ── Professional PDF Extraction Pipeline ─────────────────────────────────
// Improvements over previous version:
// 1. Tesseract with image preprocessing (contrast, grayscale, deskew hints)
// 2. Smart section detection — identifies clinical sections in raw OCR text
// 3. Returns structured sections not just raw text
// 4. Preserves table structure from medications/labs

import type { PDFDocumentProxy } from 'pdfjs-dist';

export type ExtractionMode = 'text' | 'ocr' | 'failed';

export interface ClinicalSections {
  raw: string;           // full OCR text
  header: string;        // hospital name, patient info table
  chiefComplaint: string;
  diagnosis: string;     // DIAGNOSIS: / FINAL DIAGNOSIS: rows
  comorbidities: string; // COMORBIDITIES / K/C/O / PAST HISTORY
  procedures: string;    // PROCEDURE: / OPERATIVE PROCEDURE:
  medications: string;   // full medications/treatment block
  vitals: string;        // VITALS: lines
  investigations: string;// INVESTIGATIONS table
  discharge: string;     // CONDITION AT DISCHARGE / DISCHARGE INSTRUCTIONS
  followUp: string;      // FOLLOW UP / REVIEW
}

export interface PDFExtractionResult {
  pages: string[];
  sections: ClinicalSections;
  mode: ExtractionMode;
  charCount: number;
  pageCount: number;
}

// ── Quality helpers ───────────────────────────────────────────────────────

function countUsableChars(text: string): number {
  return text.replace(/\s+/g, ' ').replace(/[^\x20-\x7E]/g, '').trim().length;
}

function hasClinicalContent(text: string): boolean {
  const markers = [
    'DISCHARGE', 'DIAGNOSIS', 'PATIENT', 'TREATMENT', 'MEDICATION',
    'HISTORY', 'EXAMINATION', 'ADMISSION', 'HOSPITAL', 'COMPLAINT',
    'C/O', 'K/C/O', 'H/O', 'DOA', 'DOD', 'INJ.', 'INJ ',
    'TAB.', 'TAB ', 'CAP.', 'SYP.', 'VITALS', 'PR:', 'BP:',
  ];
  const upper = text.toUpperCase();
  return markers.some(m => upper.includes(m.toUpperCase()));
}

// ── Smart section extractor ───────────────────────────────────────────────
// Parses raw OCR text into clinical sections using regex anchors
// This is the key improvement — instead of sending 4000 chars blindly,
// we identify exactly where each section starts and ends

export function extractClinicalSections(raw: string): ClinicalSections {
  const text = raw;
  const upper = text.toUpperCase();

  function sliceBetween(startPatterns: string[], endPatterns: string[], maxLen = 2000): string {
    let start = -1;
    for (const p of startPatterns) {
      const idx = upper.indexOf(p.toUpperCase());
      if (idx !== -1 && (start === -1 || idx < start)) start = idx;
    }
    if (start === -1) return '';

    let end = start + maxLen;
    for (const p of endPatterns) {
      const idx = upper.indexOf(p.toUpperCase(), start + 1);
      if (idx !== -1 && idx < end) end = idx;
    }

    return text.substring(start, end).trim();
  }

  // Extract header (first 800 chars — hospital name, patient table)
  const header = text.substring(0, Math.min(800, text.length));

  // Diagnosis section
  const diagnosis = sliceBetween(
    ['DIAGNOSIS:', 'FINAL DIAGNOSIS', 'DX:', 'DIAGNOSIS\n'],
    ['PROCEDURE', 'CHIEF COMPLAINT', 'BRIEF HISTORY', 'HISTORY OF'],
    500
  );

  // Comorbidities
  const comorbidities = sliceBetween(
    ['COMORBIDITIES', 'CO-MORBIDITIES', 'PAST HISTORY', 'K/C/O'],
    ['PROCEDURE', 'PHYSICAL EXAMINATION', 'SYSTEMIC EXAMINATION', 'BRIEF HISTORY'],
    600
  );

  // Chief complaint
  const chiefComplaint = sliceBetween(
    ['CHIEF COMPLAINT', 'BRIEF HISTORY', 'C/O '],
    ['PAST HISTORY', 'HISTORY OF PRESENT', 'DIAGNOSIS', 'PHYSICAL EXAMINATION'],
    400
  );

  // Procedures — CRITICAL: capture full operative note
  const procedures = sliceBetween(
    ['PROCEDURE:', 'OPERATIVE PROCEDURE', 'TREATMENT GIVEN', 'SURGERY:'],
    ['MEDICATIONS', 'TREATMENT:', 'COURSE IN HOSPITAL', 'DISCHARGE MEDICATION'],
    800
  );

  // Medications — MOST IMPORTANT: capture entire treatment list
  // Look for multiple possible section headers
  const medicationStarts = [
    'DISCHARGE MEDICATION', 'MEDICATIONS:', 'MEDICATIONS\n',
    'TREATMENT:', 'TREATMENT\n', 'DRUG PRESCRIBED', 'DRUGS:',
    'INJ. ', 'INJ.\n', 'TAB. METFORMIN', 'IV FLUIDS',
  ];
  const medicationEnds = [
    'CONDITION AT DISCHARGE', 'DISCHARGE INSTRUCTION',
    'FOLLOW UP', 'FOLLOW-UP', 'ADVICE', 'REVIEW AFTER',
    'VITALS AT DISCHARGE', 'END OF REPORT',
  ];

  // Get medications section — allow up to 3000 chars to capture all drugs
  const medications = sliceBetween(medicationStarts, medicationEnds, 3000);

  // Vitals — capture both admission and discharge vitals
  // Use broad patterns to catch all vitals mentions
  const vitals = sliceBetween(
    ['VITALS:', 'VITALS\n', 'VITALS AT', 'PHYSICAL EXAMINATION', 'PULSE:', 'PULSE RATE:', 'HEART RATE:'],
    ['SYSTEMIC EXAMINATION', 'INVESTIGATIONS', 'DIAGNOSIS', 'PROCEDURE', 'MEDICATIONS', 'TREATMENT'],
    600
  ) + '\n' + sliceBetween(
    ['CONDITION AT DISCHARGE', 'VITALS AT DISCHARGE', 'DISCHARGE VITALS'],
    ['FOLLOW UP', 'FOLLOW-UP', 'ADVICE', 'END OF REPORT'],
    400
  );

  // Investigations
  const investigations = sliceBetween(
    ['INVESTIGATIONS:', 'INVESTIGATIONS\n', 'LAB REPORTS'],
    ['DIAGNOSIS', 'PROCEDURE', 'TREATMENT', 'COURSE IN HOSPITAL'],
    600
  );

  // Discharge instructions
  const discharge = sliceBetween(
    ['CONDITION AT DISCHARGE', 'DISCHARGE INSTRUCTION', 'ADVICE AT DISCHARGE'],
    ['FOLLOW UP', 'FOLLOW-UP', 'REVIEW AFTER', 'END OF REPORT'],
    600
  );

  // Follow up
  const followUp = sliceBetween(
    ['FOLLOW UP', 'FOLLOW-UP', 'REVIEW AFTER', 'REVIEW IN'],
    ['END OF REPORT', 'SIGNATURE', 'DR.'],
    300
  );

  return {
    raw,
    header,
    chiefComplaint,
    diagnosis,
    comorbidities,
    procedures,
    medications,
    vitals,
    investigations,
    discharge,
    followUp,
  };
}

// ── PDF.js text layer ─────────────────────────────────────────────────────

async function getPDFDocument(file: File): Promise<PDFDocumentProxy> {
  const pdfjsLib = await import('pdfjs-dist');
  const workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  const arrayBuffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
}

async function extractTextLayer(file: File): Promise<{ pages: string[]; pageCount: number }> {
  const pdf = await getPDFDocument(file);
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    pages.push(text);
  }
  return { pages, pageCount: pdf.numPages };
}

// ── Canvas renderer ───────────────────────────────────────────────────────

async function renderPagesToCanvases(file: File): Promise<HTMLCanvasElement[]> {
  const pdf = await getPDFDocument(file);
  const canvases: HTMLCanvasElement[] = [];
  const maxPages = Math.min(pdf.numPages, 8);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    // Use 3x scale for better OCR on small printed text
    const viewport = page.getViewport({ scale: 3.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    // White background (important for OCR — transparent bg confuses Tesseract)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;

    // Post-process canvas for better OCR:
    // Increase contrast to make text sharper
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let j = 0; j < data.length; j += 4) {
      // Convert to grayscale
      const gray = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
      // Apply contrast enhancement: push dark pixels darker, light pixels lighter
      const contrasted = gray < 128 ? Math.max(0, gray - 30) : Math.min(255, gray + 30);
      data[j] = contrasted;
      data[j + 1] = contrasted;
      data[j + 2] = contrasted;
    }
    ctx.putImageData(imageData, 0, 0);

    canvases.push(canvas);
  }
  return canvases;
}

// ── Tesseract OCR ─────────────────────────────────────────────────────────

async function runOCR(
  canvases: HTMLCanvasElement[],
  onProgress: (msg: string) => void
): Promise<string[]> {
  const { createWorker } = await import('tesseract.js');

  onProgress('Loading OCR engine...');
  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress(`OCR recognizing: ${Math.round(m.progress * 100)}%`);
      } else if (m.status.includes('loading')) {
        onProgress(`OCR: ${m.status}...`);
      }
    },
  });

  // Configure Tesseract for medical document text
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,/:()-+%&;=_\'"[]# \n',
    preserve_interword_spaces: '1',
  });

  const results: string[] = [];
  for (let i = 0; i < canvases.length; i++) {
    onProgress(`OCR: Processing page ${i + 1} of ${canvases.length}...`);
    const { data } = await worker.recognize(canvases[i]);
    results.push(data.text);
    canvases[i].width = 0;
    canvases[i].height = 0;
  }

  await worker.terminate();
  return results;
}

// ── Main export ───────────────────────────────────────────────────────────

export async function extractPDFWithFallback(
  file: File,
  onProgress: (message: string) => void,
  docType: 'discharge' | 'diagnostic' = 'discharge'
): Promise<PDFExtractionResult> {
  onProgress('Loading PDF...');

  let textResult: { pages: string[]; pageCount: number };
  try {
    textResult = await extractTextLayer(file);
  } catch {
    textResult = { pages: [], pageCount: 0 };
  }

  const combinedText = textResult.pages.join('\n');
  const textCharCount = countUsableChars(combinedText);
  onProgress(`Text layer: ${textCharCount} chars from ${textResult.pageCount} page(s)`);

  if (textCharCount >= 150 && hasClinicalContent(combinedText)) {
    const sections = extractClinicalSections(combinedText);
    onProgress(`✓ Text layer OK — sending to AI...`);
    return { pages: textResult.pages, sections, mode: 'text', charCount: textCharCount, pageCount: textResult.pageCount };
  }

  onProgress('Scanned PDF — starting OCR (1-3 min)...');

  try {
    const canvases = await renderPagesToCanvases(file);
    onProgress(`Rendered ${canvases.length} pages. Starting OCR...`);
    const ocrPages = await runOCR(canvases, onProgress);
    const ocrText = ocrPages.join('\n');
    const ocrCharCount = countUsableChars(ocrText);
    onProgress(`OCR complete — ${ocrCharCount} chars`);

    if (ocrCharCount < 50) {
      return { pages: ocrPages, sections: extractClinicalSections(''), mode: 'failed', charCount: ocrCharCount, pageCount: canvases.length };
    }

    const sections = extractClinicalSections(ocrText);
    onProgress(`✓ OCR done — sections extracted, sending to AI...`);
    return { pages: ocrPages, sections, mode: 'ocr', charCount: ocrCharCount, pageCount: canvases.length };
  } catch {
    return { pages: [], sections: extractClinicalSections(''), mode: 'failed', charCount: 0, pageCount: 0 };
  }
}

export function combinePagesForLLM(pages: string[], maxChars = 6000): string {
  const combined = pages.filter(p => p.trim().length > 0).join('\n\n--- PAGE BREAK ---\n\n');
  return combined.length > maxChars ? combined.substring(0, maxChars) : combined;
}

export function assessTextQuality(text: string) {
  const charCount = countUsableChars(text);
  const isUsable = charCount >= 100 && hasClinicalContent(text);
  return { isUsable, charCount, reason: isUsable ? 'OK' : `Insufficient text (${charCount} chars)` };
}
