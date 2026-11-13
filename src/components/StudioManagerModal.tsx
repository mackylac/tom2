import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Download,
  FileJson,
  FolderPlus,
  ImagePlus,
  Layers,
  ListFilter,
  PenSquare,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import {
  processUploadedImageFile,
  probeImageUrlDimensions,
} from '../services/portfolioStorageService';
import {
  FRAME_MATERIAL_LABELS,
  type FrameMaterial,
  type GalleryImage,
  type LayoutOverride,
  type MatboardTone,
  PROJECT_CATEGORIES,
  type Project,
  type ProjectCategory,
} from '../types/portfolio';

function getAutoLayoutPreviewTag(img: GalleryImage): string {
  const w = img.width ?? 1400;
  const h = img.height ?? 1000;
  const ar = w / Math.max(h, 1);
  if (img.layoutOverride === 'full')
    return `Ép tràn viền 100% (AR ${ar.toFixed(2)})`;
  if (img.layoutOverride === 'half')
    return `Ép ghép đôi 50/50 (AR ${ar.toFixed(2)})`;
  if (ar >= 1.65) return `Auto: Panorama 100% (AR ${ar.toFixed(2)})`;
  if (ar <= 0.9) return `Auto: Ghép đôi dọc 50/50 (AR ${ar.toFixed(2)})`;
  return `Auto: Justified Row (AR ${ar.toFixed(2)})`;
}

