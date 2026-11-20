import { MAX_FILE_SIZE_BYTES } from './types';

/**
 * Validates the file extension, MIME type, size, and PDF magic bytes (%PDF-).
 */
export async function validatePdfFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // 1. Extension check
  const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
  if (!isPdfExt) {
    return { valid: false, error: 'Please choose a valid PDF document with a .pdf extension.' };
  }

  // 2. MIME type check
  const isPdfMime = file.type === 'application/pdf' || file.type === '';
  if (!isPdfMime) {
    return { valid: false, error: 'The selected file MIME type is not a valid PDF document.' };
  }

  // 3. Empty file check
  if (file.size === 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes).' };
  }

  // 4. File size limit
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File size (${sizeMB} MB) exceeds the 50 MB limit. Please select a smaller PDF.` };
  }

  // 5. PDF Header Magic Bytes check (%PDF-)
  try {
    const slice = file.slice(0, 5);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // %PDF- in ASCII is [0x25, 0x50, 0x44, 0x46, 0x2D]
    const isMagicValid =
      bytes.length === 5 &&
      bytes[0] === 0x25 && // %
      bytes[1] === 0x50 && // P
      bytes[2] === 0x44 && // D
      bytes[3] === 0x46 && // F
      bytes[4] === 0x2d;   // -

    if (!isMagicValid) {
      return { valid: false, error: 'This file does not have a valid PDF header signature (%PDF-).' };
    }
  } catch {
    return { valid: false, error: 'Failed to inspect document header signature.' };
  }

  return { valid: true };
}

/**
 * Sanitizes and bounds metadata strings (stripping control characters and limiting length).
 */
export function sanitizeMetadataString(input: unknown, maxLength: number = 250): string | undefined {
  if (typeof input !== 'string') return undefined;
  // Remove ASCII control characters (0-31 and 127) except standard space
  const cleaned = input.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
  if (!cleaned) return undefined;
  return cleaned.slice(0, maxLength);
}

/**
 * Sanitizes HTML strings for the text layer before sending to iframe or rendering.
 * Strips script, object, embed, iframe, form, and inline on* event handlers.
 */
export function sanitizeTextLayerHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
}
