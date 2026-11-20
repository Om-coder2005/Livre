import * as pdfjsLib from 'pdfjs-dist';
import { sanitizeTextLayerHtml } from '../upload/pdfSecurity';

export interface RenderedSpread {
  spreadIndex: number;
  spreadUrl: string;
  leftNum: number;
  rightNum: number | null;
  textLeftHtml: string;
  textRightHtml: string;
}

export type SpreadEvictCallback = (spreadIndex: number) => void;
export type PaperAppearanceMode = 'faithful' | 'printed';

/* ------------------------------------------------------------------ */
/*  Paper Surface & Document Analysis Utilities                       */
/* ------------------------------------------------------------------ */

let cachedPaperPattern: CanvasPattern | null = null;

function getSharedPaperPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (cachedPaperPattern) return cachedPaperPattern;
  if (typeof document === 'undefined') return null;

  try {
    const patCanvas = document.createElement('canvas');
    patCanvas.width = 160;
    patCanvas.height = 160;
    const pctx = patCanvas.getContext('2d');
    if (!pctx) return null;

    pctx.fillStyle = '#F5EEDF';
    pctx.fillRect(0, 0, 160, 160);

    const imgData = pctx.getImageData(0, 0, 160, 160);
    const d = imgData.data;

    // Linear Congruential Generator for reproducible, tactile laid paper micro-grain
    let seed = 12345;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let y = 0; y < 160; y++) {
      // Laid paper horizontal fiber grain variation (period ~ 4px)
      const laidVal = Math.sin((y / 4) * Math.PI * 2) * 1.5;
      for (let x = 0; x < 160; x++) {
        const idx = (y * 160 + x) * 4;
        const n = (nextRand() - 0.5) * 4.5 + laidVal;
        // Subtle organic warmth variation (-2.5 to +2.5 / 255)
        d[idx] = Math.min(255, Math.max(0, d[idx] + n));
        d[idx + 1] = Math.min(255, Math.max(0, d[idx + 1] + n * 0.95));
        d[idx + 2] = Math.min(255, Math.max(0, d[idx + 2] + n * 0.85));
      }
    }

    pctx.putImageData(imgData, 0, 0);
    cachedPaperPattern = ctx.createPattern(patCanvas, 'repeat');
    return cachedPaperPattern;
  } catch {
    return null;
  }
}

/**
 * Generates an authentic warm ivory paper ground (#F5EEDF) with subtle laid paper
 * micro-texture, gentle natural illumination curves, and restrained edge shading.
 */
