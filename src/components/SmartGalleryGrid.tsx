import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  Columns2,
  Expand,
  GalleryHorizontalEnd,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { useViewportDevice } from '../hooks/useViewportDevice';
import type { GalleryImage } from '../types/portfolio';

interface SmartGalleryGridProps {
  images: GalleryImage[];
  projectTitle: string;
  onOpenLightbox: (index: number) => void;
}

interface EnrichedGalleryItem {
  image: GalleryImage;
  originalIndex: number;
  width: number;
  height: number;
  aspectRatio: number;
  classification: 'panorama' | 'portrait' | 'justified';
  ruleLabel: string;
}

type LayoutRow =
  | {
      type: 'panorama';
      item: EnrichedGalleryItem;
    }
  | {
      type: 'portrait-pair';
      items: [EnrichedGalleryItem, EnrichedGalleryItem];
    }
  | {
      type: 'justified';
      items: EnrichedGalleryItem[];
    };

function formatRatioBadge(ar: number): string {
  return `AR ${ar.toFixed(2)}:1`;
}

interface Plate3DCardProps {
  item: EnrichedGalleryItem;
  projectTitle: string;
  showInspectorBadges: boolean;
  compactMobileBadge?: boolean;
  customStyle?: React.CSSProperties;
  extraClassName?: string;
  useTouch3DMode: boolean;
  onImageLoad: (id: string, event: React.SyntheticEvent<HTMLImageElement>) => void;
  onOpenLightbox: (index: number) => void;
}