export const StudioManagerModal: React.FC = () => {
  const {
    projects,
    isStudioManagerOpen,
    closeStudioManager,
    selectedManagerProjectId,
    setSelectedManagerProjectId,
    addProject,
    updateProject,
    deleteProject,
    resetToSeedData,
    exportPortfolioJson,
    importPortfolioJson,
  } = usePortfolio();

  const draft =
    projects.find((p) => p.id === selectedManagerProjectId) ??
    projects[0] ??
    null;

  const [newGalleryUrl, setNewGalleryUrl] = useState<string>('');
  const [newGalleryCaption, setNewGalleryCaption] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  // Mobile Bottom Sheet tab switcher: 'list' (Project List) or 'editor' (Project Editor)
  const [mobilePane, setMobilePane] = useState<'list' | 'editor'>('editor');

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFilesInputRef = useRef<HTMLInputElement>(null);
  const importJsonInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    window.setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 3600);
  };

  if (!isStudioManagerOpen) {
    return null;
  }

  const handleFieldChange = <K extends keyof Project>(
    key: K,
    value: Project[K]
  ) => {
    if (!draft) return;
    const updated: Project = {
      ...draft,
      [key]: value,
    };
    updateProject(updated);
  };

  const handleCreateNewProject = () => {
    const nextNumber = String(projects.length + 1).padStart(2, '0');
    const timestamp = Date.now().toString(36);
    const newProj: Project = {
      id: `exhibit-${timestamp}`,
      exhibitNumber: nextNumber,
      title: `Dự Án Triển Lãm Mới № ${nextNumber}`,
      subtitle: 'Visual Identity & Archival Monograph System',
      client: 'Atelier Private Commission',
      category: 'Branding & Identity',
      year: '2026',
      role: 'Art Direction · Identity Design · Print Production',
      deliverables: [
        'Brand Identity',
        'Packaging System',
        'Editorial Guidelines',
      ],
      frameStyle: 'gallery-oak',
      matboardTone: 'ivory',
      coverImage:
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&h=1500&q=85',
      coverAspect: 'portrait',
      location: 'Hồ Chí Minh · Kyoto',
      curatorialStatement:
        'Tác phẩm trưng bày mới được khởi tạo từ Studio Manager CMS. Bạn có thể thay đổi ảnh bìa khung tranh và tải lên bộ ảnh trang con để hệ thống tự động căn chỉnh.',
      conceptNarrative:
        'Ngôn ngữ thiết kế tập trung vào tỷ lệ vàng, chất liệu giấy mỹ thuật tự nhiên và khoảng trắng tĩnh lặng của không gian bảo tàng.',
      executionDetails:
        'Ứng dụng kỹ thuật in dập chìm trên giấy cotton 400gsm kết hợp hệ thống lưới biên tập chuẩn xác.',
      galleryImages: [
        {
          id: `img-${timestamp}-1`,
          url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1920&h=1000&q=85',
          caption: 'Ảnh toàn cảnh Panorama tràn viền (1920×1000 · AR 1.92:1).',
          width: 1920,
          height: 1000,
          layoutOverride: 'auto',
        },
        {
          id: `img-${timestamp}-2`,
          url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&h=1200&q=85',
          caption: 'Ấn phẩm dọc số 01 tự động ghép đôi (900×1200 · AR 0.75:1).',
          width: 900,
          height: 1200,
          layoutOverride: 'auto',
        },
        {
          id: `img-${timestamp}-3`,
          url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&h=1200&q=85',
          caption: 'Ấn phẩm dọc số 02 tự động ghép đôi (900×1200 · AR 0.75:1).',
          width: 900,
          height: 1200,
          layoutOverride: 'auto',
        },
      ],
    };

    addProject(newProj);
    setMobilePane('editor');
    showToast(`Đã tạo mới "${newProj.title}" và lưu tự động.`);
  };

  const handleCoverFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !draft) return;
    setIsUploading(true);
    try {
      const { dataUrl, width, height } = await processUploadedImageFile(file);
      const ar = width / Math.max(height, 1);
      const inferredAspect: Project['coverAspect'] =
        ar < 0.92 ? 'portrait' : ar > 1.15 ? 'landscape' : 'square';

      const updated: Project = {
        ...draft,
        coverImage: dataUrl,
        coverAspect: inferredAspect,
      };
      updateProject(updated);
      showToast(
        `Đã cập nhật Ảnh Bìa Khung Tranh (${width}×${height}px · ${inferredAspect}).`
      );
    } catch {
      showToast('Không thể xử lý file ảnh bìa.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleBulkGalleryFilesUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !draft) return;
    setIsUploading(true);
    try {
      const uploadedItems: GalleryImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { dataUrl, width, height } = await processUploadedImageFile(file);
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ');
        uploadedItems.push({
          id: `plate-${Date.now()}-${i}`,
          url: dataUrl,
          caption: `Bản vẽ / Hình ảnh thực tế: ${cleanName} (${width}×${height}px)`,
          width,
          height,
          layoutOverride: 'auto',
        });
      }

      const updated: Project = {
        ...draft,
        galleryImages: [...draft.galleryImages, ...uploadedItems],
      };
      updateProject(updated);
      showToast(
        `Đã tải lên ${uploadedItems.length} ảnh mới. SmartGalleryGrid đã tự động phân tích tỷ lệ khung hình!`
      );
    } catch {
      showToast('Có lỗi khi tải lên danh sách ảnh.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddGalleryUrl = async () => {
    if (!draft || !newGalleryUrl.trim()) return;
    setIsUploading(true);
    const cleanUrl = newGalleryUrl.trim();
    const dims = await probeImageUrlDimensions(cleanUrl);
    const newItem: GalleryImage = {
      id: `plate-${Date.now()}`,
      url: cleanUrl,
      caption:
        newGalleryCaption.trim() ||
        `Tư liệu trưng bày dự án ${draft.title} (${dims.width}×${dims.height}px)`,
      width: dims.width,
      height: dims.height,
      layoutOverride: 'auto',
    };

    const updated: Project = {
      ...draft,
      galleryImages: [...draft.galleryImages, newItem],
    };
    updateProject(updated);
    setNewGalleryUrl('');
    setNewGalleryCaption('');
    setIsUploading(false);
    showToast(
      `Đã thêm ảnh mới (${dims.width}×${dims.height}px) vào phòng trưng bày dự án.`
    );
  };

  const handleMoveGalleryImage = (index: number, direction: -1 | 1) => {
    if (!draft) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draft.galleryImages.length) return;
    const list = [...draft.galleryImages];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);
    handleFieldChange('galleryImages', list);
  };

  const handleRemoveGalleryImage = (imageId: string) => {
    if (!draft) return;
    const list = draft.galleryImages.filter((img) => img.id !== imageId);
    handleFieldChange('galleryImages', list);
    showToast('Đã xoá ảnh khỏi trang con dự án.');
  };

  const handleUpdateGalleryItem = (
    imageId: string,
    patch: Partial<GalleryImage>
  ) => {
    if (!draft) return;
    const list = draft.galleryImages.map((img) =>
      img.id === imageId ? { ...img, ...patch } : img
    );
    handleFieldChange('galleryImages', list);
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importPortfolioJson(String(reader.result));
      showToast(result.message);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <AnimatePresence>
      <motion.div
        key="studio-manager-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-xs md:items-center md:p-6"
      >
        {/* Adaptive Container: Bottom Sheet on Mobile, Wide Center Modal on Desktop */}
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 36, scale: 0.99 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Studio Manager CMS"
          className="pb-safe flex h-[93dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border-strong)] bg-[var(--bg-wall)] text-[var(--text-primary)] shadow-2xl md:h-[90dvh] md:rounded-none"
        >
          {/* Mobile Bottom Sheet Pill Handle */}
          <div className="flex justify-center bg-[var(--bg-plaque)] pt-2.5 pb-1 md:hidden">
            <div className="h-1 w-11 rounded-full bg-[var(--border-strong)]" />
          </div>

          {/* Top CMS Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-4 py-3 sm:px-5 sm:py-4">
            <div>
              <div className="flex items-center gap-2 font-mono-plaque text-[9.5px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase sm:text-[10px]">
                <Layers className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>CURATORIAL ARCHIVE & AUTO-LAYOUT CMS</span>
              </div>
              <h2 className="font-serif-gallery text-xl font-normal tracking-tight sm:text-2xl">
                Studio Manager — Quản Trị Phòng Tranh
              </h2>
            </div>

            {/* Global Persistence Controls: Export JSON / Import JSON / Reset / Close */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <input
                ref={importJsonInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportJsonFile}
                className="hidden"
              />

              <button
                type="button"
                onClick={exportPortfolioJson}
                className="flex h-9 items-center gap-1.5 border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-2.5 font-mono-plaque text-[10px] tracking-[0.14em] text-[var(--text-primary)] uppercase transition-colors hover:border-[var(--accent-gallery)] hover:bg-[var(--accent-gallery)] hover:text-[#FAF9F5] sm:px-3"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">Export portfolio-data.json</span>
                <span className="sm:hidden">Export JSON</span>
              </button>

              <button
                type="button"
                onClick={() => importJsonInputRef.current?.click()}
                className="flex h-9 items-center gap-1.5 border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-2.5 font-mono-plaque text-[10px] tracking-[0.14em] text-[var(--text-primary)] uppercase transition-colors hover:border-[var(--accent-gallery)] sm:px-3"
              >
                <FileJson className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Import JSON</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetToSeedData();
                  showToast('Đã khôi phục 6 dự án mẫu mặc định.');
                }}
                title="Khôi phục 6 dự án mẫu ban đầu"
                className="flex h-9 items-center gap-1.5 border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-2.5 font-mono-plaque text-[10px] tracking-[0.14em] text-[var(--text-muted)] uppercase transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:px-3"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="hidden sm:inline">Khôi Phục Mẫu</span>
              </button>

              <button
                type="button"
                onClick={closeStudioManager}
                aria-label="Đóng Studio Manager"
                className="flex h-9 w-9 items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-wall)] text-[var(--text-primary)] transition-colors hover:border-[var(--accent-gallery)] hover:bg-[var(--accent-gallery)] hover:text-[#FAF9F5]"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Mobile View Switcher (Danh Sách Dự Án vs Chỉnh Sửa Chi Tiết) */}
          <div className="grid grid-cols-2 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] md:hidden">
            <button
              type="button"
              onClick={() => setMobilePane('list')}
              className={`flex min-h-[42px] items-center justify-center gap-2 font-mono-plaque text-[10px] tracking-[0.15em] uppercase transition-colors ${
                mobilePane === 'list'
                  ? 'border-b-2 border-[var(--accent-gallery)] bg-[var(--bg-plaque)] font-medium text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Danh Sách ({projects.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMobilePane('editor')}
              className={`flex min-h-[42px] items-center justify-center gap-2 font-mono-plaque text-[10px] tracking-[0.15em] uppercase transition-colors ${
                mobilePane === 'editor'
                  ? 'border-b-2 border-[var(--accent-gallery)] bg-[var(--bg-plaque)] font-medium text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <PenSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Chỉnh Sửa & Tải Ảnh</span>
            </button>
          </div>

          {/* Status Notification Banner */}
          {statusMessage && (
            <div className="flex items-center justify-between border-b border-[var(--accent-gallery)] bg-[var(--accent-gallery-soft)] px-4 py-2 font-mono-plaque text-xs text-[var(--text-primary)] sm:px-5">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-[var(--accent-gallery)]" />
                <span>{statusMessage}</span>
              </div>
              <span className="hidden text-[10px] tracking-widest uppercase opacity-70 sm:inline">
                AUTO-SAVED TO LOCALSTORAGE
              </span>
            </div>
          )}

          {/* Main 2-Pane Body: Left Project List + Right Project Editor */}
          <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
            {/* Left Sidebar: Exhibit List */}
            <aside
              className={`w-full shrink-0 flex-col border-b border-[var(--border-hairline)] bg-[var(--bg-surface)] md:flex md:w-72 md:border-r md:border-b-0 ${
                mobilePane === 'list' ? 'flex flex-1' : 'hidden'
              }`}
            >
              <div className="flex items-center justify-between border-b border-[var(--border-hairline)] p-4">
                <span className="font-mono-plaque text-[11px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                  DANH SÁCH KHUNG TRANH ({projects.length})
                </span>
                <button
                  type="button"
                  onClick={handleCreateNewProject}
                  className="flex min-h-[34px] items-center gap-1.5 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-2.5 py-1 font-mono-plaque text-[10px] tracking-[0.14em] text-[#FAF9F5] uppercase transition-opacity hover:opacity-90"
                >
                  <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>+ Thêm Dự Án</span>
                </button>
              </div>

              <div className="flex-1 divide-y divide-[var(--border-hairline)] overflow-y-auto">
                {projects.map((proj) => {
                  const isSelected = proj.id === draft?.id;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        setSelectedManagerProjectId(proj.id);
                        setMobilePane('editor');
                      }}
                      className={`flex cursor-pointer items-center gap-3 p-3.5 transition-colors ${
                        isSelected
                          ? 'border-l-2 border-l-[var(--accent-gallery)] bg-[var(--bg-plaque)]'
                          : 'hover:bg-[var(--bg-plaque)]/60'
                      }`}
                    >
                      <img
                        src={proj.coverImage}
                        alt={proj.title}
                        className="h-12 w-10 shrink-0 border border-[var(--border-hairline)] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--accent-gallery)] uppercase">
                          EXHIBIT NO. {proj.exhibitNumber}
                        </div>
                        <div className="truncate font-serif-gallery text-base font-medium text-[var(--text-primary)]">
                          {proj.title}
                        </div>
                        <div className="truncate font-sans-gallery text-[11px] text-[var(--text-muted)]">
                          {proj.category} · {proj.galleryImages.length} ảnh con
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Right Pane: Detailed Editor */}
            {draft ? (
              <div
                className={`flex-1 space-y-8 overflow-y-auto p-4 sm:p-8 ${
                  mobilePane === 'editor' ? 'block' : 'hidden md:block'
                }`}
              >
                {/* Section 1: Metadata & Frame Material */}
                <section className="space-y-5 border-b border-[var(--border-hairline)] pb-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                        PHẦN 01 · THÔNG TIN TÁC PHẨM & CHẤT LIỆU KHUNG TRANH
                      </span>
                      <h3 className="font-serif-gallery text-xl sm:text-2xl">
                        Exhibit No. {draft.exhibitNumber} — {draft.title}
                      </h3>
                    </div>

                    {projects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const removedTitle = draft.title;
                          deleteProject(draft.id);
                          showToast(`Đã xoá dự án "${removedTitle}".`);
                        }}
                        className="flex items-center gap-1.5 border border-red-800/40 bg-red-950/10 px-3 py-1.5 font-mono-plaque text-[10px] tracking-[0.15em] text-red-600 uppercase transition-colors hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>Xoá Dự Án Này</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Tên Dự Án (Project Title)
                      </label>
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(e) =>
                          handleFieldChange('title', e.target.value)
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Khách Hàng (Client)
                      </label>
                      <input
                        type="text"
                        value={draft.client}
                        onChange={(e) =>
                          handleFieldChange('client', e.target.value)
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Hạng Mục (Category)
                      </label>
                      <select
                        value={draft.category}
                        onChange={(e) =>
                          handleFieldChange(
                            'category',
                            e.target.value as ProjectCategory
                          )
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      >
                        {PROJECT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Năm Thực Hiện (Year)
                      </label>
                      <input
                        type="text"
                        value={draft.year}
                        onChange={(e) =>
                          handleFieldChange('year', e.target.value)
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Chất Liệu Viền Khung (Frame Molding)
                      </label>
                      <select
                        value={draft.frameStyle}
                        onChange={(e) =>
                          handleFieldChange(
                            'frameStyle',
                            e.target.value as FrameMaterial
                          )
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      >
                        {(
                          Object.keys(FRAME_MATERIAL_LABELS) as FrameMaterial[]
                        ).map((mat) => (
                          <option key={mat} value={mat}>
                            {FRAME_MATERIAL_LABELS[mat].name} —{' '}
                            {FRAME_MATERIAL_LABELS[mat].vietnamese}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Lớp Bo Giấy Mỹ Thuật (Matboard)
                      </label>
                      <select
                        value={draft.matboardTone}
                        onChange={(e) =>
                          handleFieldChange(
                            'matboardTone',
                            e.target.value as MatboardTone
                          )
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      >
                        <option value="ivory">
                          Trắng Kem Bảo Tàng (#FAF9F5)
                        </option>
                        <option value="charcoal">
                          Xám Than Đương Đại (#181818)
                        </option>
                        <option value="auto">
                          Tự Động Theo Đèn Phòng Tranh
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Vai Trò (Role)
                      </label>
                      <input
                        type="text"
                        value={draft.role}
                        onChange={(e) =>
                          handleFieldChange('role', e.target.value)
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Hạng Mục Bàn Giao (Deliverables — cách nhau dấu phẩy)
                      </label>
                      <input
                        type="text"
                        value={draft.deliverables.join(', ')}
                        onChange={(e) =>
                          handleFieldChange(
                            'deliverables',
                            e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean)
                          )
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                      Lời Tựa Giám Tuyển (Curatorial Summary)
                    </label>
                    <textarea
                      rows={2}
                      value={draft.curatorialStatement}
                      onChange={(e) =>
                        handleFieldChange('curatorialStatement', e.target.value)
                      }
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Ý Tưởng Thiết Kế (Concept Narrative)
                      </label>
                      <textarea
                        rows={3}
                        value={draft.conceptNarrative}
                        onChange={(e) =>
                          handleFieldChange('conceptNarrative', e.target.value)
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Chế Tác & Hoàn Thiện (Execution Details)
                      </label>
                      <textarea
                        rows={3}
                        value={draft.executionDetails}
                        onChange={(e) =>
                          handleFieldChange('executionDetails', e.target.value)
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>
                  </div>
                </section>

                {/* Section 2: Cover Image for Main Exhibition Hall Frame */}
                <section className="space-y-4 border-b border-[var(--border-hairline)] pb-8">
                  <div>
                    <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                      PHẦN 02 · ẢNH BÌA DUY NHẤT TRONG KHUNG TRANH SẢNH CHÍNH (COVER IMAGE)
                    </span>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Quy tắc bảo tàng: Mỗi khung tranh ngoài Sảnh Triển Lãm Chính chỉ hiển thị duy nhất 01 Ảnh Bìa đại diện này.
                    </p>
                  </div>

                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="w-36 shrink-0 border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2 sm:w-40">
                      <img
                        src={draft.coverImage}
                        alt="Cover Preview"
                        className="aspect-[4/5] w-full object-cover"
                      />
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="space-y-1.5">
                        <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                          Đường Dẫn Ảnh Bìa (URL hoặc Base64)
                        </label>
                        <input
                          type="text"
                          value={draft.coverImage}
                          onChange={(e) =>
                            handleFieldChange('coverImage', e.target.value)
                          }
                          placeholder="https://..."
                          className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          ref={coverFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCoverFileUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => coverFileInputRef.current?.click()}
                          className="flex min-h-[38px] items-center gap-2 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-4 py-2 font-mono-plaque text-[11px] tracking-[0.15em] text-[#FAF9F5] uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                          <span>Tải Ảnh Bìa Từ Thiết Bị</span>
                        </button>

                        <select
                          value={draft.coverAspect}
                          onChange={(e) =>
                            handleFieldChange(
                              'coverAspect',
                              e.target.value as Project['coverAspect']
                            )
                          }
                          aria-label="Tỷ lệ khung ảnh bìa"
                          className="min-h-[38px] border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-2 font-mono-plaque text-[11px] text-[var(--text-primary)] uppercase focus:border-[var(--accent-gallery)] focus:outline-none"
                        >
                          <option value="portrait">Khung Dọc (4:5)</option>
                          <option value="landscape">Khung Ngang (4:3)</option>
                          <option value="square">Khung Vuông (1:1)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section 3: Sub-Page Gallery Images & Smart Auto-Layout Controls */}
                <section className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                        PHẦN 03 · DANH SÁCH ẢNH TRANG CON ({draft.galleryImages.length} PLATES)
                      </span>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Tải lên hàng loạt ảnh có kích thước bất kỳ — Bộ máy SmartGalleryGrid sẽ tự động đọc kích thước gốc để dàn trang thích ứng trên cả Desktop và Mobile.
                      </p>
                    </div>

                    <div>
                      <input
                        ref={galleryFilesInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleBulkGalleryFilesUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => galleryFilesInputRef.current?.click()}
                        className="flex min-h-[38px] items-center gap-2 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-4 py-2 font-mono-plaque text-[11px] tracking-[0.15em] text-[#FAF9F5] uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
                        <span>+ Tải Lên Hàng Loạt Ảnh</span>
                      </button>
                    </div>
                  </div>

                  {/* Add Image by URL Bar */}
                  <div className="grid grid-cols-1 gap-3 border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:grid-cols-12">
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={newGalleryUrl}
                        onChange={(e) => setNewGalleryUrl(e.target.value)}
                        placeholder="Dán đường dẫn ảnh mới (https://...)"
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        value={newGalleryCaption}
                        onChange={(e) => setNewGalleryCaption(e.target.value)}
                        placeholder="Chú thích bản vẽ / hình ảnh (tuỳ chọn)"
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        disabled={isUploading || !newGalleryUrl.trim()}
                        onClick={handleAddGalleryUrl}
                        className="h-full min-h-[36px] w-full border border-[var(--border-strong)] bg-[var(--bg-plaque)] px-3 py-2 font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-primary)] uppercase transition-colors hover:border-[var(--accent-gallery)] hover:bg-[var(--accent-gallery)] hover:text-[#FAF9F5] disabled:opacity-40"
                      >
                        Thêm URL
                      </button>
                    </div>
                  </div>

                  {/* Gallery Images List */}
                  <div className="space-y-3">
                    {draft.galleryImages.map((img, idx) => (
                      <div
                        key={img.id}
                        className="flex flex-col gap-4 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-3.5 sm:flex-row sm:items-center"
                      >
                        <div className="relative h-20 w-28 shrink-0 overflow-hidden border border-[var(--border-hairline)] bg-neutral-900">
                          <img
                            src={img.url}
                            alt={img.caption}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute top-1 left-1 bg-black/75 px-1.5 py-0.5 font-mono-plaque text-[9px] text-[#C8A97E]">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-[var(--accent-gallery-soft)] px-2 py-0.5 font-mono-plaque text-[10px] tracking-wider text-[var(--accent-gallery)] uppercase">
                              {getAutoLayoutPreviewTag(img)}
                            </span>
                            {img.width && img.height && (
                              <span className="font-mono-plaque text-[10px] text-[var(--text-muted)]">
                                Kích thước gốc: {img.width}×{img.height}px
                              </span>
                            )}
                          </div>

                          <input
                            type="text"
                            value={img.caption}
                            onChange={(e) =>
                              handleUpdateGalleryItem(img.id, {
                                caption: e.target.value,
                              })
                            }
                            placeholder="Nhập chú thích cho bức ảnh..."
                            className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                          />
                        </div>

                        {/* Layout Override + Reorder + Delete */}
                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          <select
                            value={img.layoutOverride ?? 'auto'}
                            onChange={(e) =>
                              handleUpdateGalleryItem(img.id, {
                                layoutOverride: e.target
                                  .value as LayoutOverride,
                              })
                            }
                            aria-label="Chế độ căn chỉnh ảnh"
                            className="h-8 border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-2 font-mono-plaque text-[10px] text-[var(--text-primary)] uppercase focus:border-[var(--accent-gallery)] focus:outline-none"
                          >
                            <option value="auto">Tự Động (Auto AR)</option>
                            <option value="full">Ép Tràn Viền (Full)</option>
                            <option value="half">Ép Ghép Đôi (Half)</option>
                          </select>

                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveGalleryImage(idx, -1)}
                            title="Di chuyển lên"
                            aria-label="Di chuyển ảnh lên"
                            className="flex h-8 w-8 items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-wall)] text-[var(--text-primary)] transition-colors hover:border-[var(--accent-gallery)] disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>

                          <button
                            type="button"
                            disabled={idx === draft.galleryImages.length - 1}
                            onClick={() => handleMoveGalleryImage(idx, 1)}
                            title="Di chuyển xuống"
                            aria-label="Di chuyển ảnh xuống"
                            className="flex h-8 w-8 items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-wall)] text-[var(--text-primary)] transition-colors hover:border-[var(--accent-gallery)] disabled:opacity-30"
                          >
                            <ArrowDown
                              className="h-3.5 w-3.5"
                              strokeWidth={1.5}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(img.id)}
                            title="Xoá ảnh này"
                            aria-label="Xoá ảnh này"
                            className="flex h-8 w-8 items-center justify-center border border-red-800/30 bg-red-950/10 text-red-500 transition-colors hover:bg-red-600 hover:text-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-12 text-sm text-[var(--text-muted)]">
                Chưa có dự án nào được chọn.
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
