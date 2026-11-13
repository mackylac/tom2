import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, SlidersHorizontal } from 'lucide-react';
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

  // Aspect ratio of the cover artwork window inside the frame
  const aspectClass =
    project.coverAspect === 'portrait'
      ? 'aspect-[4/5]'
      : project.coverAspect === 'square'
        ? 'aspect-square'
        : 'aspect-[4/3]';

  // Stagger every second column item on Desktop for natural museum wall rhythm
  const staggerOffsetClass = index % 2 === 1 ? 'md:mt-24' : '';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{
        duration: 0.65,
        delay: Math.min(index * 0.08, 0.35),
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`group relative flex flex-col ${staggerOffsetClass}`}
    >
      {/* Overhead Museum Track Lamp Beam (Reveals softly on hover) */}
      <div
        aria-hidden="true"
        className="overhead-spotlight-cone pointer-events-none absolute -inset-x-8 -top-12 bottom-8 z-0 opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100"
      />

      {/* Hanging Wire / Gallery Wall Shadow Anchor */}
      <div className="relative z-10 mx-auto w-full">
        {/* Clickable Physical Picture Frame with Mobile Tactile Feedback active:scale-[0.985] */}
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
          className={`frame-outer-shell ${moldingClass} cursor-pointer transition-transform duration-500 ease-out select-none group-hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gallery)] focus-visible:ring-offset-4 active:scale-[0.985]`}
        >
          {/* Adaptive Matboard Passe-Partout Layer */}
          <div
            className={`${matboardClass} ${matboardPaddingClass} relative transition-colors duration-500`}
          >
            {/* Overhead Spotlight Radial Glow casting across the matboard & glass */}
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
              className={`artwork-window-bevel relative w-full ${aspectClass} bg-neutral-900`}
            >
              <img
                src={project.coverImage}
                alt={`${project.title} — ${project.category}`}
                loading={index < 2 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.015]"
              />

              {/* Subtle Museum Anti-Reflective Glass Sheen on Hover */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-white/10 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
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

        {/* Museum Wall Plaque (Bảng Tên Tác Phẩm) */}
        <div className="mt-5 flex items-start justify-between gap-3 border-t border-[var(--border-hairline)] pt-4 sm:mt-6 sm:gap-4">
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
      </div>
    </motion.article>
  );
};