const Plate3DCard: React.FC<Plate3DCardProps> = ({
  item,
  projectTitle,
  showInspectorBadges,
  compactMobileBadge = false,
  customStyle,
  extraClassName = '',
  useTouch3DMode,
  onImageLoad,
  onOpenLightbox,
}) => {
  const figureRef = useRef<HTMLElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const plateNumber = String(item.originalIndex + 1).padStart(2, '0');

  // Desktop 3D Hover Tilt (±4deg) & Elevation (translateZ(15px))
  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);
  const rawTranslateZ = useMotionValue(0);

  const springMouseX = useSpring(rawMouseX, { stiffness: 160, damping: 22 });
  const springMouseY = useSpring(rawMouseY, { stiffness: 160, damping: 22 });
  const springTranslateZ = useSpring(rawTranslateZ, {
    stiffness: 170,
    damping: 22,
  });

  const desktopRotateX = useTransform(springMouseY, [-0.5, 0.5], [4, -4]);
  const desktopRotateY = useTransform(springMouseX, [-0.5, 0.5], [-4, 4]);

  // Moving specular glass reflection & luxury thin border highlight
  const glareX = useTransform(springMouseX, [-0.5, 0.5], [86, 14]);
  const glareY = useTransform(springMouseY, [-0.5, 0.5], [86, 14]);
  const specularGlare = useMotionTemplate`radial-gradient(480px circle at ${glareX}% ${glareY}%, rgba(255, 250, 238, 0.22) 0%, rgba(200, 169, 126, 0.08) 38%, rgba(255, 255, 255, 0) 72%)`;

  // Mobile Scroll-linked 3D gentle tilt
  const { scrollYProgress } = useScroll({
    target: figureRef,
    offset: ['start end', 'end start'],
  });
  const mobileScrollRotateX = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [4, 0, -4]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (useTouch3DMode) return;
      const rect = e.currentTarget.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const normX = (e.clientX - rect.left) / rect.width - 0.5;
      const normY = (e.clientY - rect.top) / rect.height - 0.5;
      rawMouseX.set(Math.max(-0.5, Math.min(0.5, normX)));
      rawMouseY.set(Math.max(-0.5, Math.min(0.5, normY)));
    },
    [useTouch3DMode, rawMouseX, rawMouseY]
  );

  const handleMouseEnter = useCallback(() => {
    if (!useTouch3DMode) {
      setIsHovered(true);
      rawTranslateZ.set(15);
    }
  }, [useTouch3DMode, rawTranslateZ]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    rawMouseX.set(0);
    rawMouseY.set(0);
    rawTranslateZ.set(0);
  }, [rawMouseX, rawMouseY, rawTranslateZ]);

  return (
    <motion.figure
      ref={figureRef}
      initial={{ opacity: 0, rotateX: 10, y: 36, z: -50 }}
      whileInView={{ opacity: 1, rotateX: 0, y: 0, z: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
      style={{
        perspective: '1100px',
        ...customStyle,
      }}
      onClick={() => onOpenLightbox(item.originalIndex)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex cursor-zoom-in flex-col ${extraClassName}`}
    >
      <motion.div
        whileTap={{ scale: 0.97, rotateX: 3 }}
        style={{
          transformStyle: 'preserve-3d',
          rotateX: useTouch3DMode ? mobileScrollRotateX : desktopRotateX,
          rotateY: useTouch3DMode ? 0 : desktopRotateY,
          z: useTouch3DMode ? 0 : springTranslateZ,
        }}
        className={`relative flex h-full w-full flex-col overflow-hidden border bg-[var(--bg-surface)] transition-[border-color,box-shadow] duration-500 will-change-transform ${
          isHovered
            ? 'border-[var(--accent-gallery)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45),0_0_24px_-4px_rgba(200,169,126,0.32)]'
            : 'border-[var(--border-hairline)]'
        }`}
      >
        {/* Luxury Specular Border & Glass Glare Layer on Hover */}
        <motion.div
          aria-hidden="true"
          style={{
            background: specularGlare,
            transform: 'translateZ(8px)',
          }}
          className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-500 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Subtle 1px Inner Specular Rim Highlight */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 z-20 border transition-opacity duration-500 ${
            isHovered
              ? 'border-[#C8A97E]/45 opacity-100'
              : 'border-transparent opacity-0'
          }`}
        />

        {/* Plate Image Container: object-contain on Mobile to preserve 100% original aspect ratio, object-cover on Desktop justified rows */}
        <div
          className="relative w-full overflow-hidden bg-[var(--bg-primary)]"
          style={{
            aspectRatio: `${item.aspectRatio}`,
          }}
        >
          <img
            src={item.image.url}
            alt={
              item.image.caption || `${projectTitle} — Plate ${plateNumber}`
            }
            onLoad={(e) => onImageLoad(item.image.id, e)}
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-700 ease-out md:object-cover md:group-hover:scale-[1.03]"
          />

          {/* Subtle Museum Light Vignette on Desktop Hover */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden bg-gradient-to-t from-black/65 via-black/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 md:block"
          />

          {/* Top-Left Smart Auto-Layout Technical Badge */}
          {showInspectorBadges && (
            <div
              className={`pointer-events-none absolute top-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1.5 bg-black/75 px-2 py-1 font-mono-plaque tracking-[0.13em] text-[#FAF9F5] uppercase backdrop-blur-xs sm:top-3 sm:left-3 sm:px-2.5 ${
                compactMobileBadge
                  ? 'text-[8.5px] sm:text-[10px]'
                  : 'text-[9.5px] sm:text-[10px]'
              }`}
            >
              <span className="text-[#C8A97E]">PLATE {plateNumber}</span>
              <span className="opacity-50">|</span>
              <span>{formatRatioBadge(item.aspectRatio)}</span>
              {!compactMobileBadge && (
                <>
                  <span className="hidden opacity-50 sm:inline">|</span>
                  <span className="hidden text-neutral-300 sm:inline">
                    {item.width}×{item.height}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Top-Right Zoom Trigger Pill */}
          <div className="pointer-events-none absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center border border-white/20 bg-black/65 text-white opacity-85 transition-all duration-300 sm:top-3 sm:right-3 sm:h-8 sm:w-8 md:opacity-0 md:group-hover:opacity-100">
            <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </div>

          {/* Desktop Bottom Overlay Caption & Auto-Layout Rule Indicator */}
          <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden flex-col justify-end p-4 text-[#FAF9F5] opacity-0 transition-opacity duration-400 group-hover:opacity-100 sm:p-5 md:flex">
            <span className="mb-1 font-mono-plaque text-[9px] tracking-[0.18em] text-[#C8A97E] uppercase">
              {item.ruleLabel}
            </span>
            <p className="font-sans-gallery text-xs leading-relaxed font-normal text-neutral-100 sm:text-sm">
              {item.image.caption}
            </p>
          </figcaption>
        </div>

        {/* Mobile-Only Visible Plaque Caption (Since mobile has no hover state) */}
        {item.image.caption && (
          <div className="flex flex-col gap-0.5 border-t border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-2.5 md:hidden">
            <span className="font-mono-plaque text-[8.5px] tracking-[0.16em] text-[var(--accent-gallery)] uppercase">
              {item.ruleLabel}
            </span>
            <p className="line-clamp-2 font-sans-gallery text-xs leading-relaxed text-[var(--text-secondary)]">
              {item.image.caption}
            </p>
          </div>
        )}
      </motion.div>
    </motion.figure>
  );
};

export const SmartGalleryGrid: React.FC<SmartGalleryGridProps> = ({
  images,
  projectTitle,
  onOpenLightbox,
}) => {
  const { isMobile, isTouchDevice } = useViewportDevice();
  const useTouch3DMode = isMobile || isTouchDevice;

  // Stores live naturalWidth & naturalHeight read directly from the DOM <img> onLoad event
  const [naturalDimensions, setNaturalDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const [showInspectorBadges, setShowInspectorBadges] = useState<boolean>(true);
  // Mobile pairing mode for adjacent portrait/square pairs: 'diptych' (2-Column) or 'snap' (Horizontal Snap-Scroll)
  const [mobilePairMode, setMobilePairMode] = useState<'diptych' | 'snap'>(
    'diptych'
  );

  const handleImageLoad = useCallback(
    (id: string, event: React.SyntheticEvent<HTMLImageElement>) => {
      const imgEl = event.currentTarget;
      const nw = imgEl.naturalWidth;
      const nh = imgEl.naturalHeight;
      if (nw > 0 && nh > 0) {
        setNaturalDimensions((prev) => {
          const existing = prev[id];
          if (existing && existing.width === nw && existing.height === nh) {
            return prev;
          }
          return {
            ...prev,
            [id]: { width: nw, height: nh },
          };
        });
      }
    },
    []
  );

  // Step 1: Compute natural aspect ratio and classification for each image
  const enrichedItems = useMemo<EnrichedGalleryItem[]>(() => {
    return images.map((img, idx) => {
      const measured = naturalDimensions[img.id];
      const width = measured?.width ?? img.width ?? 1400;
      const height = measured?.height ?? img.height ?? 1000;
      const aspectRatio = Number((width / Math.max(height, 1)).toFixed(4));
      const override = img.layoutOverride ?? 'auto';

      let classification: 'panorama' | 'portrait' | 'justified';
      let ruleLabel: string;

      if (override === 'full') {
        classification = 'panorama';
        ruleLabel = 'OVERRIDE: FULL WIDTH (12 COL)';
      } else if (override === 'half') {
        classification = 'portrait';
        ruleLabel = 'OVERRIDE: PAIRED HALF (6+6 COL)';
      } else if (aspectRatio >= 1.65) {
        classification = 'panorama';
        ruleLabel = 'AUTO PANORAMA (AR ≥ 1.65 · 12 COL)';
      } else if (aspectRatio <= 0.9) {
        classification = 'portrait';
        ruleLabel = 'AUTO PORTRAIT PAIR (AR ≤ 0.90 · 6+6 COL)';
      } else {
        classification = 'justified';
        ruleLabel = 'JUSTIFIED ROW (FLEX-GROW: AR)';
      }

      return {
        image: img,
        originalIndex: idx,
        width,
        height,
        aspectRatio,
        classification,
        ruleLabel,
      };
    });
  }, [images, naturalDimensions]);

  // Step 2: Smart Row Packing Algorithm (No orphan gaps, 100% flush left-right edges)
  const layoutRows = useMemo<LayoutRow[]>(() => {
    const rows: LayoutRow[] = [];
    let portraitBuffer: EnrichedGalleryItem[] = [];
    let justifiedBuffer: EnrichedGalleryItem[] = [];

    const flushJustifiedBuffer = () => {
      if (justifiedBuffer.length === 0) return;
      const queue = [...justifiedBuffer];
      justifiedBuffer = [];

      while (queue.length > 0) {
        const remaining = queue.length;
        if (remaining === 1) {
          // Single standard image: if there is a waiting portrait, pair them into a justified row so neither is orphaned
          if (portraitBuffer.length === 1) {
            const p = portraitBuffer.shift()!;
            rows.push({
              type: 'justified',
              items: [p, queue.shift()!],
            });
          } else {
            rows.push({
              type: 'panorama',
              item: queue.shift()!,
            });
          }
        } else if (remaining === 2) {
          rows.push({
            type: 'justified',
            items: [queue.shift()!, queue.shift()!],
          });
        } else if (remaining === 4) {
          // Split 4 into 2 + 2 balanced justified rows instead of 3 + 1
          rows.push({
            type: 'justified',
            items: [queue.shift()!, queue.shift()!],
          });
        } else {
          // 3 or 5+ items: take 3 if combined aspect ratio is comfortable, else 2
          const firstThreeSum =
            queue[0].aspectRatio + queue[1].aspectRatio + queue[2].aspectRatio;
          const takeCount = firstThreeSum <= 4.35 ? 3 : 2;
          rows.push({
            type: 'justified',
            items: queue.splice(0, takeCount),
          });
        }
      }
    };

    for (const item of enrichedItems) {
      if (item.classification === 'panorama') {
        flushJustifiedBuffer();
        rows.push({ type: 'panorama', item });
      } else if (item.classification === 'portrait') {
        portraitBuffer.push(item);
        if (portraitBuffer.length === 2) {
          flushJustifiedBuffer();
          const [first, second] = portraitBuffer;
          portraitBuffer = [];
          rows.push({
            type: 'portrait-pair',
            items: [first, second],
          });
        }
      } else {
        justifiedBuffer.push(item);
      }
    }

    flushJustifiedBuffer();

    // If an odd portrait remains at the end, pair it with the last justified row or display cleanly
    if (portraitBuffer.length === 1) {
      const leftoverPortrait = portraitBuffer.shift()!;
      const lastRow = rows[rows.length - 1];
      if (lastRow && lastRow.type === 'justified' && lastRow.items.length < 3) {
        lastRow.items.push(leftoverPortrait);
      } else {
        rows.push({
          type: 'justified',
          items: [leftoverPortrait],
        });
      }
    }

    return rows;
  }, [enrichedItems]);

  const renderPlateCard = (
    item: EnrichedGalleryItem,
    customStyle?: React.CSSProperties,
    extraClassName = '',
    compactMobileBadge = false
  ) => (
    <Plate3DCard
      key={item.image.id}
      item={item}
      projectTitle={projectTitle}
      showInspectorBadges={showInspectorBadges}
      compactMobileBadge={compactMobileBadge}
      customStyle={customStyle}
      extraClassName={extraClassName}
      useTouch3DMode={useTouch3DMode}
      onImageLoad={handleImageLoad}
      onOpenLightbox={onOpenLightbox}
    />
  );

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Smart Auto-Layout Engine Status & Adaptive Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--border-hairline)] py-3">
        <div className="flex items-center gap-2 font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase sm:text-[11px]">
          <Sparkles
            className="h-3.5 w-3.5 shrink-0 text-[var(--accent-gallery)]"
            strokeWidth={1.5}
          />
          <span>
            SMART AUTO-LAYOUT ENGINE: ACTIVE ({enrichedItems.length} PLATES ·{' '}
            {layoutRows.length} CURATED ROWS · 3D ELEVATION)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Mobile-Only Toggle for Portrait Pair Presentation (2-Col Diptych vs Horizontal Snap-Scroll) */}
          <div className="flex items-center border border-[var(--border-hairline)] bg-[var(--bg-plaque)] md:hidden">
            <button
              type="button"
              onClick={() => setMobilePairMode('diptych')}
              className={`flex min-h-[34px] items-center gap-1 px-2.5 py-1 font-mono-plaque text-[9.5px] tracking-[0.13em] uppercase transition-colors ${
                mobilePairMode === 'diptych'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'text-[var(--text-secondary)]'
              }`}
              title="Hiển thị cặp ảnh dọc song song 2 cột"
            >
              <Columns2 className="h-3 w-3" strokeWidth={1.5} />
              <span>Cặp 2 Cột</span>
            </button>
            <button
              type="button"
              onClick={() => setMobilePairMode('snap')}
              className={`flex min-h-[34px] items-center gap-1 px-2.5 py-1 font-mono-plaque text-[9.5px] tracking-[0.13em] uppercase transition-colors ${
                mobilePairMode === 'snap'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'text-[var(--text-secondary)]'
              }`}
              title="Hiển thị cặp ảnh dọc bằng thanh trượt ngang"
            >
              <GalleryHorizontalEnd className="h-3 w-3" strokeWidth={1.5} />
              <span>Trượt Ngang</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowInspectorBadges((prev) => !prev)}
            className="min-h-[34px] border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-1 font-mono-plaque text-[10px] tracking-[0.14em] text-[var(--text-secondary)] uppercase transition-colors hover:border-[var(--accent-gallery)] hover:text-[var(--text-primary)]"
          >
            {showInspectorBadges ? 'Ẩn Thông Số AR' : 'Hiện Thông Số AR'}
          </button>

          <button
            type="button"
            onClick={() => onOpenLightbox(0)}
            className="flex min-h-[34px] items-center gap-1.5 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-1 font-mono-plaque text-[10px] tracking-[0.14em] text-[var(--text-primary)] uppercase transition-colors hover:border-[var(--accent-gallery)] hover:bg-[var(--accent-gallery)] hover:text-[#FAF9F5]"
          >
            <Expand className="h-3 w-3" strokeWidth={1.5} />
            <span>Mở Lightbox</span>
          </button>
        </div>
      </div>

      {/* Mathematical Gallery Grid Rows */}
      <div className="space-y-5 sm:space-y-6 md:space-y-8">
        {layoutRows.map((row, rowIndex) => {
          // 1. Panorama Full-Width Row (col-span-12 on Desktop, 100% full width on Mobile)
          if (row.type === 'panorama') {
            return (
              <div key={`row-pano-${rowIndex}`} className="w-full">
                {renderPlateCard(row.item, undefined, 'w-full')}
              </div>
            );
          }

          // 2. Portrait / Menu Paired Row:
          // - Desktop: col-span-6 + col-span-6 with equalized height via flex-grow: aspectRatio
          // - Mobile: Smart 2-Column Diptych OR Horizontal Snap-Scroll Carousel
          if (row.type === 'portrait-pair') {
            const [leftItem, rightItem] = row.items;
            const totalAr = leftItem.aspectRatio + rightItem.aspectRatio;
            const leftPct = (leftItem.aspectRatio / totalAr) * 100;
            const rightPct = (rightItem.aspectRatio / totalAr) * 100;

            return (
              <div key={`row-portrait-${rowIndex}`} className="w-full">
                {/* Mobile Adaptive Presentation for Portrait Pairs */}
                <div className="md:hidden">
                  {mobilePairMode === 'diptych' ? (
                    <div className="grid grid-cols-2 items-start gap-3">
                      {renderPlateCard(leftItem, undefined, 'w-full', true)}
                      {renderPlateCard(rightItem, undefined, 'w-full', true)}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between font-mono-plaque text-[9.5px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                        <span>DIPTYCH SNAP-SCROLL (VUỐT NGANG ĐỂ SO SÁNH)</span>
                        <span>2 PLATES</span>
                      </div>
                      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-1">
                        <div className="w-[82vw] max-w-[340px] shrink-0 snap-center">
                          {renderPlateCard(leftItem, undefined, 'w-full')}
                        </div>
                        <div className="w-[82vw] max-w-[340px] shrink-0 snap-center">
                          {renderPlateCard(rightItem, undefined, 'w-full')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop & Tablet Landscape Presentation (Balanced 50/50 Justified Pair) */}
                <div className="hidden md:flex md:flex-row md:items-stretch md:gap-8">
                  {renderPlateCard(
                    leftItem,
                    {
                      flexGrow: leftItem.aspectRatio,
                      flexBasis: `${leftPct}%`,
                    },
                    'md:w-auto'
                  )}
                  {renderPlateCard(
                    rightItem,
                    {
                      flexGrow: rightItem.aspectRatio,
                      flexBasis: `${rightPct}%`,
                    },
                    'md:w-auto'
                  )}
                </div>
              </div>
            );
          }

          // 3. Justified Row Layout (2 or 3 standard/square images with flex-grow: aspectRatio on Desktop; full-width uncropped on Mobile)
          const rowAspectSum = row.items.reduce(
            (acc, cur) => acc + cur.aspectRatio,
            0
          );

          return (
            <div
              key={`row-justified-${rowIndex}`}
              className="flex flex-col gap-5 md:flex-row md:items-stretch md:gap-8"
            >
              {row.items.map((item) => {
                const basisPercent = (item.aspectRatio / rowAspectSum) * 100;
                return renderPlateCard(
                  item,
                  {
                    flexGrow: item.aspectRatio,
                    flexBasis: `${basisPercent}%`,
                  },
                  'w-full md:w-auto'
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
