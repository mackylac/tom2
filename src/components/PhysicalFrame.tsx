import React, { useCallback, useRef, useState } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import { useViewportDevice } from '../hooks/useViewportDevice';
import {
  FRAME_MATERIAL_LABELS,
  type LightingMode,
  MATBOARD_SIZE_LABELS,
  type Project,
} from '../types/portfolio';

interface PhysicalFrameProps {
  project: Project;
  index: number;
  lightingMode: LightingMode;
  onSelectProject: (projectId: string) => void;
  onQuickEdit?: (projectId: string, e: React.MouseEvent) => void;
}

export const PhysicalFrame: React.FC<PhysicalFrameProps> = ({
  project,
  index,
  lightingMode,
  onSelectProject,
  onQuickEdit,
}) => {
  const articleRef = useRef<HTMLElement>(null);
  const { isMobile, isTouchDevice } = useViewportDevice();
  const useTouch3DMode = isMobile || isTouchDevice;
  const [isHovered, setIsHovered] = useState(false);

  // Determine matboard surface color (#FAF9F5 ivory vs #181818 charcoal)
  const resolvedMatboard =
    project.matboardTone === 'auto'
      ? lightingMode === 'spotlight'
        ? 'charcoal'
        : 'ivory'
      : project.matboardTone;

  const matboardClass =
    resolvedMatboard === 'charcoal' ? 'matboard-charcoal' : 'matboard-ivory';

  const matboardPaddingClass =
    MATBOARD_SIZE_LABELS[project.matboardSize ?? 'standard']?.paddingClass ??
    'p-3.5 sm:p-5 md:p-6 lg:p-8';

  const moldingClass =
    project.frameStyle === 'gallery-oak'
      ? 'frame-molding-gallery-oak'
      : project.frameStyle === 'brushed-bronze'
        ? 'frame-molding-brushed-bronze'
        : 'frame-molding-matte-black';

  // Raised 3D Outer Molding Rim border accent color matching the physical material
  const outerRimAccentStyle: React.CSSProperties =
    project.frameStyle === 'gallery-oak'
      ? {
          border: '2px solid rgba(214, 176, 128, 0.42)',
          boxShadow:
            'inset 0 1px 2px rgba(255, 244, 224, 0.35), 0 8px 20px rgba(20, 14, 8, 0.28)',
        }
      : project.frameStyle === 'brushed-bronze'
        ? {
            border: '2px solid rgba(226, 198, 148, 0.45)',
            boxShadow:
              'inset 0 1px 2px rgba(255, 238, 198, 0.38), 0 8px 20px rgba(18, 14, 8, 0.32)',
          }
        : {
            border: '2px solid rgba(255, 255, 255, 0.14)',
            boxShadow:
              'inset 0 1px 1px rgba(255, 255, 255, 0.18), 0 8px 20px rgba(0, 0, 0, 0.42)',
          };

  // Aspect ratio of the cover artwork window inside the frame
  const aspectClass =
    project.coverAspect === 'portrait'
      ? 'aspect-[4/5]'
      : project.coverAspect === 'square'
        ? 'aspect-square'
        : 'aspect-[4/3]';

  // Stagger every second column item on Desktop for natural museum wall rhythm
  const isRightColumn = index % 2 === 1;
  const staggerOffsetClass = isRightColumn ? 'md:mt-24' : '';

  // ============================================================================
  // 1. MOUSE-DRIVEN 3D MULTI-LAYER PARALLAX (Desktop: -7deg to +7deg)
  // ============================================================================
  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);

  const springMouseX = useSpring(rawMouseX, { stiffness: 150, damping: 22 });
  const springMouseY = useSpring(rawMouseY, { stiffness: 150, damping: 22 });

  const desktopRotateX = useTransform(springMouseY, [-0.5, 0.5], [7, -7]);
  const desktopRotateY = useTransform(springMouseX, [-0.5, 0.5], [-7, 7]);

  // Inverse parallax shift for the recessed Cover Artwork at translateZ(0px)
  const artworkShiftX = useTransform(springMouseX, [-0.5, 0.5], [7, -7]);
  const artworkShiftY = useTransform(springMouseY, [-0.5, 0.5], [7, -7]);

  // Museum Glass Specular Glare moving opposite to mouse tilt at translateZ(18px)
  const glarePosX = useTransform(springMouseX, [-0.5, 0.5], [88, 12]);
  const glarePosY = useTransform(springMouseY, [-0.5, 0.5], [86, 14]);
  const specularGlareGradient = useMotionTemplate`radial-gradient(620px circle at ${glarePosX}% ${glarePosY}%, rgba(255, 252, 242, 0.28) 0%, rgba(255, 255, 255, 0.08) 34%, rgba(255, 255, 255, 0) 70%)`;

  // Dynamic 3D Wall Shadow shifting opposite to frame 3D tilt
  const dynamicShadowX = useTransform(springMouseX, [-0.5, 0.5], [22, -22]);
  const dynamicShadowY = useTransform(springMouseY, [-0.5, 0.5], [14, 42]);
  const dynamicShadowBlur = useTransform(
    springMouseY,
    [-0.5, 0, 0.5],
    [28, 34, 46]
  );
  const dynamicShadowFilter = useMotionTemplate`blur(${dynamicShadowBlur}px)`;

  // ============================================================================
  // 2. SPATIAL SCROLL PARALLAX & MOBILE SCROLL-LINKED 3D TILT
  // ============================================================================
  const { scrollYProgress } = useScroll({
    target: articleRef,
    offset: ['start end', 'end start'],
  });

  // Differential column scroll parallax on Desktop (Right column drifts with deeper parallax offset)
  const columnParallaxY = useTransform(
    scrollYProgress,
    [0, 1],
    useTouch3DMode ? [0, 0] : isRightColumn ? [42, -52] : [14, -18]
  );

  // Mobile/Tablet Scroll-linked 3D gentle tilt for 60fps touch smoothness
  const mobileScrollRotateX = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [5.5, 0, -5.5]
  );
  const mobileScrollRotateY = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    isRightColumn ? [2.2, 0, -2.2] : [-2.2, 0, 2.2]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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
    }
  }, [useTouch3DMode]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    rawMouseX.set(0);
    rawMouseY.set(0);
  }, [rawMouseX, rawMouseY]);

  // Stagger delay between left and right columns during 3D Spatial Entrance
  const entranceDelay =
    (index % 2) * 0.14 + Math.min(Math.floor(index / 2) * 0.06, 0.24);

  return (
    <motion.article
      ref={articleRef}
      layout
      style={{
        perspective: '1200px',
        y: columnParallaxY,
      }}
      initial={{ opacity: 0, rotateX: 14, y: 60, z: -80 }}
      whileInView={{ opacity: 1, rotateX: 0, y: 0, z: 0 }}
      exit={{ opacity: 0, rotateX: -8, y: 24, z: -40 }}
      viewport={{ once: true, amount: 0.12, margin: '0px 0px -40px 0px' }}
      transition={{
        duration: 0.85,
        delay: entranceDelay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`group relative flex flex-col ${staggerOffsetClass}`}
    >
      {/* Overhead Museum Track Lamp Beam (Reveals softly on hover) */}
      <div
        aria-hidden="true"
        className="overhead-spotlight-cone pointer-events-none absolute -inset-x-8 -top-12 bottom-8 z-0 opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100"
      />

      {/* 3D Interactive Stage Container */}
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        whileTap={{ scale: 0.97, rotateX: 3 }}
        style={{
          transformStyle: 'preserve-3d',
          rotateX: useTouch3DMode ? mobileScrollRotateX : desktopRotateX,
          rotateY: useTouch3DMode ? mobileScrollRotateY : desktopRotateY,
        }}
        className="relative z-10 mx-auto w-full will-change-transform"
      >
        {/* Dynamic 3D Wall Shadow Caster (Shifts x, y, and blur opposite to 3D frame tilt) */}
        <motion.div
          aria-hidden="true"
          style={{
            transform: 'translateZ(-22px)',
            x: useTouch3DMode ? 0 : dynamicShadowX,
            y: useTouch3DMode ? 22 : dynamicShadowY,
            filter: useTouch3DMode ? 'blur(28px)' : dynamicShadowFilter,
          }}
          className={`pointer-events-none absolute inset-x-3 top-4 bottom-16 -z-10 transition-opacity duration-500 ${
            lightingMode === 'spotlight'
              ? 'bg-black/85 opacity-90 group-hover:opacity-100'
              : 'bg-[#12110F]/28 opacity-75 group-hover:opacity-95'
          }`}
        />

        {/* Clickable Physical Picture Frame with True Z-Axis Depth Layers */}
        <div
          role="button"
          tabIndex={0}
          aria-label={`Xem triển lãm dự án ${project.title} — Exhibit No. ${project.exhibitNumber}`}
          onClick={() => onSelectProject(project.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectProject(project.id);
            }
          }}
          style={{
            transformStyle: 'preserve-3d',
          }}
          className={`frame-outer-shell ${moldingClass} relative cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gallery)] focus-visible:ring-offset-4`}
        >
          {/* LAYER 1: Outer Frame Molding Raised 3D Bezel Rim at translateZ(24px) */}
          <div
            aria-hidden="true"
            style={{
              transform: 'translateZ(24px)',
              ...outerRimAccentStyle,
            }}
            className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-500"
          />

          {/* LAYER 2: Museum Glass Specular Glare at translateZ(18px) (Radial-gradient moving opposite to mouse tilt) */}
          <motion.div
            aria-hidden="true"
            style={{
              transform: 'translateZ(18px)',
              background: specularGlareGradient,
            }}
            className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-500 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* LAYER 3: Adaptive Matboard Passe-Partout Layer at translateZ(10px) */}
          <div
            style={{
              transform: 'translateZ(10px)',
              transformStyle: 'preserve-3d',
            }}
            className={`${matboardClass} ${matboardPaddingClass} relative transition-colors duration-500`}
          >
            {/* Overhead Spotlight Radial Glow casting across the matboard */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
              style={{
                background:
                  'radial-gradient(90% 75% at 50% 8%, rgba(255, 250, 236, 0.22) 0%, rgba(255, 255, 255, 0.04) 52%, transparent 100%)',
              }}
            />

            {/* Inner 45-deg Bevel Cut Window — Strictly ONE Cover Image */}
            <div
              style={{
                transformStyle: 'preserve-3d',
              }}
              className={`artwork-window-bevel relative w-full ${aspectClass} overflow-hidden bg-neutral-900`}
            >
              {/* LAYER 4: Cover Artwork Recessed at translateZ(0px) with Inverse X/Y Parallax */}
              <motion.div
                style={{
                  transform: 'translateZ(0px)',
                  x: useTouch3DMode ? 0 : artworkShiftX,
                  y: useTouch3DMode ? 0 : artworkShiftY,
                  scale: isHovered ? 1.045 : 1.02,
                }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="h-full w-full will-change-transform"
              >
                <img
                  src={project.coverImage}
                  alt={`${project.title} — ${project.category}`}
                  loading={index < 2 ? 'eager' : 'lazy'}
                  className="h-full w-full object-cover object-center"
                />
              </motion.div>

              {/* Deep Inner Frame Rebate Shadow (Enhances recessed depth beneath Matboard & Glass) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 shadow-[inset_0_4px_14px_rgba(0,0,0,0.42)]"
              />
            </div>

            {/* Subtle Archival Engrave Marks on the bottom of the Matboard */}
            <div
              className={`mt-2.5 flex items-center justify-between font-mono-plaque text-[9px] tracking-[0.2em] uppercase sm:mt-3 sm:text-[10px] ${
                resolvedMatboard === 'charcoal'
                  ? 'text-neutral-500'
                  : 'text-neutral-400'
              }`}
            >
              <span>ARCHIVE № {project.exhibitNumber}</span>
              <span>{project.galleryImages.length + 1} PLATES IN ROOM</span>
            </div>
          </div>
        </div>

        {/* LAYER 5: Museum Wall Plaque (Bảng Tên Tác Phẩm) elevated at translateZ(16px) & sliding up on hover */}
        <div
          style={{
            transform: 'translateZ(16px)',
          }}
          className="mt-5 flex items-start justify-between gap-3 border-t border-[var(--border-hairline)] pt-4 transition-transform duration-500 ease-out group-hover:-translate-y-1.5 sm:mt-6 sm:gap-4"
        >
          <div
            onClick={() => onSelectProject(project.id)}
            className="cursor-pointer space-y-1.5"
          >
            {/* Exhibit Number & Category + Year */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono-plaque text-[10px] tracking-[0.18em] text-[var(--text-muted)] uppercase sm:text-[11px]">
              <span className="font-medium text-[var(--accent-gallery)]">
                EXHIBIT NO. {project.exhibitNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span>{project.category}</span>
              <span aria-hidden="true">·</span>
              <span>{project.year}</span>
            </div>

            {/* Project Title */}
            <h2 className="font-serif-gallery text-2xl leading-[1.12] font-normal tracking-tight text-[var(--text-primary)] transition-colors duration-300 group-hover:text-[var(--accent-gallery)] sm:text-3xl">
              {project.title}
            </h2>

            {/* Client & Frame Material */}
            <p className="font-sans-gallery text-xs tracking-wide text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">Client:</span>{' '}
              <span className="font-medium">{project.client}</span>
              <span className="mx-2 text-[var(--border-strong)]">|</span>
              <span className="text-[var(--text-muted)]">
                Khung: {FRAME_MATERIAL_LABELS[project.frameStyle].vietnamese}
              </span>
            </p>
          </div>

          {/* Right Plaque Actions (Touch Target >= 44px) */}
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {onQuickEdit && (
              <button
                type="button"
                onClick={(e) => onQuickEdit(project.id, e)}
                title="Chỉnh sửa nhanh dự án này"
                aria-label={`Chỉnh sửa dự án ${project.title}`}
                className="flex h-11 w-11 items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-plaque)] text-[var(--text-muted)] opacity-80 transition-all duration-200 hover:border-[var(--accent-gallery)] hover:text-[var(--text-primary)] hover:opacity-100 active:scale-[0.96]"
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectProject(project.id)}
              aria-label={`Mở phòng trưng bày ${project.title}`}
              className="flex h-11 items-center gap-1.5 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3.5 font-mono-plaque text-[10px] tracking-[0.16em] whitespace-nowrap text-[var(--text-primary)] uppercase transition-all duration-300 group-hover:border-[var(--accent-gallery)] group-hover:bg-[var(--accent-gallery)] group-hover:text-[#FAF9F5] active:scale-[0.96]"
            >
              <span className="hidden sm:inline">Vào Phòng Tranh</span>
              <span className="sm:hidden">Xem</span>
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.article>
  );
};
