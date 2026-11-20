import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { SpreadRendererService } from './spreadRenderer';

interface MengToBookRendererProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  zoom: number;
  loupeEnabled?: boolean;
  paperMode?: 'faithful' | 'printed';
}

export const MengToBookRenderer: React.FC<MengToBookRendererProps> = ({
  pdfDoc,
  currentPage,
  onPageChange,
  zoom,
  loupeEnabled = true,
  paperMode = 'faithful',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const spreadServiceRef = useRef<SpreadRendererService | null>(null);
  const currentSpreadRef = useRef<number>(0);
  const isMobileRef = useRef<boolean>(window.innerWidth < 768);

  // Send message safely to iframe
  const postToIframe = useCallback((message: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, window.location.origin);
    }
  }, []);

  // Eviction callback passed to SpreadRendererService
  const handleSpreadEvicted = useCallback((evictedIndex: number) => {
    postToIframe({ type: 'LIVRE_EVICT_SPREAD', spreadIndex: evictedIndex });
  }, [postToIframe]);

  // Send a rendered spread to the iframe
  const sendSpreadToIframe = useCallback(async (spreadIndex: number) => {
    const service = spreadServiceRef.current;
    if (!service) return;

    try {
      const spread = await service.getOrRenderSpread(spreadIndex);
      postToIframe({
        type: 'LIVRE_SET_SPREAD',
        spreadIndex: spread.spreadIndex,
        spreadUrl: spread.spreadUrl,
        leftNum: spread.leftNum,
        rightNum: spread.rightNum,
        textLeftHtml: spread.textLeftHtml,
        textRightHtml: spread.textRightHtml,
      });
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn(`Failed to render and send spread ${spreadIndex}:`, err);
      }
    }
  }, [postToIframe]);

  // Initialize SpreadRendererService and handle window resize
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    isMobileRef.current = isMobile;
    const service = new SpreadRendererService(pdfDoc, isMobile, 8, handleSpreadEvicted, paperMode);
    spreadServiceRef.current = service;

    let resizeTimer: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newIsMobile = window.innerWidth < 768;
        if (spreadServiceRef.current && spreadServiceRef.current.setMobileMode(newIsMobile)) {
          isMobileRef.current = newIsMobile;
          const newSpread = spreadServiceRef.current.getSpreadIndexForPage(currentPage);
          currentSpreadRef.current = newSpread;

          postToIframe({
            type: 'LIVRE_INIT',
            totalPages: pdfDoc.numPages,
            totalSpreads: spreadServiceRef.current.getTotalSpreads(),
            initialSpread: newSpread,
            isMobile: newIsMobile,
          });

          sendSpreadToIframe(newSpread);
        }
      }, 200);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      service.destroy();
      spreadServiceRef.current = null;
    };
  }, [pdfDoc, handleSpreadEvicted, postToIframe, sendSpreadToIframe, currentPage, paperMode]);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (!data || typeof data.type !== 'string' || !data.type.startsWith('LIVRE_')) return;

      const service = spreadServiceRef.current;
      if (!service) return;

      switch (data.type) {
        case 'LIVRE_READY': {
          setIframeReady(true);
          const initialSpread = service.getSpreadIndexForPage(currentPage);
          currentSpreadRef.current = initialSpread;

          postToIframe({
            type: 'LIVRE_INIT',
            totalPages: pdfDoc.numPages,
            totalSpreads: service.getTotalSpreads(),
            initialSpread,
            isMobile: isMobileRef.current,
          });

          postToIframe({
            type: 'LIVRE_SET_PAPER_MODE',
            mode: paperMode,
          });

          await sendSpreadToIframe(initialSpread);

          // Deferred prefetch so initial spread displays immediately without CPU contention
          setTimeout(() => {
            service.prefetchSpreads(initialSpread, 2).then(() => {
              const total = service.getTotalSpreads();
              for (let i = Math.max(0, initialSpread - 2); i <= Math.min(total - 1, initialSpread + 2); i++) {
                if (i !== initialSpread && service.hasSpread(i)) {
                  sendSpreadToIframe(i);
                }
              }
            });
          }, 300);
          break;
        }

        case 'LIVRE_PAGE_CHANGED': {
          const spreadIdx = data.currentSpread;
          currentSpreadRef.current = spreadIdx;
          const newPage = data.currentPageLeft;
          if (newPage && newPage !== currentPage) {
            onPageChange(newPage);
          }

          service.prefetchSpreads(spreadIdx, 2).then(() => {
            const total = service.getTotalSpreads();
            for (let i = Math.max(0, spreadIdx - 2); i <= Math.min(total - 1, spreadIdx + 2); i++) {
              if (service.hasSpread(i)) {
                sendSpreadToIframe(i);
              }
            }
          });
          break;
        }

        case 'LIVRE_TURN_START': {
          const toSpread = data.toSpread;
          if (typeof toSpread === 'number') {
            sendSpreadToIframe(toSpread);
          }
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentPage, onPageChange, pdfDoc.numPages, postToIframe, sendSpreadToIframe]);

  // Sync paperMode changes with service and iframe
  useEffect(() => {
    if (!iframeReady || !spreadServiceRef.current) return;
    const changed = spreadServiceRef.current.setPaperMode(paperMode);
    if (changed) {
      postToIframe({ type: 'LIVRE_SET_PAPER_MODE', mode: paperMode });
      sendSpreadToIframe(currentSpreadRef.current);
      spreadServiceRef.current.prefetchSpreads(currentSpreadRef.current, 2).then(() => {
        const total = spreadServiceRef.current?.getTotalSpreads() || 0;
        for (let i = Math.max(0, currentSpreadRef.current - 2); i <= Math.min(total - 1, currentSpreadRef.current + 2); i++) {
          if (spreadServiceRef.current?.hasSpread(i)) {
            sendSpreadToIframe(i);
          }
        }
      });
    }
  }, [paperMode, iframeReady, postToIframe, sendSpreadToIframe]);

  // Sync zoom changes with iframe
  useEffect(() => {
    if (!iframeReady) return;
    postToIframe({ type: 'LIVRE_SET_ZOOM', zoom });
  }, [zoom, iframeReady, postToIframe]);

  // Sync loupe toggle with iframe
  useEffect(() => {
    if (!iframeReady) return;
    postToIframe({ type: 'LIVRE_TOGGLE_LOUPE', enabled: loupeEnabled });
  }, [loupeEnabled, iframeReady, postToIframe]);

  // Sync navigation when currentPage changes from parent
  useEffect(() => {
    if (!iframeReady || !spreadServiceRef.current) return;
    const targetSpread = spreadServiceRef.current.getSpreadIndexForPage(currentPage);
    if (targetSpread !== currentSpreadRef.current) {
      currentSpreadRef.current = targetSpread;
      sendSpreadToIframe(targetSpread).then(() => {
        postToIframe({ type: 'LIVRE_NAVIGATE', targetSpread });
      });
    }
  }, [currentPage, iframeReady, postToIframe, sendSpreadToIframe]);

  return (
    <div className="mengto-book-host" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <iframe
        ref={iframeRef}
        src="/landing-pages/livre-book-renderer.html"
        title="Livre Interactive Book"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
          backgroundColor: 'transparent',
        }}
      />
    </div>
  );
};