function drawPaperSurface(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isTwoPage: boolean
): void {
  if (typeof document === 'undefined') return;

  // 1. Base Warm Ivory Fill
  ctx.fillStyle = '#F5EEDF';
  ctx.fillRect(0, 0, width, height);

  // 2. Micro-texture: laid paper fibers and tactile unbleached paper grain
  const pattern = getSharedPaperPattern(ctx);
  if (pattern) {
    ctx.save();
    ctx.globalAlpha = 0.50;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // 3. Gentle natural tonal variation across the physical page
  if (isTwoPage) {
    const halfW = width / 2;

    // Left page lighting: soft ambient highlight near page center, very subtle falloff to margins
    const leftGrad = ctx.createRadialGradient(
      halfW * 0.48,
      height * 0.48,
      halfW * 0.1,
      halfW * 0.48,
      height * 0.48,
      halfW * 0.75
    );
    leftGrad.addColorStop(0, 'rgba(255, 252, 245, 0.28)');
    leftGrad.addColorStop(0.65, 'rgba(255, 252, 245, 0.08)');
    leftGrad.addColorStop(1, 'rgba(58, 43, 26, 0.025)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, halfW, height);

    // Right page lighting: matching natural illumination curve
    const rightGrad = ctx.createRadialGradient(
      halfW + halfW * 0.52,
      height * 0.48,
      halfW * 0.1,
      halfW + halfW * 0.52,
      height * 0.48,
      halfW * 0.75
    );
    rightGrad.addColorStop(0, 'rgba(255, 252, 245, 0.28)');
    rightGrad.addColorStop(0.65, 'rgba(255, 252, 245, 0.08)');
    rightGrad.addColorStop(1, 'rgba(58, 43, 26, 0.025)');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(halfW, 0, halfW, height);
  } else {
    // Single page lighting
    const singleGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.48,
      width * 0.1,
      width * 0.5,
      height * 0.48,
      width * 0.75
    );
    singleGrad.addColorStop(0, 'rgba(255, 252, 245, 0.26)');
    singleGrad.addColorStop(0.7, 'rgba(255, 252, 245, 0.06)');
    singleGrad.addColorStop(1, 'rgba(58, 43, 26, 0.025)');
    ctx.fillStyle = singleGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // 4. Restrained outer perimeter edge vignette (delicate page thickness impression)
  const edgeTop = ctx.createLinearGradient(0, 0, 0, 8);
  edgeTop.addColorStop(0, 'rgba(55, 42, 28, 0.04)');
  edgeTop.addColorStop(1, 'rgba(55, 42, 28, 0)');
  ctx.fillStyle = edgeTop;
  ctx.fillRect(0, 0, width, 8);

  const edgeBottom = ctx.createLinearGradient(0, height, 0, height - 8);
  edgeBottom.addColorStop(0, 'rgba(55, 42, 28, 0.04)');
  edgeBottom.addColorStop(1, 'rgba(55, 42, 28, 0)');
  ctx.fillStyle = edgeBottom;
  ctx.fillRect(0, height - 8, width, 8);
}

interface PageContentAnalysis {
  isDarkBackground: boolean;
  isPhotoOrSolidHeavy: boolean;
  isScannedOrOffWhite: boolean;
  whiteRatio: number;
}

export function analyzePageContent(canvas: HTMLCanvasElement): PageContentAnalysis {
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h || typeof document === 'undefined') {
    return { isDarkBackground: false, isPhotoOrSolidHeavy: false, isScannedOrOffWhite: false, whiteRatio: 1 };
  }

  try {
    const thumb = document.createElement('canvas');
    thumb.width = 16;
    thumb.height = 16;
    const tctx = thumb.getContext('2d');
    if (!tctx) {
      return { isDarkBackground: false, isPhotoOrSolidHeavy: false, isScannedOrOffWhite: false, whiteRatio: 1 };
    }

    tctx.drawImage(canvas, 0, 0, 16, 16);
    const data = tctx.getImageData(0, 0, 16, 16).data;

    // Check corners: (0,0), (15,0), (0,15), (15,15)
    const cornerIndices = [0, 15 * 4, 15 * 16 * 4, (15 * 16 + 15) * 4];
    let cornerLumaSum = 0;
    for (const ci of cornerIndices) {
      const r = data[ci], g = data[ci + 1], b = data[ci + 2];
      cornerLumaSum += 0.299 * r + 0.587 * g + 0.114 * b;
    }
    const avgCornerLuma = cornerLumaSum / 4;

    let whiteCount = 0;
    let scannedOffWhiteCount = 0;
    const totalPixels = 16 * 16;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luma >= 242) {
        whiteCount++;
      } else if (luma >= 210 && luma < 242) {
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (sat < 16) {
          scannedOffWhiteCount++;
        }
      }
    }

    const whiteRatio = whiteCount / totalPixels;
    const isDarkBackground = avgCornerLuma < 165;
    const isPhotoOrSolidHeavy = whiteRatio < 0.35 && avgCornerLuma >= 165;
    const isScannedOrOffWhite = (scannedOffWhiteCount / totalPixels) > 0.30;

    return {
      isDarkBackground,
      isPhotoOrSolidHeavy,
      isScannedOrOffWhite,
      whiteRatio,
    };
  } catch {
    return { isDarkBackground: false, isPhotoOrSolidHeavy: false, isScannedOrOffWhite: false, whiteRatio: 1 };
  }
}

