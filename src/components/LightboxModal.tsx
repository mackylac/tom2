import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { GalleryImage } from '../types/portfolio';

interface LightboxModalProps {
  images: GalleryImage[];
  activeIndex: number | null;
  projectTitle: string;
  exhibitNumber: string;
  onClose: () => void;
  onChangeIndex: (newIndex: number) => void;
}

const ZOOM_STEPS = [1, 1.5, 2, 2.5];

export const LightboxModal: React.FC<LightboxModalProps> = ({
  images,
  activeIndex,
  projectTitle,
  exhibitNumber,
  onClose,
  onChangeIndex,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOrigin, setDragOrigin] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Track last touch tap timestamp for mobile Double-Tap Zoom (300ms window)
  const lastTouchTapRef = useRef<number>(0);

  const isOpen =
    activeIndex !== null && activeIndex >= 0 && activeIndex < images.length;
  const currentImage = isOpen ? images[activeIndex] : null;

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handlePrev = useCallback(() => {
    if (activeIndex === null || images.length === 0) return;
    resetZoom();
    onChangeIndex((activeIndex - 1 + images.length) % images.length);
  }, [activeIndex, images.length, onChangeIndex, resetZoom]);

  const handleNext = useCallback(() => {
    if (activeIndex === null || images.length === 0) return;
    resetZoom();
    onChangeIndex((activeIndex + 1) % images.length);
  }, [activeIndex, images.length, onChangeIndex, resetZoom]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const next = ZOOM_STEPS.find((step) => step > prev);
      return next ?? 2.5;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const reversed = [...ZOOM_STEPS].reverse();
      const next = reversed.find((step) => step < prev);
      if (!next || next <= 1) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      return next;
    });
  }, []);

  // Desktop Mouse Wheel Zoom (1x - 2.5x)
  const handleWheelZoom = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else if (e.deltaY > 0) {
        handleZoomOut();
      }
    },
    [handleZoomIn, handleZoomOut]
  );

  // Mobile Touch Double-Tap Zoom (1x <-> 2x)
  const handleTouchDoubleTap = useCallback(() => {
    const now = Date.now();
    const delta = now - lastTouchTapRef.current;
    if (delta > 0 && delta < 300) {
      if (zoom === 1) {
        setZoom(2);
      } else {
        resetZoom();
      }
      lastTouchTapRef.current = 0;
    } else {
      lastTouchTapRef.current = now;
    }
  }, [zoom, resetZoom]);

  // Mobile Horizontal Swipe Gesture (Swipe Left / Right when zoom === 1)
  const handleSwipeDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (zoom > 1) return;
      const swipeOffsetThreshold = 55;
      const swipeVelocityThreshold = 350;

      if (
        info.offset.x < -swipeOffsetThreshold ||
        info.velocity.x < -swipeVelocityThreshold
      ) {
        handleNext();
      } else if (
        info.offset.x > swipeOffsetThreshold ||
        info.velocity.x > swipeVelocityThreshold
      ) {
        handlePrev();
      }
    },
    [zoom, handleNext, handlePrev]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    onClose,
    handlePrev,
    handleNext,
    handleZoomIn,
    handleZoomOut,
    resetZoom,
  ]);

  if (!isOpen || !currentImage || activeIndex === null) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Trình soi chi tiết ảnh — ${projectTitle}`}
        className="pt-safe pb-safe fixed inset-0 z-50 flex flex-col justify-between bg-[#090909]/96 text-[#F3F1EC] backdrop-blur-md select-none"
      >
        {/* Top Control Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-8 sm:py-3.5">
          <div className="flex items-center gap-3 font-mono-plaque text-[11px] tracking-[0.16em] uppercase sm:text-xs">
            <span className="text-[#C8A97E]">
              EXHIBIT № {exhibitNumber} · PLATE{' '}
              {String(activeIndex + 1).padStart(2, '0')} /{' '}
              {String(images.length).padStart(2, '0')}
            </span>
            <span className="hidden text-white/30 sm:inline">|</span>
            <span className="hidden text-white/80 sm:inline">{projectTitle}</span>
          </div>

          {/* Zoom Controls (1x - 2.5x) & Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-white/15 bg-white/5">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                aria-label="Thu nhỏ"
                className="flex h-9 w-9 items-center justify-center text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <ZoomOut className="h-4 w-4" strokeWidth={1.5} />
              </button>

              {ZOOM_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => {
                    setZoom(step);
                    if (step === 1) setPan({ x: 0, y: 0 });
                  }}
                  className={`h-9 px-2 font-mono-plaque text-[10px] tracking-wider transition-colors sm:px-2.5 sm:text-[11px] ${
                    zoom === step
                      ? 'bg-[#C8A97E] font-medium text-[#0E0E0E]'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {step}x
                </button>
              ))}

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 2.5}
                aria-label="Phóng đại"
                className="flex h-9 w-9 items-center justify-center text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <ZoomIn className="h-4 w-4" strokeWidth={1.5} />
              </button>

              {zoom > 1 && (
                <button
                  type="button"
                  onClick={resetZoom}
                  title="Đặt lại tỷ lệ 1x"
                  aria-label="Đặt lại tỷ lệ 1x"
                  className="flex h-9 w-9 items-center justify-center border-l border-white/15 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng trình xem ảnh (Esc)"
              className="flex h-9 items-center gap-1.5 border border-white/20 bg-white/5 px-3 font-mono-plaque text-[11px] tracking-[0.16em] text-white uppercase transition-colors hover:border-[#C8A97E] hover:bg-[#C8A97E] hover:text-[#0E0E0E]"
            >
              <span>Đóng</span>
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Center High-Res Inspection Stage (Supports Wheel Zoom, Swipe Left/Right & Double-Tap Zoom) */}
        <div
          onWheel={handleWheelZoom}
          className={`relative flex flex-1 items-center justify-center overflow-hidden px-3 py-4 sm:px-16 sm:py-6 ${
            zoom > 1
              ? isDragging
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : 'cursor-zoom-in'
          }`}
          onMouseDown={(e) => {
            if (zoom <= 1) return;
            setIsDragging(true);
            setDragOrigin({ x: e.clientX - pan.x, y: e.clientY - pan.y });
          }}
          onMouseMove={(e) => {
            if (!isDragging || zoom <= 1) return;
            setPan({
              x: e.clientX - dragOrigin.x,
              y: e.clientY - dragOrigin.y,
            });
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onDoubleClick={() => {
            if (zoom === 1) {
              setZoom(2);
            } else {
              resetZoom();
            }
          }}
          onTouchEnd={handleTouchDoubleTap}
        >
          {/* Previous Plate Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Ảnh trước (Phím mũi tên trái)"
            className="absolute left-2.5 z-20 flex h-11 w-11 items-center justify-center border border-white/15 bg-black/70 text-white transition-all hover:border-[#C8A97E] hover:bg-[#C8A97E] hover:text-[#0E0E0E] active:scale-95 sm:left-6 sm:h-12 sm:w-12"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>

          {/* Zoomable & Swipeable Artwork Plate */}
          <motion.img
            key={currentImage.id}
            src={currentImage.url}
            alt={currentImage.caption}
            drag={zoom === 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.22}
            onDragEnd={handleSwipeDragEnd}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{
              opacity: 1,
              scale: zoom,
              x: pan.x,
              y: pan.y,
            }}
            transition={{
              scale: { type: 'spring', stiffness: 220, damping: 26 },
              opacity: { duration: 0.22 },
              x: { duration: isDragging ? 0 : 0.2 },
              y: { duration: isDragging ? 0 : 0.2 },
            }}
            draggable={false}
            className="max-h-[70dvh] max-w-[90vw] border border-white/15 object-contain shadow-2xl sm:max-h-[72dvh] sm:max-w-[86vw]"
          />

          {/* Next Plate Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Ảnh tiếp theo (Phím mũi tên phải)"
            className="absolute right-2.5 z-20 flex h-11 w-11 items-center justify-center border border-white/15 bg-black/70 text-white transition-all hover:border-[#C8A97E] hover:bg-[#C8A97E] hover:text-[#0E0E0E] active:scale-95 sm:right-6 sm:h-12 sm:w-12"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Bottom Caption & Thumbnail Strip */}
        <footer className="border-t border-white/10 bg-[#0B0B0B] px-4 py-3.5 sm:px-8 sm:py-4">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 md:flex-row md:items-center md:gap-4">
            <div className="space-y-1">
              <p className="font-sans-gallery text-xs leading-relaxed text-white/90 sm:text-sm">
                {currentImage.caption}
              </p>
              <p className="font-mono-plaque text-[9.5px] tracking-[0.16em] text-white/45 uppercase sm:text-[10px]">
                Desktop: Phím ← → hoặc Cuộn chuột để Zoom (1x–2.5x) · Mobile: Vuốt ngang chuyển ảnh hoặc Chạm đúp để Zoom 2x
              </p>
            </div>

            {/* Plate Mini Index */}
            <div className="no-scrollbar flex w-full items-center gap-1.5 overflow-x-auto pb-1 md:w-auto">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => {
                    resetZoom();
                    onChangeIndex(idx);
                  }}
                  aria-label={`Chọn ảnh số ${idx + 1}`}
                  className={`relative h-11 w-14 shrink-0 overflow-hidden border transition-all ${
                    idx === activeIndex
                      ? 'border-[#C8A97E] ring-1 ring-[#C8A97E]'
                      : 'border-white/15 opacity-45 hover:opacity-85'
                  }`}
                >
                  <img
                    src={img.url}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
};
