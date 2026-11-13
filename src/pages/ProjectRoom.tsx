import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LampCeiling,
  Lock,
  Sparkles,
  SunMedium,
} from 'lucide-react';
import { LightboxModal } from '../components/LightboxModal';
import { SmartGalleryGrid } from '../components/SmartGalleryGrid';
import { usePortfolio } from '../context/PortfolioContext';
import { FRAME_MATERIAL_LABELS, type Project } from '../types/portfolio';

interface ProjectRoomProps {
  project: Project;
  nextProject: Project;
  onBackToHall: () => void;
  onSelectProject: (projectId: string) => void;
  onOpenAdmin: () => void;
}

export const ProjectRoom: React.FC<ProjectRoomProps> = ({
  project,
  nextProject,
  onBackToHall,
  onSelectProject,
  onOpenAdmin,
}) => {
  const { lightingMode, toggleLightingMode, siteSettings } = usePortfolio();

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const commissionSectionRef = useRef<HTMLElement>(null);

  // Commission form state pre-filled with the current project's style
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNotes, setClientNotes] = useState(
    () =>
      `Tôi ấn tượng với phong cách thiết kế của dự án "${project.title}" (Exhibit No. ${project.exhibitNumber} — ${project.category}) và muốn đặt lịch tư vấn cho thương hiệu của mình.`
  );
  const [formSent, setFormSent] = useState(false);

  const scrollToCommissionForm = () => {
    commissionSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCommissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim()) return;
    setFormSent(true);
  };

  return (
    <motion.div
      key={project.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="min-h-[100dvh] bg-[var(--bg-wall)] pb-24 text-[var(--text-primary)] md:pb-0"
    >
      {/* Adaptive Sub-page Sticky Header (Pure Visitor Experience) */}
      <header className="pt-safe sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-glass)] backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-[1440px] flex-wrap items-center justify-between gap-2.5 px-4 py-2 sm:min-h-18 sm:px-10 lg:px-16">
          {/* Left: Back to Main Exhibition Hall */}
          <button
            type="button"
            onClick={onBackToHall}
            className="group flex h-10 shrink-0 items-center gap-2 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 font-mono-plaque text-[10.5px] tracking-[0.15em] whitespace-nowrap text-[var(--text-primary)] uppercase transition-all duration-300 hover:border-[var(--accent-gallery)] hover:bg-[var(--accent-gallery)] hover:text-[#FAF9F5] active:scale-[0.98] sm:px-3.5 sm:text-[11px]"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5"
              strokeWidth={1.5}
            />
            <span>← Quay lại Sảnh Triển Lãm</span>
          </button>

          {/* Center: Active Project Title */}
          <div className="hidden items-center gap-2.5 font-mono-plaque text-xs tracking-[0.18em] uppercase xl:flex">
            <span className="text-[var(--accent-gallery)]">
              EXHIBIT NO. {project.exhibitNumber}
            </span>
            <span className="text-[var(--border-strong)]">/</span>
            <span className="font-serif-gallery text-lg font-normal tracking-normal text-[var(--text-primary)] normal-case">
              {project.title}
            </span>
          </div>

          {/* Right: Lighting Toggle + Commission Style CTA */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLightingMode}
              title="Đổi chế độ ánh sáng phòng tranh"
              aria-label="Đổi chế độ ánh sáng phòng tranh"
              className="flex h-10 w-10 items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-plaque)] text-[var(--text-primary)] transition-colors hover:border-[var(--accent-gallery)]"
            >
              {lightingMode === 'daylight' ? (
                <SunMedium
                  className="h-4 w-4 text-[var(--accent-gallery)]"
                  strokeWidth={1.5}
                />
              ) : (
                <LampCeiling
                  className="h-4 w-4 text-[var(--accent-gallery)]"
                  strokeWidth={1.5}
                />
              )}
            </button>

            <button
              type="button"
              onClick={scrollToCommissionForm}
              className="hidden h-10 shrink-0 items-center gap-2 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-3.5 font-mono-plaque text-[10px] tracking-[0.16em] whitespace-nowrap text-[#FAF9F5] uppercase transition-all duration-300 hover:opacity-90 active:scale-[0.98] md:flex"
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Liên hệ thiết kế phong cách này</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Project Exhibition Room */}
      <main className="mx-auto max-w-[1440px] px-4 sm:px-10 lg:px-16">
        {/* 1. Curatorial Intro Section */}
        <section className="border-b border-[var(--border-hairline)] pt-9 pb-12 sm:pt-12 sm:pb-16 md:pt-20 md:pb-24">
          {/* Top Exhibit Classification Line */}
          <div className="flex flex-wrap items-center gap-2.5 font-mono-plaque text-[11px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase sm:gap-3 sm:text-xs">
            <span>EXHIBIT ROOM № {project.exhibitNumber}</span>
            <span>·</span>
            <span>{project.category}</span>
            <span>·</span>
            <span>{project.location}</span>
          </div>

          {/* Monumental Project Title & Subtitle */}
          <div className="mt-4 max-w-5xl space-y-3 sm:space-y-4">
            <h1 className="font-serif-gallery text-3xl leading-[1.07] font-normal tracking-tight text-[var(--text-primary)] sm:text-6xl lg:text-[72px] lg:leading-[1.05]">
              {project.title}
            </h1>
            <p className="font-serif-gallery text-lg text-[var(--text-secondary)] italic sm:text-2xl">
              {project.subtitle}
            </p>
          </div>

          {/* Architectural Specs Grid (Client, Role, Year, Deliverables, Frame Material) */}
          <div className="mt-9 grid grid-cols-1 gap-5 border-y border-[var(--border-hairline)] py-6 sm:mt-12 sm:grid-cols-2 sm:gap-6 sm:py-8 lg:grid-cols-5">
            <div className="space-y-1.5">
              <div className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase">
                CLIENT / PARTNER
              </div>
              <div className="font-sans-gallery text-sm font-medium text-[var(--text-primary)]">
                {project.client}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase">
                ROLE & DIRECTION
              </div>
              <div className="font-sans-gallery text-sm text-[var(--text-primary)]">
                {project.role}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase">
                EXHIBITION YEAR
              </div>
              <div className="font-mono-plaque text-sm text-[var(--text-primary)]">
                {project.year}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase">
                FRAME MOLDING SPEC
              </div>
              <div className="font-sans-gallery text-sm text-[var(--text-primary)]">
                {FRAME_MATERIAL_LABELS[project.frameStyle].vietnamese} (
                {FRAME_MATERIAL_LABELS[project.frameStyle].name})
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase">
                DELIVERABLES ({project.deliverables.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {project.deliverables.map((item) => (
                  <span
                    key={item}
                    className="border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-2 py-0.5 font-mono-plaque text-[10px] text-[var(--text-secondary)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Curatorial Essay: Concept & Execution */}
          <div className="mt-9 grid grid-cols-1 gap-8 sm:mt-12 sm:gap-10 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-4">
              <div className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                01 · CURATORIAL OVERVIEW
              </div>
              <p className="font-serif-gallery text-xl leading-relaxed text-[var(--text-primary)] sm:text-2xl">
                “{project.curatorialStatement}”
              </p>
            </div>

            <div className="space-y-3 lg:col-span-4">
              <div className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase">
                02 · CONCEPT & SPATIAL PHILOSOPHY
              </div>
              <p className="font-sans-gallery text-sm leading-relaxed text-[var(--text-secondary)]">
                {project.conceptNarrative}
              </p>
            </div>

            <div className="space-y-3 lg:col-span-4">
              <div className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase">
                03 · CRAFT, MATERIAL & EXECUTION
              </div>
              <p className="font-sans-gallery text-sm leading-relaxed text-[var(--text-secondary)]">
                {project.executionDetails}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Full Project Plates & Multi-Device Smart Auto-Layout Engine */}
        <section
          aria-label="Bộ sưu tập hình ảnh chi tiết dự án"
          className="py-12 sm:py-16 md:py-24"
        >
          <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
            <div>
              <div className="font-mono-plaque text-[11px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                EXHIBITION PLATES & ARCHIVAL DOCUMENTATION
              </div>
              <h2 className="mt-1 font-serif-gallery text-2xl font-normal tracking-tight text-[var(--text-primary)] sm:text-4xl">
                Toàn Bộ Bản Vẽ & Hình Ảnh Thực Thi Dự Án
              </h2>
            </div>

            <p className="max-w-md font-sans-gallery text-xs leading-relaxed text-[var(--text-muted)]">
              Chạm vào bất kỳ bức ảnh nào để mở Lightbox toàn màn hình (Hỗ trợ vuốt ngang chuyển ảnh, chạm đúp Zoom 2x trên điện thoại hoặc cuộn chuột trên máy tính).
            </p>
          </div>

          <SmartGalleryGrid
            images={project.galleryImages}
            projectTitle={project.title}
            onOpenLightbox={(index) => setLightboxIndex(index)}
          />
        </section>

        {/* 3. Next Exhibit Preview & Style Commission Form */}
        <section
          ref={commissionSectionRef}
          className="border-t border-[var(--border-hairline)] py-16 sm:py-20 md:py-28"
        >
          <div className="grid grid-cols-1 gap-10 sm:gap-14 lg:grid-cols-12">
            {/* Left Column: Next Exhibit Preview Card */}
            <div className="flex flex-col justify-between space-y-8 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-5 sm:p-10 lg:col-span-5">
              <div className="space-y-4">
                <div className="font-mono-plaque text-[11px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                  NEXT EXHIBIT IN ARCHIVE →
                </div>
                <div className="font-mono-plaque text-xs text-[var(--text-muted)] uppercase">
                  EXHIBIT NO. {nextProject.exhibitNumber} · {nextProject.category}
                </div>
                <h3 className="font-serif-gallery text-3xl font-normal text-[var(--text-primary)] sm:text-4xl">
                  {nextProject.title}
                </h3>
                <p className="font-sans-gallery text-xs leading-relaxed text-[var(--text-secondary)]">
                  {nextProject.curatorialStatement}
                </p>
              </div>

              <div
                onClick={() => onSelectProject(nextProject.id)}
                className="group relative cursor-pointer overflow-hidden border border-[var(--border-hairline)] bg-neutral-900"
              >
                <div className="aspect-[16/10] w-full overflow-hidden">
                  <img
                    src={nextProject.coverImage}
                    alt={nextProject.title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex items-center justify-between bg-[var(--bg-surface)] px-4 py-3 font-mono-plaque text-[11px] tracking-[0.16em] text-[var(--text-primary)] uppercase transition-colors group-hover:bg-[var(--accent-gallery)] group-hover:text-[#FAF9F5]">
                  <span>Bước Sang Phòng Trưng Bày Tiếp Theo</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Right Column: Commission This Style Form */}
            <div className="border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-5 sm:p-10 lg:col-span-7">
              <div className="mb-6 space-y-2">
                <div className="font-mono-plaque text-[11px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                  COMMISSION INQUIRY · STYLE REFERENCE № {project.exhibitNumber}
                </div>
                <h3 className="font-serif-gallery text-2xl font-normal text-[var(--text-primary)] sm:text-4xl">
                  Liên Hệ Thiết Kế Theo Tinh Thần “{project.title}”
                </h3>
                <p className="font-sans-gallery text-xs text-[var(--text-secondary)]">
                  Hồ sơ yêu cầu của bạn sẽ đính kèm mã tham chiếu{' '}
                  <span className="font-mono-plaque text-[var(--text-primary)]">
                    EXHIBIT-{project.exhibitNumber} ({project.category})
                  </span>{' '}
                  để đội ngũ giám tuyển chuẩn bị bảng chất liệu tương ứng.
                </p>
              </div>

              {formSent ? (
                <div className="space-y-4 border border-[var(--accent-gallery)] bg-[var(--accent-gallery-soft)] p-6">
                  <div className="flex items-center gap-2.5 text-[var(--accent-gallery)]">
                    <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
                    <span className="font-mono-plaque text-xs tracking-[0.18em] uppercase">
                      ĐÃ GỬI YÊU CẦU TƯ VẤN PHONG CÁCH NÀY
                    </span>
                  </div>
                  <p className="font-serif-gallery text-2xl text-[var(--text-primary)]">
                    Cảm ơn {clientName}. Chúng tôi đã ghi nhận yêu cầu thiết kế tham chiếu từ dự án {project.title}.
                  </p>
                  <p className="font-sans-gallery text-xs text-[var(--text-secondary)]">
                    Bản đề xuất định hướng thị giác và lịch hẹn trao đổi trực tiếp sẽ được gửi tới {clientEmail} trong vòng 24 giờ.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFormSent(false)}
                    className="border border-[var(--border-strong)] px-4 py-2 font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-primary)] uppercase"
                  >
                    Chỉnh Sửa Nội Dung Yêu Cầu
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCommissionSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="room-client-name"
                        className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase"
                      >
                        Họ Tên Quý Khách / Thương Hiệu
                      </label>
                      <input
                        id="room-client-name"
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Trần Bảo Ngọc — Founder"
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="room-client-email"
                        className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase"
                      >
                        Email Nhận Hồ Sơ Tư Vấn
                      </label>
                      <input
                        id="room-client-email"
                        type="email"
                        required
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="ngoc@atelier-client.example"
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="room-client-notes"
                      className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase"
                    >
                      Ghi Chú Về Sản Phẩm & Yêu Cầu Thiết Kế
                    </label>
                    <textarea
                      id="room-client-notes"
                      rows={4}
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] p-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full border border-[var(--text-primary)] bg-[var(--text-primary)] px-6 py-3.5 font-mono-plaque text-xs tracking-[0.2em] text-[var(--bg-wall)] uppercase transition-all duration-300 hover:border-[var(--accent-gallery)] hover:bg-[var(--accent-gallery)] hover:text-[#FAF9F5] active:scale-[0.99]"
                  >
                    Gửi Yêu Cầu Thiết Kế Theo Phong Cách Này
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Architectural Footer with Subtle Lock Icon at the end */}
      <footer className="border-t border-[var(--border-hairline)] bg-[var(--bg-plaque)] py-8">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-4 px-4 font-mono-plaque text-[11px] tracking-[0.16em] text-[var(--text-muted)] uppercase sm:flex-row sm:items-center sm:px-10 lg:px-16">
          <span>{siteSettings.footerCopyright}</span>
          <div className="flex items-center gap-4">
            <span>ALL RIGHTS RESERVED</span>
            <button
              type="button"
              onClick={onOpenAdmin}
              title="Cổng Quản Trị Viên (/admin · Phím tắt Ctrl + Shift + A)"
              aria-label="Mở trang quản trị viên (/admin)"
              className="flex h-7 w-7 items-center justify-center border border-transparent text-[var(--text-muted)]/45 transition-all duration-300 hover:border-[var(--border-hairline)] hover:text-[var(--accent-gallery)]"
            >
              <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Action Bar (One-Handed Thumb Reach for Sub-Page) */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-strong)] bg-[var(--bg-glass)] px-3 pt-2.5 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2 pb-1">
          <button
            type="button"
            onClick={onBackToHall}
            className="flex min-h-[44px] items-center justify-center gap-1.5 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3.5 font-mono-plaque text-[10px] tracking-[0.14em] text-[var(--text-primary)] uppercase active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>← Sảnh Tranh</span>
          </button>

          <button
            type="button"
            onClick={scrollToCommissionForm}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-3 font-mono-plaque text-[10px] tracking-[0.15em] text-[#FAF9F5] uppercase active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span className="truncate">Đặt Thiết Kế Phong Cách Này</span>
          </button>
        </div>
      </div>

      {/* High-Res Multi-Touch & Desktop Lightbox Modal */}
      <LightboxModal
        images={project.galleryImages}
        activeIndex={lightboxIndex}
        projectTitle={project.title}
        exhibitNumber={project.exhibitNumber}
        onClose={() => setLightboxIndex(null)}
        onChangeIndex={(idx) => setLightboxIndex(idx)}
      />
    </motion.div>
  );
};
