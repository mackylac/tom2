import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  LampCeiling,
  Lock,
  SunMedium,
} from 'lucide-react';
import { MobileBottomDock } from '../components/MobileBottomDock';
import { PhysicalFrame } from '../components/PhysicalFrame';
import { usePortfolio } from '../context/PortfolioContext';
import type { CategoryFilter } from '../types/portfolio';

interface ExhibitionHallProps {
  onSelectProject: (projectId: string) => void;
  onOpenAdmin: () => void;
}

export const ExhibitionHall: React.FC<ExhibitionHallProps> = ({
  onSelectProject,
  onOpenAdmin,
}) => {
  const {
    visibleProjects,
    siteSettings,
    lightingMode,
    toggleLightingMode,
    activeCategory,
    setActiveCategory,
  } = usePortfolio();

  const filterBarRef = useRef<HTMLElement>(null);
  const commissionSectionRef = useRef<HTMLElement>(null);
  const [activeMobileSection, setActiveMobileSection] = useState<
    'hall' | 'filter' | 'contact'
  >('hall');

  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryCategory, setInquiryCategory] = useState(
    () => siteSettings.categories[0] ?? 'Branding & Identity'
  );
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySubmitted, setInquirySubmitted] = useState(false);

  const dynamicFilterTabs = useMemo<CategoryFilter[]>(
    () => ['All Works', ...siteSettings.categories],
    [siteSettings.categories]
  );

  // Compute live count per category from visibleProjects
  const categoryCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {
      'All Works': visibleProjects.length,
    };
    for (const cat of siteSettings.categories) {
      counts[cat] = 0;
    }
    for (const p of visibleProjects) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return counts;
  }, [visibleProjects, siteSettings.categories]);

  const filteredProjects = useMemo(() => {
    if (activeCategory === 'All Works') return visibleProjects;
    return visibleProjects.filter((p) => p.category === activeCategory);
  }, [visibleProjects, activeCategory]);

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryEmail.trim()) return;
    setInquirySubmitted(true);
  };

  const scrollToTopHall = () => {
    setActiveMobileSection('hall');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToFilterBar = () => {
    setActiveMobileSection('filter');
    filterBarRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const scrollToContact = () => {
    setActiveMobileSection('contact');
    commissionSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-wall)] text-[var(--text-primary)]">
      {/* Adaptive Top Gallery Navigation Bar (Pure Visitor Exhibition Experience) */}
      <header className="pt-safe sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-glass)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:h-18 sm:px-10 lg:px-16">
          {/* Studio Identity & Brand Avatar (Editable from /admin) */}
          <div className="flex items-center gap-4">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                scrollToTopHall();
              }}
              className="group flex items-center gap-3 text-left"
            >
              {siteSettings.showAvatarInHeader !== false &&
                siteSettings.brandAvatar && (
                  <img
                    src={siteSettings.brandAvatar}
                    alt={siteSettings.brandName}
                    className={`h-9 w-9 shrink-0 border border-[var(--border-strong)] object-cover sm:h-10 sm:w-10 ${
                      siteSettings.avatarShape === 'square'
                        ? 'rounded-none'
                        : 'rounded-full'
                    }`}
                  />
                )}
              <div className="flex items-baseline gap-3">
                <span className="whitespace-nowrap font-serif-gallery text-xl font-medium tracking-tight text-[var(--text-primary)] sm:text-3xl">
                  {siteSettings.brandName}
                </span>
                <span className="hidden font-mono-plaque text-[10px] tracking-[0.22em] text-[var(--text-muted)] uppercase lg:inline">
                  {siteSettings.brandSubtitle}
                </span>
              </div>
            </a>
          </div>

          {/* Right Controls: Gallery Lighting Mode + Commission CTA */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Gallery Lighting Mode Switcher */}
            <button
              type="button"
              onClick={toggleLightingMode}
              aria-label="Chuyển đổi chế độ ánh sáng phòng tranh"
              className="flex h-10 shrink-0 items-center gap-2 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-2.5 font-mono-plaque text-[10px] tracking-[0.15em] whitespace-nowrap text-[var(--text-primary)] uppercase transition-all duration-300 hover:border-[var(--accent-gallery)] active:scale-[0.98] sm:px-3.5"
            >
              {lightingMode === 'daylight' ? (
                <>
                  <SunMedium
                    className="h-3.5 w-3.5 text-[var(--accent-gallery)]"
                    strokeWidth={1.5}
                  />
                  <span className="hidden sm:inline">Daylight Paper</span>
                  <span className="text-[var(--text-muted)]">#F7F6F2</span>
                </>
              ) : (
                <>
                  <LampCeiling
                    className="h-3.5 w-3.5 text-[var(--accent-gallery)]"
                    strokeWidth={1.5}
                  />
                  <span className="hidden sm:inline">Spotlight Velvet</span>
                  <span className="text-[var(--text-muted)]">#0E0E0E</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={scrollToContact}
              className="hidden h-10 shrink-0 items-center gap-2 border border-[var(--text-primary)] bg-[var(--text-primary)] px-3.5 font-mono-plaque text-[10px] tracking-[0.16em] whitespace-nowrap text-[var(--bg-wall)] uppercase transition-all duration-300 hover:border-[var(--accent-gallery)] hover:bg-[var(--accent-gallery)] hover:text-[#FAF9F5] sm:flex"
            >
              <span>Đặt Lịch Tư Vấn</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Exhibition Hall Container */}
      <main id="top" className="mx-auto max-w-[1440px] px-4 sm:px-10 lg:px-16">
        {/* Curatorial Exhibition Hero & Statement (Editable from /admin Tab 3) */}
        <section className="border-b border-[var(--border-hairline)] pt-9 pb-8 sm:pt-12 sm:pb-12 md:pt-20 md:pb-16">
          <div className="grid grid-cols-1 items-end gap-6 sm:gap-8 lg:grid-cols-12">
            <div className="space-y-3 sm:space-y-4 lg:col-span-8">
              <div className="font-mono-plaque text-[10px] tracking-[0.22em] text-[var(--accent-gallery)] uppercase sm:text-[11px]">
                {siteSettings.heroBadge}
              </div>
              <h1 className="font-serif-gallery text-3xl leading-[1.08] font-normal tracking-tight text-[var(--text-primary)] sm:text-6xl lg:text-[68px] lg:leading-[1.06]">
                {siteSettings.heroTitlePrefix}{' '}
                <span className="font-normal text-[var(--accent-gallery)] italic">
                  {siteSettings.heroTitleAccent}
                </span>{' '}
                {siteSettings.heroTitleSuffix}
              </h1>
            </div>

            <div className="space-y-3 border-l border-[var(--border-hairline)] pl-4 sm:space-y-4 sm:pl-5 lg:col-span-4">
              <p className="font-sans-gallery text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
                {siteSettings.heroManifesto}
              </p>
              <div className="flex items-center justify-between font-mono-plaque text-[10px] tracking-[0.18em] text-[var(--text-muted)] uppercase">
                <span>
                  EXHIBITS ON WALL:{' '}
                  {String(visibleProjects.length).padStart(2, '0')}
                </span>
                <span>LIGHTING: {lightingMode.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Adaptive Category Filter Bar: Touch Horizontal Scroll-Snap on Mobile, Flex Wrap on Desktop */}
          <nav
            ref={filterBarRef}
            aria-label="Bộ lọc danh mục tác phẩm"
            className="no-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory items-center gap-2 overflow-x-auto border-t border-[var(--border-hairline)] px-4 pt-5 sm:mx-0 sm:mt-10 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pt-6"
          >
            {dynamicFilterTabs.map((category) => {
              const isActive = activeCategory === category;
              const count = categoryCounts[category] ?? 0;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setActiveCategory(category);
                    setActiveMobileSection('hall');
                  }}
                  className={`group flex min-h-[42px] shrink-0 snap-start items-center gap-2.5 border px-3.5 py-2 font-mono-plaque text-[10.5px] tracking-[0.15em] whitespace-nowrap uppercase transition-all duration-300 active:scale-[0.98] sm:px-4 sm:py-2.5 sm:text-[11px] ${
                    isActive
                      ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-wall)]'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-plaque)] text-[var(--text-secondary)] hover:border-[var(--accent-gallery)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{category}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] ${
                      isActive
                        ? 'bg-[var(--bg-wall)]/20 text-[var(--bg-wall)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    {String(count).padStart(2, '0')}
                  </span>
                </button>
              );
            })}
          </nav>
        </section>

        {/* Adaptive Gallery Wall:
            - Mobile: 1-Column vertical feed with generous viewport framing
            - Desktop: 2-Column staggered gallery wall (Each Frame = Strictly 01 Cover Image) */}
        <section
          aria-label="Danh sách khung tranh dự án"
          className="py-12 sm:py-16 md:py-24"
        >
          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-x-14 gap-y-14 sm:gap-y-20 md:grid-cols-2 lg:gap-x-24 lg:gap-y-28">
              <AnimatePresence mode="popLayout">
                {filteredProjects.map((project, index) => (
                  <PhysicalFrame
                    key={project.id}
                    project={project}
                    index={index}
                    lightingMode={lightingMode}
                    onSelectProject={onSelectProject}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-12 text-center sm:p-16">
              <p className="font-serif-gallery text-2xl text-[var(--text-secondary)]">
                Chưa có tác phẩm nào đang hiển thị trong danh mục “
                {activeCategory}”.
              </p>
              <button
                type="button"
                onClick={() => setActiveCategory('All Works')}
                className="mt-4 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-5 py-2.5 font-mono-plaque text-xs tracking-[0.16em] text-[#FAF9F5] uppercase"
              >
                Xem Tất Cả Tác Phẩm
              </button>
            </div>
          )}
        </section>

        {/* Bottom Curatorial Inquiry & Commission Section (Editable from /admin Tab 3) */}
        <section
          ref={commissionSectionRef}
          id="commission-hall"
          className="border-t border-[var(--border-hairline)] py-16 sm:py-20 md:py-28"
        >
          <div className="grid grid-cols-1 gap-10 sm:gap-12 lg:grid-cols-12">
            <div className="space-y-5 sm:space-y-6 lg:col-span-5">
              <div className="font-mono-plaque text-[11px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                {siteSettings.commissionBadge}
              </div>
              <h2 className="font-serif-gallery text-3xl leading-[1.1] font-normal tracking-tight text-[var(--text-primary)] sm:text-5xl">
                {siteSettings.commissionTitle}
              </h2>
              <p className="font-sans-gallery text-sm leading-relaxed text-[var(--text-secondary)]">
                {siteSettings.commissionDescription}
              </p>

              {/* Curator Profile & Avatar Plaque */}
              {siteSettings.brandAvatar && (
                <div className="flex items-center gap-3.5 border-t border-[var(--border-hairline)] pt-5">
                  <img
                    src={siteSettings.brandAvatar}
                    alt={siteSettings.curatorName || siteSettings.brandName}
                    className={`h-13 w-13 shrink-0 border border-[var(--border-strong)] object-cover ${
                      siteSettings.avatarShape === 'square'
                        ? 'rounded-none'
                        : 'rounded-full'
                    }`}
                  />
                  <div>
                    <div className="font-mono-plaque text-[9.5px] tracking-[0.18em] text-[var(--accent-gallery)] uppercase">
                      CURATOR & ART DIRECTION
                    </div>
                    <div className="font-serif-gallery text-lg font-medium text-[var(--text-primary)]">
                      {siteSettings.curatorName || siteSettings.brandName}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2.5 border-t border-[var(--border-hairline)] pt-5 font-mono-plaque text-xs text-[var(--text-muted)]">
                <div>DIRECT CURATOR: {siteSettings.contactEmail}</div>
                <div>HOTLINE / ZALO: {siteSettings.contactPhoneZalo}</div>
                <div>GALLERY HOURS: {siteSettings.galleryHours}</div>
                <div>DISTRICTS: {siteSettings.studioLocations}</div>
              </div>

              {/* Social Links */}
              <div className="flex flex-wrap items-center gap-3 pt-2 font-mono-plaque text-[10px] tracking-[0.18em] uppercase">
                {siteSettings.socialLinks.behance && (
                  <a
                    href={siteSettings.socialLinks.behance}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-gallery)] hover:text-[var(--text-primary)]"
                  >
                    Behance ↗
                  </a>
                )}
                {siteSettings.socialLinks.instagram && (
                  <a
                    href={siteSettings.socialLinks.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-gallery)] hover:text-[var(--text-primary)]"
                  >
                    Instagram ↗
                  </a>
                )}
                {siteSettings.socialLinks.linkedin && (
                  <a
                    href={siteSettings.socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-gallery)] hover:text-[var(--text-primary)]"
                  >
                    LinkedIn ↗
                  </a>
                )}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-5 sm:p-10">
                {inquirySubmitted ? (
                  <div className="space-y-4 py-8">
                    <div className="flex items-center gap-3 text-[var(--accent-gallery)]">
                      <CheckCircle2 className="h-6 w-6" strokeWidth={1.5} />
                      <span className="font-mono-plaque text-xs tracking-[0.18em] uppercase">
                        YÊU CẦU TƯ VẤN ĐÃ ĐƯỢC GHI NHẬN
                      </span>
                    </div>
                    <h3 className="font-serif-gallery text-3xl text-[var(--text-primary)]">
                      Cảm ơn {inquiryName}. Hồ sơ đặt lịch của bạn đã được chuyển tới Giám đốc Nghệ thuật.
                    </h3>
                    <p className="font-sans-gallery text-sm text-[var(--text-secondary)]">
                      Chúng tôi sẽ phản hồi qua địa chỉ {inquiryEmail} trong vòng 24 giờ làm việc kèm danh mục chất liệu mẫu phù hợp với hạng mục {inquiryCategory}.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setInquirySubmitted(false);
                        setInquiryName('');
                        setInquiryEmail('');
                        setInquiryMessage('');
                      }}
                      className="border border-[var(--border-strong)] px-4 py-2 font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-primary)] uppercase hover:border-[var(--accent-gallery)]"
                    >
                      Gửi Yêu Cầu Khác
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleInquirySubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label
                          htmlFor="hall-inquiry-name"
                          className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase"
                        >
                          Họ Tên / Người Đại Diện
                        </label>
                        <input
                          id="hall-inquiry-name"
                          type="text"
                          required
                          value={inquiryName}
                          onChange={(e) => setInquiryName(e.target.value)}
                          placeholder="Nguyễn Minh Khuê"
                          className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="hall-inquiry-email"
                          className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase"
                        >
                          Email Liên Hệ
                        </label>
                        <input
                          id="hall-inquiry-email"
                          type="email"
                          required
                          value={inquiryEmail}
                          onChange={(e) => setInquiryEmail(e.target.value)}
                          placeholder="khue@brand.example"
                          className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="hall-inquiry-category"
                        className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase"
                      >
                        Hạng Mục Quan Tâm
                      </label>
                      <select
                        id="hall-inquiry-category"
                        value={inquiryCategory}
                        onChange={(e) => setInquiryCategory(e.target.value)}
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      >
                        {siteSettings.categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="hall-inquiry-message"
                        className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase"
                      >
                        Tóm Tắt Dự Án & Kỳ Vọng Thẩm Mỹ
                      </label>
                      <textarea
                        id="hall-inquiry-message"
                        rows={4}
                        value={inquiryMessage}
                        onChange={(e) => setInquiryMessage(e.target.value)}
                        placeholder="Chia sẻ ngắn gọn về thương hiệu, quy mô sản phẩm và thời điểm dự kiến ra mắt..."
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] p-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full border border-[var(--text-primary)] bg-[var(--text-primary)] px-6 py-3.5 font-mono-plaque text-xs tracking-[0.2em] text-[var(--bg-wall)] uppercase transition-all duration-300 hover:border-[var(--accent-gallery)] hover:bg-[var(--accent-gallery)] hover:text-[#FAF9F5] active:scale-[0.99]"
                    >
                      Đặt Lịch Tư Vấn Thiết Kế
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Architectural Footer with Subtle Lock Icon at the very end for /admin access */}
      <footer className="border-t border-[var(--border-hairline)] bg-[var(--bg-plaque)] pt-8 pb-28 md:pb-8">
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

      {/* Mobile Floating Bottom Dock (One-Handed Thumb Navigation) */}
      <MobileBottomDock
        activeSection={activeMobileSection}
        onJumpToHall={scrollToTopHall}
        onJumpToFilter={scrollToFilterBar}
        onJumpToContact={scrollToContact}
      />
    </div>
  );
};