function cleanScannerBackground(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const minC = Math.min(r, g, b);
      const maxC = Math.max(r, g, b);
      // Lift low-saturation scanner paper background pixels (>222, sat < 14) to pure white
      if (minC >= 222 && (maxC - minC) < 14) {
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {}
}

export class SpreadRendererService {
  private pdfDoc: pdfjsLib.PDFDocumentProxy;
  private totalPages: number;
  private isMobile: boolean;
  private paperMode: PaperAppearanceMode;
  private cache = new Map<number, RenderedSpread>();
  private pendingRenders = new Map<number, Promise<RenderedSpread>>();
  private activeRenderTasks = new Map<number, pdfjsLib.RenderTask>();
  private readonly maxCacheSize: number;
  private onEvict?: SpreadEvictCallback;

  constructor(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    isMobile: boolean = false,
    maxCacheSize: number = 8,
    onEvict?: SpreadEvictCallback,
    paperMode: PaperAppearanceMode = 'faithful'
  ) {
    this.pdfDoc = pdfDoc;
    this.totalPages = pdfDoc.numPages;
    this.isMobile = isMobile;
    this.maxCacheSize = maxCacheSize;
    this.onEvict = onEvict;
    this.paperMode = paperMode;
  }

  public setPaperMode(mode: PaperAppearanceMode): boolean {
    if (this.paperMode !== mode) {
      this.paperMode = mode;
      this.clear();
      return true; // Mode changed, caller should refresh
    }
    return false;
  }

  public getPaperMode(): PaperAppearanceMode {
    return this.paperMode;
  }

  public setMobileMode(isMobile: boolean): boolean {
    if (this.isMobile !== isMobile) {
      this.isMobile = isMobile;
      this.clear();
      return true; // Mode changed, caller should refresh
    }
    return false;
  }

  public getTotalSpreads(): number {
    if (this.isMobile) {
      return this.totalPages;
    }
    return Math.ceil(this.totalPages / 2);
  }

  public getPageNumbersForSpread(spreadIndex: number): { left: number; right: number | null } {
    if (this.isMobile) {
      return { left: spreadIndex + 1, right: null };
    }
    const left = 2 * spreadIndex + 1;
    const right = left + 1 <= this.totalPages ? left + 1 : null;
    return { left, right };
  }

  public getSpreadIndexForPage(pageNum: number): number {
    if (this.isMobile) {
      return Math.max(0, Math.min(this.totalPages - 1, pageNum - 1));
    }
    const maxSpread = Math.max(0, Math.ceil(this.totalPages / 2) - 1);
    return Math.max(0, Math.min(maxSpread, Math.floor((pageNum - 1) / 2)));
  }

  public hasSpread(spreadIndex: number): boolean {
    return this.cache.has(spreadIndex);
  }

  public getCachedSpread(spreadIndex: number): RenderedSpread | undefined {
    const item = this.cache.get(spreadIndex);
    if (item) {
      this.cache.delete(spreadIndex);
      this.cache.set(spreadIndex, item);
    }
    return item;
  }

  public async getOrRenderSpread(spreadIndex: number): Promise<RenderedSpread> {
    const cached = this.getCachedSpread(spreadIndex);
    if (cached) return cached;

    // Deduplicate in-flight render promises for the same spread
    if (this.pendingRenders.has(spreadIndex)) {
      return this.pendingRenders.get(spreadIndex)!;
    }

    const renderPromise = this.renderSpread(spreadIndex)
      .then((spread) => {
        this.addToCache(spreadIndex, spread);
        this.pendingRenders.delete(spreadIndex);
        return spread;
      })
      .catch((err) => {
        this.pendingRenders.delete(spreadIndex);
        throw err;
      });

    this.pendingRenders.set(spreadIndex, renderPromise);
    return renderPromise;
  }

  public async prefetchSpreads(centerIndex: number, radius: number = 2): Promise<void> {
    const total = this.getTotalSpreads();
    const indicesToFetch: number[] = [];

    for (let r = 1; r <= radius; r++) {
      const nextIdx = centerIndex + r;
      if (nextIdx < total && !this.cache.has(nextIdx) && !this.pendingRenders.has(nextIdx)) {
        indicesToFetch.push(nextIdx);
      }

      const prevIdx = centerIndex - r;
      if (prevIdx >= 0 && !this.cache.has(prevIdx) && !this.pendingRenders.has(prevIdx)) {
        indicesToFetch.push(prevIdx);
      }
    }

    for (const idx of indicesToFetch) {
      try {
        await this.getOrRenderSpread(idx);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Prefetch failed for spread ${idx}:`, err);
        }
      }
    }
  }

  private addToCache(spreadIndex: number, spread: RenderedSpread) {
    if (this.cache.has(spreadIndex)) {
      this.cache.delete(spreadIndex);
    }
    this.cache.set(spreadIndex, spread);

    // Evict oldest entries if exceeding capacity
    while (this.cache.size > this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        if (this.onEvict) {
          this.onEvict(oldestKey);
        }
      } else {
        break;
      }
    }
  }

  private async renderSpread(spreadIndex: number): Promise<RenderedSpread> {
    const { left: leftNum, right: rightNum } = this.getPageNumbersForSpread(spreadIndex);

    // Standard high-resolution canvas matching Meng To 1760/1240 ratio
    const SPREAD_W = 1760;
    const SPREAD_H = 1240;

    const canvas = document.createElement('canvas');
    canvas.width = SPREAD_W;
    canvas.height = SPREAD_H;
    const ctx = canvas.getContext('2d')!;

    if (this.paperMode === 'printed') {
      // Natural warm ivory paper ground (#F5EEDF) with subtle laid paper fiber micro-texture
      drawPaperSurface(ctx, SPREAD_W, SPREAD_H, !this.isMobile);
    } else {
      // Pure white book ground (Mode A: Faithful PDF presentation)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, SPREAD_W, SPREAD_H);
    }

    let textLeftHtml = '';
    let textRightHtml = '';

    if (this.isMobile) {
      // Mobile Single Page layout
      const targetW = SPREAD_W * 0.94;
      const targetH = SPREAD_H * 0.94;
      const { textHtml } = await this.renderPageToSpread(
        leftNum,
        ctx,
        (SPREAD_W - targetW) / 2,
        (SPREAD_H - targetH) / 2,
        targetW,
        targetH,
        SPREAD_W,
        SPREAD_H
      );
      textLeftHtml = textHtml;
    } else {
      // Desktop Two-Page Spread layout — pages naturally fill each half with authentic book margins
      const halfW = SPREAD_W / 2; // 880px
      const targetW = halfW * 0.94; // 827px
      const targetH = SPREAD_H * 0.94; // 1165px

      // Render Left Page
      if (leftNum <= this.totalPages) {
        const leftX = (halfW - targetW) / 2;
        const leftY = (SPREAD_H - targetH) / 2;
        const { textHtml } = await this.renderPageToSpread(
          leftNum,
          ctx,
          leftX,
          leftY,
          targetW,
          targetH,
          SPREAD_W,
          SPREAD_H
        );
        textLeftHtml = textHtml;
      }

      // Render Central Spine / Gutter Shading (bounded within inner page margins)
      const spineGrad = ctx.createLinearGradient(halfW - 46, 0, halfW + 46, 0);
      spineGrad.addColorStop(0, 'rgba(51, 40, 32, 0)');
      spineGrad.addColorStop(0.35, 'rgba(51, 40, 32, 0.05)');
      spineGrad.addColorStop(0.48, 'rgba(51, 40, 32, 0.15)');
      spineGrad.addColorStop(0.5, 'rgba(35, 25, 16, 0.28)');
      spineGrad.addColorStop(0.52, 'rgba(51, 40, 32, 0.15)');
      spineGrad.addColorStop(0.65, 'rgba(51, 40, 32, 0.05)');
      spineGrad.addColorStop(1, 'rgba(51, 40, 32, 0)');
      ctx.fillStyle = spineGrad;
      ctx.fillRect(halfW - 46, 0, 92, SPREAD_H);

      // Fine antique bookbinding stitching line (delicate dashed thread)
      ctx.strokeStyle = this.paperMode === 'printed' ? 'rgba(78, 59, 39, 0.30)' : 'rgba(51, 40, 32, 0.20)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(halfW, 4);
      ctx.lineTo(halfW, SPREAD_H - 4);
      ctx.stroke();
      ctx.setLineDash([]);

      // Render Right Page (if exists)
      if (rightNum && rightNum <= this.totalPages) {
        const rightX = halfW + (halfW - targetW) / 2;
        const rightY = (SPREAD_H - targetH) / 2;
        const { textHtml } = await this.renderPageToSpread(
          rightNum,
          ctx,
          rightX,
          rightY,
          targetW,
          targetH,
          SPREAD_W,
          SPREAD_H
        );
        textRightHtml = textHtml;
      } else {
        // Blank page on right (odd page count)
        const rightX = halfW + (halfW - targetW) / 2;
        const rightY = (SPREAD_H - targetH) / 2;
        if (this.paperMode === 'faithful') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(rightX, rightY, targetW, targetH);
        }
        // In printed mode, blank page naturally remains the warm textured ivory ground
      }
    }

    // Convert spread canvas to persistent JPEG Data URL
    const spreadUrl = canvas.toDataURL('image/jpeg', 0.88);

    // Free canvas memory
    canvas.width = 0;
    canvas.height = 0;

    return {
      spreadIndex,
      spreadUrl,
      leftNum,
      rightNum,
      textLeftHtml,
      textRightHtml,
    };
  }

  private async renderPageToSpread(
    pageNum: number,
    targetCtx: CanvasRenderingContext2D,
    boxX: number,
    boxY: number,
    boxW: number,
    boxH: number,
    spreadW: number,
    spreadH: number
  ): Promise<{ textHtml: string }> {
    const page = await this.pdfDoc.getPage(pageNum);
    const unscaledViewport = page.getViewport({ scale: 1.0 });

    // Preserve original aspect ratio: fit within box
    const fitScale = Math.min(boxW / unscaledViewport.width, boxH / unscaledViewport.height);
    const renderW = Math.round(unscaledViewport.width * fitScale);
    const renderH = Math.round(unscaledViewport.height * fitScale);

    // Center within bounding box
    const destX = Math.round(boxX + (boxW - renderW) / 2);
    const destY = Math.round(boxY + (boxH - renderH) / 2);

    if (this.paperMode === 'faithful') {
      // Draw white paper base matching faithful PDF mode
      targetCtx.fillStyle = '#FFFFFF';
      targetCtx.fillRect(destX, destY, renderW, renderH);
    }

    // Retina sharpness factor bounded between 1.0x and 1.5x
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const renderScale = fitScale * Math.min(dpr, 1.5);
    const pageViewport = page.getViewport({ scale: renderScale });

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = Math.round(pageViewport.width);
    pageCanvas.height = Math.round(pageViewport.height);
    const pageCtx = pageCanvas.getContext('2d')!;

    const renderTask = page.render({
      canvasContext: pageCtx,
      viewport: pageViewport,
    });
    this.activeRenderTasks.set(pageNum, renderTask);

    try {
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException') {
        pageCanvas.width = 0;
        pageCanvas.height = 0;
        throw err;
      }
      console.warn(`Render error on page ${pageNum}:`, err);
    } finally {
      this.activeRenderTasks.delete(pageNum);
    }

    // Draw rendered PDF onto the spread canvas with document-aware compositing
    if (this.paperMode === 'printed') {
      const analysis = analyzePageContent(pageCanvas);

      // If scanned document with slight off-white scanner noise, lift highlights so paper merges seamlessly
      if (analysis.isScannedOrOffWhite) {
        cleanScannerBackground(pageCanvas);
      }

      if (analysis.isDarkBackground || analysis.isPhotoOrSolidHeavy) {
        // Conservative fallback: preserve 100% of photographic/dark color fidelity
        targetCtx.drawImage(pageCanvas, 0, 0, pageCanvas.width, pageCanvas.height, destX, destY, renderW, renderH);
      } else {
        // Natural printed paper mode: multiply ink directly into warm ivory paper fibers
        targetCtx.save();
        targetCtx.globalCompositeOperation = 'multiply';
        targetCtx.drawImage(pageCanvas, 0, 0, pageCanvas.width, pageCanvas.height, destX, destY, renderW, renderH);
        targetCtx.restore();
      }
    } else {
      // Mode A: Faithful PDF mode with standard source-over
      targetCtx.drawImage(pageCanvas, 0, 0, pageCanvas.width, pageCanvas.height, destX, destY, renderW, renderH);
      targetCtx.strokeStyle = 'rgba(59, 47, 47, 0.12)';
      targetCtx.lineWidth = 1;
      targetCtx.strokeRect(destX, destY, renderW, renderH);
    }

    // Immediately release offscreen page canvas memory
    pageCanvas.width = 0;
    pageCanvas.height = 0;

    // Subtle edge border around page
    targetCtx.strokeStyle = 'rgba(59, 47, 47, 0.12)';
    targetCtx.lineWidth = 1;
    targetCtx.strokeRect(destX, destY, renderW, renderH);

    // Generate Text Layer HTML aligned with this page
    let textHtml = '';
    try {
      const textPromise = page.getTextContent();
      const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 700));
      const textContent: any = await Promise.race([textPromise, timeoutPromise]);

      if (textContent) {
        const textContainer = document.createElement('div');
        textContainer.className = 'textLayer';
        textContainer.style.width = `${renderW}px`;
        textContainer.style.height = `${renderH}px`;
        textContainer.style.position = 'relative';

        const displayViewport = page.getViewport({ scale: fitScale });
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textContainer,
          viewport: displayViewport,
        });
        await textLayer.render();

        const pctLeft = ((destX / spreadW) * 100).toFixed(3);
        const pctTop = ((destY / spreadH) * 100).toFixed(3);
        const pctWidth = ((renderW / spreadW) * 100).toFixed(3);
        const pctHeight = ((renderH / spreadH) * 100).toFixed(3);

        const sanitizedInner = sanitizeTextLayerHtml(textContainer.innerHTML);
        textHtml = `<div style="position:absolute;left:${pctLeft}%;top:${pctTop}%;width:${pctWidth}%;height:${pctHeight}%;overflow:hidden;pointer-events:auto;">${sanitizedInner}</div>`;
      }
    } catch (e) {
      console.warn(`Text layer generation failed for page ${pageNum}:`, e);
    }

    return { textHtml };
  }

  public clear(): void {
    // Cancel any active page render tasks
    for (const task of this.activeRenderTasks.values()) {
      try {
        task.cancel();
      } catch {}
    }
    this.activeRenderTasks.clear();
    this.cache.clear();
    this.pendingRenders.clear();
  }

  public destroy(): void {
    this.clear();
  }
}
