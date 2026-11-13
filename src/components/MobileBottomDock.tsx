import React from 'react';
import { Filter, Frame, LampCeiling, Mail, SunMedium } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';

interface MobileBottomDockProps {
  activeSection: 'hall' | 'filter' | 'contact';
  onJumpToHall: () => void;
  onJumpToFilter: () => void;
  onJumpToContact: () => void;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  activeSection,
  onJumpToHall,
  onJumpToFilter,
  onJumpToContact,
}) => {
  const { lightingMode, toggleLightingMode } = usePortfolio();

  return (
    <nav
      aria-label="Thanh điều hướng nổi di động (Thumb-Zone Dock)"
      className="bottom-safe-offset fixed inset-x-3 z-40 mx-auto max-w-md md:hidden"
    >
      <div className="grid grid-cols-4 items-center border border-[var(--border-strong)] bg-[var(--bg-plaque)]/95 p-1 shadow-2xl backdrop-blur-md">
        {/* 1. Sảnh Tranh */}
        <button
          type="button"
          onClick={onJumpToHall}
          className={`flex min-h-12 flex-col items-center justify-center gap-1 px-1 py-1.5 transition-all active:scale-95 ${
            activeSection === 'hall'
              ? 'font-medium text-[var(--accent-gallery)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <Frame className="h-4 w-4" strokeWidth={1.6} />
          <span className="font-mono-plaque text-[9px] tracking-wider uppercase">
            Sảnh Tranh
          </span>
        </button>

        {/* 2. Bộ Lọc */}
        <button
          type="button"
          onClick={onJumpToFilter}
          className={`flex min-h-12 flex-col items-center justify-center gap-1 px-1 py-1.5 transition-all active:scale-95 ${
            activeSection === 'filter'
              ? 'font-medium text-[var(--accent-gallery)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <Filter className="h-4 w-4" strokeWidth={1.6} />
          <span className="font-mono-plaque text-[9px] tracking-wider uppercase">
            Bộ Lọc
          </span>
        </button>

        {/* 3. Đổi Ánh Sáng */}
        <button
          type="button"
          onClick={toggleLightingMode}
          aria-label="Đổi chế độ ánh sáng phòng tranh"
          className="flex min-h-12 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[var(--text-primary)] transition-all active:scale-95"
        >
          {lightingMode === 'daylight' ? (
            <SunMedium
              className="h-4 w-4 text-[var(--accent-gallery)]"
              strokeWidth={1.6}
            />
          ) : (
            <LampCeiling
              className="h-4 w-4 text-[var(--accent-gallery)]"
              strokeWidth={1.6}
            />
          )}
          <span className="font-mono-plaque text-[9px] tracking-wider uppercase">
            {lightingMode === 'daylight' ? 'Đèn Sáng' : 'Đèn Rọi'}
          </span>
        </button>

        {/* 4. Liên Hệ */}
        <button
          type="button"
          onClick={onJumpToContact}
          className={`flex min-h-12 flex-col items-center justify-center gap-1 px-1 py-1.5 transition-all active:scale-95 ${
            activeSection === 'contact'
              ? 'font-medium text-[var(--accent-gallery)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          <Mail className="h-4 w-4" strokeWidth={1.6} />
          <span className="font-mono-plaque text-[9px] tracking-wider uppercase">
            Liên Hệ
          </span>
        </button>
      </div>
    </nav>
  );
};
