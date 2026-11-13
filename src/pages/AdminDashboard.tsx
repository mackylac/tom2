import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CloudDownload,
  CloudUpload,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FolderPlus,
  GripVertical,
  ImagePlus,
  KeyRound,
  LampCeiling,
  LayoutGrid,
  Lock,
  LogOut,
  Palette,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Trash2,
  Upload,
} from 'lucide-react';
import { LightboxModal } from '../components/LightboxModal';
import { SmartGalleryGrid } from '../components/SmartGalleryGrid';
import { usePortfolio } from '../context/PortfolioContext';
import {
  type CloudSyncConfig,
  loadCloudSyncConfig,
  pullPortfolioFromSupabase,
  pushPortfolioToSupabase,
  saveCloudSyncConfig,
} from '../services/cloudSync';
import {
  buildCanonicalArchivePayload,
  getExpectedAdminPassword,
  probeImageUrlDimensions,
  processUploadedImageFile,
} from '../services/portfolioStorageService';
import {
  FRAME_MATERIAL_LABELS,
  type FrameMaterial,
  type GalleryImage,
  type LayoutOverride,
  type LightingMode,
  MATBOARD_SIZE_LABELS,
  type MatboardSize,
  type MatboardTone,
  type Project,
} from '../types/portfolio';

interface AdminDashboardProps {
  onBackToGallery: () => void;
  onPreviewProject: (projectId: string) => void;
}

type AdminTabId = 'projects' | 'subpage-gallery' | 'site-settings' | 'publish-sync';

function getVietnameseAspectBadge(img: GalleryImage): {
  label: string;
  arText: string;
  toneClass: string;
} {
  const w = img.width ?? 1400;
  const h = img.height ?? 1000;
  const ar = w / Math.max(h, 1);
  const arText = `AR ${ar.toFixed(2)}:1 (${w}×${h}px)`;

  if (img.layoutOverride === 'full') {
    return {
      label: 'Ép tràn viền 100%',
      arText,
      toneClass: 'border-[#C8A97E] bg-[#C8A97E]/15 text-[#C8A97E]',
    };
  }
  if (img.layoutOverride === 'half') {
    return {
      label: 'Ép chia đôi 50%',
      arText,
      toneClass: 'border-[#C8A97E] bg-[#C8A97E]/15 text-[#C8A97E]',
    };
  }
  if (ar >= 1.65) {
    return {
      label: 'Ngang tràn viền',
      arText,
      toneClass:
        'border-emerald-700/40 bg-emerald-950/20 text-emerald-600 dark:text-emerald-400',
    };
  }
  if (ar <= 0.9) {
    return {
      label: 'Dọc ghép đôi',
      arText,
      toneClass:
        'border-amber-700/40 bg-amber-950/20 text-amber-600 dark:text-amber-400',
    };
  }
  return {
    label: 'Vuông cân đối',
    arText,
    toneClass:
      'border-sky-700/40 bg-sky-950/20 text-sky-600 dark:text-sky-400',
  };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToGallery,
  onPreviewProject,
}) => {
  const {
    projects,
    siteSettings,
    updateSiteSettings,
    renameCategoryAcrossPortfolio,
    lightingMode,
    toggleLightingMode,
    selectedManagerProjectId,
    setSelectedManagerProjectId,
    addProject,
    updateProject,
    deleteProject,
    toggleProjectVisibility,
    moveProjectOrder,
    resetToSeedData,
    saveAndApplyAllNow,
    exportPortfolioJson,
    importPortfolioJson,
    applyImportedArchive,
    isAdminAuthenticated,
    loginAdmin,
    logoutAdmin,
    lastSavedAt,
  } = usePortfolio();

  // Authentication Gate State
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Dashboard Tab (1 of 4)
  const [activeTab, setActiveTab] = useState<AdminTabId>('projects');

  // Toast / Status Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  // Tab 2: Sub-page Gallery Editor States
  const [batchUrlsText, setBatchUrlsText] = useState('');
  const [batchDefaultCaption, setBatchDefaultCaption] = useState('');
  const [draggedPlateIndex, setDraggedPlateIndex] = useState<number | null>(
    null
  );
  const [previewLightboxIndex, setPreviewLightboxIndex] = useState<
    number | null
  >(null);

  // Tab 3: Site Settings Category Editor States
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<
    number | null
  >(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  // Tab 4: Cloud Sync Config State
  const [cloudConfig, setCloudConfig] = useState<CloudSyncConfig>(() =>
    loadCloudSyncConfig()
  );

  // File Inputs
  const brandAvatarInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const batchGalleryInputRef = useRef<HTMLInputElement>(null);
  const importJsonInputRef = useRef<HTMLInputElement>(null);

  const selectedProject =
    projects.find((p) => p.id === selectedManagerProjectId) ??
    projects[0] ??
    null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4200);
  };

  // ============================================================================
  // 1. ADMIN AUTHENTICATION GATE (/admin)
  // ============================================================================
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = loginAdmin(pinInput);
    if (ok) {
      setAuthError(null);
      setPinInput('');
      showToast('Đăng nhập Cổng Quản Trị (/admin) thành công.');
    } else {
      setAuthError(
        'Mã PIN / Mật khẩu quản trị không chính xác. Vui lòng thử lại.'
      );
    }
  };

  if (!isAdminAuthenticated) {
    const defaultPinHint = getExpectedAdminPassword();
    return (
      <div className="pt-safe pb-safe flex min-h-[100dvh] flex-col justify-between bg-[var(--bg-wall)] px-4 py-8 text-[var(--text-primary)] sm:px-10">
        {/* Top Minimal Back Bar */}
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <button
            type="button"
            onClick={onBackToGallery}
            className="flex h-10 items-center gap-2 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3.5 font-mono-plaque text-[11px] tracking-[0.16em] text-[var(--text-primary)] uppercase transition-colors hover:border-[var(--accent-gallery)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>← Quay lại Sảnh Triển Lãm</span>
          </button>

          <button
            type="button"
            onClick={toggleLightingMode}
            className="flex h-10 w-10 items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-plaque)] text-[var(--text-primary)]"
            title="Đổi chế độ ánh sáng"
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
        </div>

        {/* Center Curatorial Vault Authentication Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-md border border-[var(--border-strong)] bg-[var(--bg-plaque)] p-7 shadow-2xl sm:p-10"
        >
          <div className="mb-6 flex items-center gap-2.5 font-mono-plaque text-[10px] tracking-[0.22em] text-[var(--accent-gallery)] uppercase">
            <Lock className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>CURATORIAL ARCHIVE SECURITY GATE · /ADMIN</span>
          </div>

          <h1 className="font-serif-gallery text-3xl font-normal tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Cổng Quản Trị Phòng Tranh
          </h1>
          <p className="mt-2 font-sans-gallery text-xs leading-relaxed text-[var(--text-secondary)]">
            Nhập Mã PIN hoặc Mật khẩu Giám tuyển để truy cập hệ thống quản lý dự án, bộ máy tự động dàn trang ảnh và cấu hình nội dung toàn trang.
          </p>

          <form onSubmit={handleLoginSubmit} className="mt-7 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="admin-pin-input"
                className="block font-mono-plaque text-[10px] tracking-[0.18em] text-[var(--text-muted)] uppercase"
              >
                Mã PIN / Mật Khẩu Quản Trị
              </label>
              <div className="relative">
                <KeyRound
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                  strokeWidth={1.5}
                />
                <input
                  id="admin-pin-input"
                  type="password"
                  autoFocus
                  required
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Nhập mã PIN (Mặc định: 2026)"
                  className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] py-3 pr-4 pl-10 font-mono-plaque text-sm tracking-[0.2em] text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                />
              </div>
              <p className="font-mono-plaque text-[10px] tracking-wider text-[var(--text-muted)]">
                Mã mặc định kiểm thử:{' '}
                <button
                  type="button"
                  onClick={() => setPinInput(defaultPinHint)}
                  className="text-[var(--accent-gallery)] underline underline-offset-2"
                >
                  {defaultPinHint}
                </button>{' '}
                (Hoặc cấu hình qua biến môi trường <code>VITE_ADMIN_PASSWORD</code>)
              </p>
            </div>

            {authError && (
              <div className="border border-red-700/40 bg-red-950/15 px-3.5 py-2.5 font-mono-plaque text-[11px] text-red-500">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 border border-[var(--text-primary)] bg-[var(--text-primary)] px-6 py-3.5 font-mono-plaque text-xs tracking-[0.2em] text-[var(--bg-wall)] uppercase transition-all duration-300 hover:border-[var(--accent-gallery)] hover:bg-[var(--accent-gallery)] hover:text-[#FAF9F5]"
            >
              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
              <span>Mở Khoá Bảng Điều Khiển</span>
            </button>
          </form>
        </motion.div>

        <div className="mx-auto text-center font-mono-plaque text-[10px] tracking-[0.18em] text-[var(--text-muted)] uppercase">
          PHÍM TẮT MỞ NHANH TỪ MỌI TRANG: CTRL + SHIFT + A
        </div>
      </div>
    );
  }

  // ============================================================================
  // HELPER HANDLERS FOR TAB 1, TAB 2, TAB 3, TAB 4
  // ============================================================================
  const handleProjectFieldChange = <K extends keyof Project>(
    key: K,
    value: Project[K]
  ) => {
    if (!selectedProject) return;
    updateProject({
      ...selectedProject,
      [key]: value,
    });
  };

  const handleCreateNewProject = () => {
    const nextNumber = String(projects.length + 1).padStart(2, '0');
    const timestamp = Date.now().toString(36);
    const defaultCategory =
      siteSettings.categories[0] ?? 'Branding & Identity';

    const newProj: Project = {
      id: `exhibit-${timestamp}`,
      exhibitNumber: nextNumber,
      title: `Dự Án Triển Lãm Mới № ${nextNumber}`,
      subtitle: 'Visual Identity & Archival Monograph System',
      client: 'Atelier Private Commission',
      category: defaultCategory,
      year: new Date().getFullYear().toString(),
      role: 'Art Direction · Identity Design · Print Production',
      deliverables: [
        'Brand Identity',
        'Packaging System',
        'Editorial Guidelines',
      ],
      frameStyle: 'gallery-oak',
      matboardTone: 'ivory',
      matboardSize: 'standard',
      hidden: false,
      coverImage:
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&h=1500&q=85',
      coverAspect: 'portrait',
      location: 'Sài Gòn · Kyoto',
      curatorialStatement:
        'Tác phẩm trưng bày mới được khởi tạo từ Bảng Điều Khiển Quản Trị (/admin). Bạn có thể thay đổi ảnh bìa khung tranh và tải lên bộ ảnh trang con để hệ thống tự động căn chỉnh.',
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
    showToast(`Đã tạo mới dự án "${newProj.title}".`);
  };

  const handleCoverFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;
    setIsBusy(true);
    try {
      const { dataUrl, width, height, cloudUploaded } =
        await processUploadedImageFile(file);
      const ar = width / Math.max(height, 1);
      const inferredAspect: Project['coverAspect'] =
        ar < 0.92 ? 'portrait' : ar > 1.15 ? 'landscape' : 'square';

      updateProject({
        ...selectedProject,
        coverImage: dataUrl,
        coverAspect: inferredAspect,
      });

      showToast(
        `Đã cập nhật Ảnh Bìa (${width}×${height}px · ${
          cloudUploaded ? 'Cloud CDN' : 'Nén WebP/Base64'
        }).`
      );
    } catch {
      showToast('Không thể xử lý file ảnh bìa.');
    } finally {
      setIsBusy(false);
      e.target.value = '';
    }
  };

  const handleBatchGalleryUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedProject) return;
    setIsBusy(true);
    try {
      const newPlates: GalleryImage[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { dataUrl, width, height } = await processUploadedImageFile(file);
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[-_]/g, ' ');
        newPlates.push({
          id: `plate-${Date.now()}-${i}`,
          url: dataUrl,
          caption: `${cleanName} (${width}×${height}px)`,
          width,
          height,
          layoutOverride: 'auto',
        });
      }

      updateProject({
        ...selectedProject,
        galleryImages: [...selectedProject.galleryImages, ...newPlates],
      });

      showToast(
        `Đã tải lên hàng loạt ${newPlates.length} ảnh và tự động đo tỷ lệ naturalWidth / naturalHeight!`
      );
    } catch {
      showToast('Có lỗi khi tải lên danh sách ảnh.');
    } finally {
      setIsBusy(false);
      e.target.value = '';
    }
  };

  const handleAddBatchUrls = async () => {
    if (!selectedProject || !batchUrlsText.trim()) return;
    const rawLines = batchUrlsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (rawLines.length === 0) return;

    setIsBusy(true);
    try {
      const addedPlates: GalleryImage[] = [];
      for (let i = 0; i < rawLines.length; i++) {
        const url = rawLines[i];
        const dims = await probeImageUrlDimensions(url);
        addedPlates.push({
          id: `plate-url-${Date.now()}-${i}`,
          url,
          caption:
            batchDefaultCaption.trim() ||
            `Bản vẽ chi tiết ${selectedProject.title} #${
              selectedProject.galleryImages.length + i + 1
            }`,
          width: dims.width,
          height: dims.height,
          layoutOverride: 'auto',
        });
      }

      updateProject({
        ...selectedProject,
        galleryImages: [...selectedProject.galleryImages, ...addedPlates],
      });

      setBatchUrlsText('');
      setBatchDefaultCaption('');
      showToast(
        `Đã thêm ${addedPlates.length} ảnh qua URL và tự động tính tỷ lệ khung hình.`
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleMoveGalleryPlate = (index: number, direction: -1 | 1) => {
    if (!selectedProject) return;
    const target = index + direction;
    if (target < 0 || target >= selectedProject.galleryImages.length) return;
    const list = [...selectedProject.galleryImages];
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    handleProjectFieldChange('galleryImages', list);
  };

  const handleDropPlateReorder = (targetIndex: number) => {
    if (
      !selectedProject ||
      draggedPlateIndex === null ||
      draggedPlateIndex === targetIndex
    ) {
      setDraggedPlateIndex(null);
      return;
    }
    const list = [...selectedProject.galleryImages];
    const [moved] = list.splice(draggedPlateIndex, 1);
    list.splice(targetIndex, 0, moved);
    handleProjectFieldChange('galleryImages', list);
    setDraggedPlateIndex(null);
    showToast('Đã cập nhật thứ tự ảnh bằng thao tác kéo thả.');
  };

  const handleUpdatePlate = (
    plateId: string,
    patch: Partial<GalleryImage>
  ) => {
    if (!selectedProject) return;
    const list = selectedProject.galleryImages.map((img) =>
      img.id === plateId ? { ...img, ...patch } : img
    );
    handleProjectFieldChange('galleryImages', list);
  };

  const handleDeletePlate = (plateId: string) => {
    if (!selectedProject) return;
    const list = selectedProject.galleryImages.filter(
      (img) => img.id !== plateId
    );
    handleProjectFieldChange('galleryImages', list);
    showToast('Đã xoá ảnh khỏi trang con của dự án.');
  };

  // Tab 3: Brand Avatar Upload & Category Handlers
  const handleBrandAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsBusy(true);
    try {
      const { dataUrl, width, height, cloudUploaded } =
        await processUploadedImageFile(file);
      updateSiteSettings({ brandAvatar: dataUrl });
      showToast(
        `Đã cập nhật Avatar Website & Favicon (${width}×${height}px · ${
          cloudUploaded ? 'Cloud CDN' : 'Nén WebP/Base64'
        }).`
      );
    } catch {
      showToast('Không thể xử lý file ảnh Avatar.');
    } finally {
      setIsBusy(false);
      e.target.value = '';
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (siteSettings.categories.includes(trimmed)) {
      showToast('Danh mục này đã tồn tại.');
      return;
    }
    updateSiteSettings({
      categories: [...siteSettings.categories, trimmed],
    });
    setNewCategoryName('');
    showToast(`Đã thêm danh mục bộ lọc "${trimmed}".`);
  };

  const handleDeleteCategory = (catName: string) => {
    if (siteSettings.categories.length <= 1) {
      showToast('Cần giữ lại ít nhất 01 danh mục thiết kế.');
      return;
    }
    updateSiteSettings({
      categories: siteSettings.categories.filter((c) => c !== catName),
    });
    showToast(`Đã xoá danh mục "${catName}".`);
  };

  const handleMoveCategory = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= siteSettings.categories.length) return;
    const list = [...siteSettings.categories];
    const [moved] = list.splice(idx, 1);
    list.splice(target, 0, moved);
    updateSiteSettings({ categories: list });
  };

  // Tab 4: Save & Sync Handlers
  const handleSaveAndApplyClick = async () => {
    setIsBusy(true);
    try {
      const res = await saveAndApplyAllNow();
      showToast(res.message);
    } finally {
      setIsBusy(false);
    }
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

  const handlePushToSupabase = async () => {
    setIsBusy(true);
    try {
      saveCloudSyncConfig(cloudConfig);
      const payload = buildCanonicalArchivePayload(projects, siteSettings);
      const res = await pushPortfolioToSupabase(payload, cloudConfig);
      showToast(res.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePullFromSupabase = async () => {
    setIsBusy(true);
    try {
      saveCloudSyncConfig(cloudConfig);
      const res = await pullPortfolioFromSupabase(cloudConfig);
      if (res.ok && res.data) {
        applyImportedArchive(res.data);
      }
      showToast(res.message);
    } finally {
      setIsBusy(false);
    }
  };

  const canonicalJsonPreview = JSON.stringify(
    buildCanonicalArchivePayload(projects, siteSettings),
    null,
    2
  );

  return (
    <div className="pt-safe pb-safe min-h-[100dvh] bg-[var(--bg-wall)] text-[var(--text-primary)]">
      {/* Top Admin Command Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-strong)] bg-[var(--bg-glass)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8 lg:px-12">
          {/* Left: Back to Gallery, Brand Avatar Quick-Trigger & Admin Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToGallery}
              className="flex h-10 items-center gap-2 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 font-mono-plaque text-[10.5px] tracking-[0.15em] text-[var(--text-primary)] uppercase transition-colors hover:border-[var(--accent-gallery)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>← Xem Sảnh Triển Lãm</span>
            </button>

            <div className="hidden items-center gap-3 border-l border-[var(--border-hairline)] pl-3 md:flex">
              {siteSettings.brandAvatar && (
                <img
                  src={siteSettings.brandAvatar}
                  alt="Website Avatar"
                  onClick={() => setActiveTab('site-settings')}
                  title="Nhấn để thay đổi Avatar của Website"
                  className={`h-10 w-10 cursor-pointer border border-[var(--accent-gallery)] object-cover transition-transform hover:scale-105 ${
                    siteSettings.avatarShape === 'square'
                      ? 'rounded-none'
                      : 'rounded-full'
                  }`}
                />
              )}
              <div>
                <div className="font-mono-plaque text-[9.5px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                  ADMINISTRATION CONSOLE · /ADMIN
                </div>
                <div className="font-serif-gallery text-lg leading-tight font-medium">
                  {siteSettings.brandName} — Quản Trị Toàn Diện
                </div>
              </div>
            </div>
          </div>

          {/* Right: Quick Change Avatar + Save & Apply + Lighting + Logout */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={brandAvatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleBrandAvatarUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => {
                setActiveTab('site-settings');
              }}
              className="flex h-10 items-center gap-2 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-primary)] uppercase transition-colors hover:border-[var(--accent-gallery)]"
              title="Thay đổi Avatar của Website & Thương hiệu"
            >
              {siteSettings.brandAvatar && (
                <img
                  src={siteSettings.brandAvatar}
                  alt=""
                  className={`h-5 w-5 object-cover ${
                    siteSettings.avatarShape === 'square'
                      ? 'rounded-none'
                      : 'rounded-full'
                  }`}
                />
              )}
              <span>Đổi Avatar Web</span>
            </button>

            <span className="hidden font-mono-plaque text-[10px] tracking-wider text-[var(--text-muted)] uppercase xl:inline">
              Lưu gần nhất: {lastSavedAt}
            </span>

            <button
              type="button"
              disabled={isBusy}
              onClick={handleSaveAndApplyClick}
              className="flex h-10 items-center gap-2 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-3.5 font-mono-plaque text-[10.5px] tracking-[0.16em] text-[#FAF9F5] uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Lưu & Áp Dụng Ngay</span>
            </button>

            <button
              type="button"
              onClick={toggleLightingMode}
              title="Đổi ánh sáng giao diện"
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
              onClick={() => {
                logoutAdmin();
                showToast('Đã đăng xuất khỏi phiên quản trị.');
              }}
              title="Đăng xuất an toàn"
              className="flex h-10 items-center gap-1.5 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-3 font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-secondary)] uppercase transition-colors hover:border-red-600 hover:text-red-500"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline">Đăng Xuất</span>
            </button>
          </div>
        </div>

        {/* 4-Tab Navigation Bar (Touch Scrollable on Mobile) */}
        <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-plaque)]">
          <div className="no-scrollbar mx-auto flex max-w-[1440px] overflow-x-auto px-4 sm:px-8 lg:px-12">
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={`flex min-h-[48px] shrink-0 items-center gap-2 border-b-2 px-4 font-mono-plaque text-[11px] tracking-[0.15em] whitespace-nowrap uppercase transition-colors ${
                activeTab === 'projects'
                  ? 'border-[var(--accent-gallery)] bg-[var(--bg-wall)] font-medium text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>1. Dự Án & Khung Tranh ({projects.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('subpage-gallery')}
              className={`flex min-h-[48px] shrink-0 items-center gap-2 border-b-2 px-4 font-mono-plaque text-[11px] tracking-[0.15em] whitespace-nowrap uppercase transition-colors ${
                activeTab === 'subpage-gallery'
                  ? 'border-[var(--accent-gallery)] bg-[var(--bg-wall)] font-medium text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>
                2. Ảnh Trang Con & Tự Động Dàn Trang (
                {selectedProject?.galleryImages.length ?? 0})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('site-settings')}
              className={`flex min-h-[48px] shrink-0 items-center gap-2 border-b-2 px-4 font-mono-plaque text-[11px] tracking-[0.15em] whitespace-nowrap uppercase transition-colors ${
                activeTab === 'site-settings'
                  ? 'border-[var(--accent-gallery)] bg-[var(--bg-wall)] font-medium text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Palette className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>3. Avatar Web, Nội Dung & Thương Hiệu</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('publish-sync')}
              className={`flex min-h-[48px] shrink-0 items-center gap-2 border-b-2 px-4 font-mono-plaque text-[11px] tracking-[0.15em] whitespace-nowrap uppercase transition-colors ${
                activeTab === 'publish-sync'
                  ? 'border-[var(--accent-gallery)] bg-[var(--bg-wall)] font-medium text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Database className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>4. Xuất Bản & Đồng Bộ Dữ Liệu</span>
            </button>
          </div>
        </div>

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="border-t border-[var(--accent-gallery)] bg-[var(--accent-gallery-soft)] px-4 py-2 sm:px-8 lg:px-12">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2 font-mono-plaque text-xs text-[var(--text-primary)]">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-[var(--accent-gallery)]" />
                <span>{toastMessage}</span>
              </div>
              <span className="hidden text-[10px] tracking-widest uppercase opacity-75 sm:inline">
                LIVE SYNC ACTIVE
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Main Dashboard Content Area */}
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-12">
        {/* ===================================================================
            TAB 1: QUẢN LÝ DỰ ÁN & KHUNG TRANH (PROJECTS MANAGER)
           =================================================================== */}
        {activeTab === 'projects' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left Column (4 cols): Quick Website Avatar Card + Project List */}
            <aside className="space-y-4 lg:col-span-4">
              {/* Quick Website Avatar Manager Card right in Tab 1 */}
              <div className="border border-[var(--border-strong)] bg-[var(--bg-plaque)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono-plaque text-[10px] tracking-[0.18em] text-[var(--accent-gallery)] uppercase">
                    AVATAR CỦA WEBSITE & FAVICON
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('site-settings')}
                    className="font-mono-plaque text-[9.5px] tracking-wider text-[var(--text-secondary)] underline underline-offset-2 uppercase hover:text-[var(--accent-gallery)]"
                  >
                    Tuỳ chỉnh sâu →
                  </button>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <img
                      src={
                        siteSettings.brandAvatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=85'
                      }
                      alt={siteSettings.brandName}
                      className={`h-15 w-15 border border-[var(--accent-gallery)] object-cover ${
                        siteSettings.avatarShape === 'square'
                          ? 'rounded-none'
                          : 'rounded-full'
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="truncate font-serif-gallery text-base font-medium text-[var(--text-primary)]">
                      {siteSettings.brandName}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => brandAvatarInputRef.current?.click()}
                        className="flex items-center gap-1.5 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-2.5 py-1.5 font-mono-plaque text-[9.5px] tracking-[0.14em] text-[#FAF9F5] uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        <Upload className="h-3 w-3" strokeWidth={1.5} />
                        <span>Tải Ảnh Avatar Mới</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('site-settings')}
                        className="border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-2.5 py-1.5 font-mono-plaque text-[9.5px] tracking-[0.14em] text-[var(--text-primary)] uppercase hover:border-[var(--accent-gallery)]"
                      >
                        Dán Link URL
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-4">
                <div>
                  <span className="font-mono-plaque text-[10px] tracking-[0.18em] text-[var(--accent-gallery)] uppercase">
                    DANH SÁCH KHUNG TRANH ({projects.length})
                  </span>
                  <p className="text-xs text-[var(--text-muted)]">
                    Đổi thứ tự, ẩn/hiện hoặc chọn dự án để chỉnh sửa
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreateNewProject}
                  className="flex items-center gap-1.5 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-3 py-2 font-mono-plaque text-[10px] tracking-[0.15em] text-[#FAF9F5] uppercase transition-opacity hover:opacity-90"
                >
                  <FolderPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>+ Thêm Mới</span>
                </button>
              </div>

              <div className="divide-y divide-[var(--border-hairline)] border border-[var(--border-hairline)] bg-[var(--bg-plaque)]">
                {projects.map((proj, index) => {
                  const isSelected = proj.id === selectedProject?.id;
                  const isHidden = Boolean(proj.hidden);

                  return (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedManagerProjectId(proj.id)}
                      className={`flex cursor-pointer items-center gap-3 p-3.5 transition-colors ${
                        isSelected
                          ? 'border-l-4 border-l-[var(--accent-gallery)] bg-[var(--bg-surface)]'
                          : 'hover:bg-[var(--bg-surface)]/60'
                      } ${isHidden ? 'opacity-60' : ''}`}
                    >
                      <img
                        src={proj.coverImage}
                        alt={proj.title}
                        className="h-16 w-13 shrink-0 border border-[var(--border-hairline)] object-cover"
                      />

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--accent-gallery)] uppercase">
                            NO. {proj.exhibitNumber}
                          </span>
                          {isHidden ? (
                            <span className="border border-amber-600/40 bg-amber-950/20 px-1.5 py-0.5 font-mono-plaque text-[9px] text-amber-500 uppercase">
                              Đang Ẩn
                            </span>
                          ) : (
                            <span className="border border-emerald-700/30 bg-emerald-950/15 px-1.5 py-0.5 font-mono-plaque text-[9px] text-emerald-600 uppercase dark:text-emerald-400">
                              Đang Hiện
                            </span>
                          )}
                        </div>

                        <div className="truncate font-serif-gallery text-lg font-medium text-[var(--text-primary)]">
                          {proj.title}
                        </div>

                        <div className="truncate font-sans-gallery text-[11px] text-[var(--text-muted)]">
                          {proj.category} · {proj.galleryImages.length} ảnh trang con
                        </div>
                      </div>

                      {/* Quick Action Buttons: Reorder Up/Down, Hide/Show, Delete */}
                      <div
                        className="flex shrink-0 flex-col gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => {
                              moveProjectOrder(index, -1);
                              showToast(
                                `Đã chuyển "${proj.title}" lên vị trí số ${index}.`
                              );
                            }}
                            title="Đưa lên trên ngoài sảnh chính"
                            className="flex h-7 w-7 items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-wall)] text-[var(--text-primary)] hover:border-[var(--accent-gallery)] disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>

                          <button
                            type="button"
                            disabled={index === projects.length - 1}
                            onClick={() => {
                              moveProjectOrder(index, 1);
                              showToast(
                                `Đã chuyển "${proj.title}" xuống vị trí số ${
                                  index + 2
                                }.`
                              );
                            }}
                            title="Đưa xuống dưới ngoài sảnh chính"
                            className="flex h-7 w-7 items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-wall)] text-[var(--text-primary)] hover:border-[var(--accent-gallery)] disabled:opacity-30"
                          >
                            <ArrowDown
                              className="h-3.5 w-3.5"
                              strokeWidth={1.5}
                            />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              toggleProjectVisibility(proj.id);
                              showToast(
                                isHidden
                                  ? `Đã hiển thị lại "${proj.title}" ngoài sảnh chính.`
                                  : `Đã tạm ẩn "${proj.title}" khỏi sảnh chính.`
                              );
                            }}
                            title={
                              isHidden
                                ? 'Hiện dự án ngoài sảnh chính'
                                : 'Tạm ẩn dự án khỏi sảnh chính'
                            }
                            className="flex h-7 w-7 items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-wall)] text-[var(--text-secondary)] hover:border-[var(--accent-gallery)] hover:text-[var(--text-primary)]"
                          >
                            {isHidden ? (
                              <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                            ) : (
                              <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                            )}
                          </button>

                          {projects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const title = proj.title;
                                deleteProject(proj.id);
                                showToast(`Đã xoá dự án "${title}".`);
                              }}
                              title="Xoá dự án này"
                              className="flex h-7 w-7 items-center justify-center border border-red-800/30 bg-red-950/10 text-red-500 hover:bg-red-600 hover:text-white"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Right Column (8 cols): Full Project & Physical Frame Editor */}
            <div className="lg:col-span-8">
              {selectedProject ? (
                <div className="space-y-8 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-5 sm:p-8">
                  {/* Top Bar of Selected Project */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-hairline)] pb-5">
                    <div>
                      <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                        ĐANG CHỈNH SỬA DỰ ÁN · EXHIBIT NO.{' '}
                        {selectedProject.exhibitNumber}
                      </span>
                      <h2 className="font-serif-gallery text-2xl sm:text-3xl">
                        {selectedProject.title}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('subpage-gallery')}
                        className="flex items-center gap-1.5 border border-[var(--accent-gallery)] bg-[var(--accent-gallery-soft)] px-3 py-2 font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-primary)] uppercase hover:bg-[var(--accent-gallery)] hover:text-[#FAF9F5]"
                      >
                        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>
                          Quản Lý {selectedProject.galleryImages.length} Ảnh
                          Trang Con →
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onPreviewProject(selectedProject.id)}
                        className="flex items-center gap-1.5 border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-primary)] uppercase hover:border-[var(--accent-gallery)]"
                      >
                        <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>Xem Trang Con Thực Tế</span>
                      </button>
                    </div>
                  </div>

                  {/* 1A. Core Project Information */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Tên Dự Án (Project Title)
                      </label>
                      <input
                        type="text"
                        value={selectedProject.title}
                        onChange={(e) =>
                          handleProjectFieldChange('title', e.target.value)
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Mã Số Triển Lãm (EXHIBIT NO.)
                      </label>
                      <input
                        type="text"
                        value={selectedProject.exhibitNumber}
                        onChange={(e) =>
                          handleProjectFieldChange(
                            'exhibitNumber',
                            e.target.value
                          )
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 font-mono-plaque text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Khách Hàng / Thương Hiệu (Client)
                      </label>
                      <input
                        type="text"
                        value={selectedProject.client}
                        onChange={(e) =>
                          handleProjectFieldChange('client', e.target.value)
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Hạng Mục Thiết Kế (Category)
                      </label>
                      <select
                        value={selectedProject.category}
                        onChange={(e) =>
                          handleProjectFieldChange('category', e.target.value)
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      >
                        {siteSettings.categories.map((cat) => (
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
                        value={selectedProject.year}
                        onChange={(e) =>
                          handleProjectFieldChange('year', e.target.value)
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 font-mono-plaque text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Phụ Đề Nghệ Thuật (Subtitle)
                      </label>
                      <input
                        type="text"
                        value={selectedProject.subtitle}
                        onChange={(e) =>
                          handleProjectFieldChange('subtitle', e.target.value)
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Địa Điểm (Location)
                      </label>
                      <input
                        type="text"
                        value={selectedProject.location}
                        onChange={(e) =>
                          handleProjectFieldChange('location', e.target.value)
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Vai Trò Thực Hiện (Role)
                      </label>
                      <input
                        type="text"
                        value={selectedProject.role}
                        onChange={(e) =>
                          handleProjectFieldChange('role', e.target.value)
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Hạng Mục Bàn Giao (Deliverables — cách nhau bằng dấu phẩy)
                      </label>
                      <input
                        type="text"
                        value={selectedProject.deliverables.join(', ')}
                        onChange={(e) =>
                          handleProjectFieldChange(
                            'deliverables',
                            e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean)
                          )
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 1B. Physical Picture Frame & Cover Image Configuration */}
                  <div className="space-y-5 border-y border-[var(--border-hairline)] py-6">
                    <div>
                      <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                        CẤU HÌNH KHUNG TRANH VẬT LÝ & ẢNH BÌA SẢNH CHÍNH (COVER IMAGE)
                      </span>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Mỗi khung tranh ngoài Sảnh Triển Lãm Chính chỉ hiển thị duy nhất 01 Ảnh Bìa đại diện này.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                      {/* Live Physical Frame Mini Preview */}
                      <div className="flex flex-col items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-wall)] p-5 md:col-span-5">
                        <div
                          className={`w-full max-w-[230px] ${
                            selectedProject.frameStyle === 'gallery-oak'
                              ? 'frame-molding-gallery-oak'
                              : selectedProject.frameStyle === 'brushed-bronze'
                                ? 'frame-molding-brushed-bronze'
                                : 'frame-molding-matte-black'
                          }`}
                        >
                          <div
                            className={`${
                              selectedProject.matboardTone === 'charcoal'
                                ? 'matboard-charcoal'
                                : 'matboard-ivory'
                            } ${
                              selectedProject.matboardSize === 'compact'
                                ? 'p-2.5'
                                : selectedProject.matboardSize === 'grand'
                                  ? 'p-6'
                                  : 'p-4'
                            }`}
                          >
                            <div
                              className={`artwork-window-bevel overflow-hidden bg-neutral-900 ${
                                selectedProject.coverAspect === 'portrait'
                                  ? 'aspect-[4/5]'
                                  : selectedProject.coverAspect === 'square'
                                    ? 'aspect-square'
                                    : 'aspect-[4/3]'
                              }`}
                            >
                              <img
                                src={selectedProject.coverImage}
                                alt="Cover Preview"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                        <span className="mt-3 font-mono-plaque text-[9.5px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                          XEM TRƯỚC KHUNG TRANH SẢNH CHÍNH
                        </span>
                      </div>

                      {/* Frame Material, Matboard Size/Tone & Cover Upload Controls */}
                      <div className="space-y-4 md:col-span-7">
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                              Màu Viền Khung (Frame Molding)
                            </label>
                            <select
                              value={selectedProject.frameStyle}
                              onChange={(e) =>
                                handleProjectFieldChange(
                                  'frameStyle',
                                  e.target.value as FrameMaterial
                                )
                              }
                              className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                            >
                              {(
                                Object.keys(
                                  FRAME_MATERIAL_LABELS
                                ) as FrameMaterial[]
                              ).map((mat) => (
                                <option key={mat} value={mat}>
                                  {FRAME_MATERIAL_LABELS[mat].vietnamese} (
                                  {FRAME_MATERIAL_LABELS[mat].name})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                              Độ Dày Bo Giấy (Matboard Thickness)
                            </label>
                            <select
                              value={selectedProject.matboardSize ?? 'standard'}
                              onChange={(e) =>
                                handleProjectFieldChange(
                                  'matboardSize',
                                  e.target.value as MatboardSize
                                )
                              }
                              className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                            >
                              {(
                                Object.keys(
                                  MATBOARD_SIZE_LABELS
                                ) as MatboardSize[]
                              ).map((sz) => (
                                <option key={sz} value={sz}>
                                  {MATBOARD_SIZE_LABELS[sz].vietnamese}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                              Màu Bo Giấy Mỹ Thuật (Matboard Tone)
                            </label>
                            <select
                              value={selectedProject.matboardTone}
                              onChange={(e) =>
                                handleProjectFieldChange(
                                  'matboardTone',
                                  e.target.value as MatboardTone
                                )
                              }
                              className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
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

                          <div className="space-y-1.5">
                            <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                              Tỷ Lệ Cửa Sổ Ảnh Bìa
                            </label>
                            <select
                              value={selectedProject.coverAspect}
                              onChange={(e) =>
                                handleProjectFieldChange(
                                  'coverAspect',
                                  e.target.value as Project['coverAspect']
                                )
                              }
                              className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                            >
                              <option value="portrait">Khung Dọc (4:5)</option>
                              <option value="landscape">Khung Ngang (4:3)</option>
                              <option value="square">Khung Vuông (1:1)</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                            Link Ảnh Bìa (URL hoặc WebP/Base64)
                          </label>
                          <input
                            type="text"
                            value={selectedProject.coverImage}
                            onChange={(e) =>
                              handleProjectFieldChange(
                                'coverImage',
                                e.target.value
                              )
                            }
                            placeholder="https://..."
                            className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <input
                            ref={coverFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleCoverFileUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => coverFileInputRef.current?.click()}
                            className="flex items-center gap-2 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-4 py-2.5 font-mono-plaque text-[10.5px] tracking-[0.15em] text-[#FAF9F5] uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>
                              Tải Ảnh Bìa Từ Máy Tính / Điện Thoại (Tự Nén WebP)
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1C. Storytelling & Curatorial Concept */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                        Tóm Tắt Giám Tuyển (Curatorial Overview)
                      </label>
                      <textarea
                        rows={2}
                        value={selectedProject.curatorialStatement}
                        onChange={(e) =>
                          handleProjectFieldChange(
                            'curatorialStatement',
                            e.target.value
                          )
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                          Câu Chuyện Ý Tưởng (Concept / Storytelling)
                        </label>
                        <textarea
                          rows={4}
                          value={selectedProject.conceptNarrative}
                          onChange={(e) =>
                            handleProjectFieldChange(
                              'conceptNarrative',
                              e.target.value
                            )
                          }
                          className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-mono-plaque text-[10px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                          Kỹ Thuật Chế Tác & Chất Liệu (Execution Details)
                        </label>
                        <textarea
                          rows={4}
                          value={selectedProject.executionDetails}
                          onChange={(e) =>
                            handleProjectFieldChange(
                              'executionDetails',
                              e.target.value
                            )
                          }
                          className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-12 text-center text-sm text-[var(--text-muted)]">
                  Hãy chọn một dự án bên trái để chỉnh sửa.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: QUẢN LÝ ẢNH TRANG CON & TỰ ĐỘNG DÀN TRANG (SUB-PAGE GALLERY EDITOR)
           =================================================================== */}
        {activeTab === 'subpage-gallery' && selectedProject && (
          <div className="space-y-10">
            {/* Project Selector & Batch Upload Header */}
            <div className="flex flex-col justify-between gap-4 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-5 sm:flex-row sm:items-center">
              <div className="space-y-1.5">
                <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                  CHỌN DỰ ÁN ĐỂ QUẢN LÝ BỘ ẢNH TRANG CON (/PROJECT/:ID)
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={selectedProject.id}
                    onChange={(e) =>
                      setSelectedManagerProjectId(e.target.value)
                    }
                    className="border border-[var(--border-strong)] bg-[var(--bg-wall)] px-3.5 py-2 font-serif-gallery text-xl text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        Exhibit No. {p.exhibitNumber} — {p.title} (
                        {p.galleryImages.length} ảnh)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  ref={batchGalleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBatchGalleryUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => batchGalleryInputRef.current?.click()}
                  className="flex items-center gap-2 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-4 py-2.5 font-mono-plaque text-[11px] tracking-[0.15em] text-[#FAF9F5] uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
                  <span>+ Tải Lên Nhiều Ảnh Cùng Lúc (Batch Upload)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onPreviewProject(selectedProject.id)}
                  className="flex items-center gap-1.5 border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 font-mono-plaque text-[10.5px] tracking-[0.15em] text-[var(--text-primary)] uppercase hover:border-[var(--accent-gallery)]"
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span>Mở Trang Con Thực Tế</span>
                </button>
              </div>
            </div>

            {/* Batch URL Adder */}
            <div className="border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-5">
              <div className="mb-3 font-mono-plaque text-[10px] tracking-[0.18em] text-[var(--accent-gallery)] uppercase">
                THÊM DANH SÁCH URL ẢNH (MỖI DÒNG 1 LINK ẢNH — TỰ ĐỘNG ĐỌC KÍCH THƯỚC GỐC)
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <div className="lg:col-span-6">
                  <textarea
                    rows={2}
                    value={batchUrlsText}
                    onChange={(e) => setBatchUrlsText(e.target.value)}
                    placeholder="Dán 1 hoặc nhiều URL ảnh (mỗi dòng 1 link https://...)..."
                    className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] p-2.5 font-mono-plaque text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                  />
                </div>
                <div className="lg:col-span-4">
                  <input
                    type="text"
                    value={batchDefaultCaption}
                    onChange={(e) => setBatchDefaultCaption(e.target.value)}
                    placeholder="Chú thích chung cho loạt ảnh này (tuỳ chọn)..."
                    className="h-full w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                  />
                </div>
                <div className="lg:col-span-2">
                  <button
                    type="button"
                    disabled={isBusy || !batchUrlsText.trim()}
                    onClick={handleAddBatchUrls}
                    className="h-full min-h-[42px] w-full border border-[var(--border-strong)] bg-[var(--bg-wall)] px-3 py-2 font-mono-plaque text-[10.5px] tracking-[0.15em] text-[var(--text-primary)] uppercase transition-colors hover:border-[var(--accent-gallery)] hover:bg-[var(--accent-gallery)] hover:text-[#FAF9F5] disabled:opacity-40"
                  >
                    + Thêm Danh Sách URL
                  </button>
                </div>
              </div>
            </div>

            {/* Sortable / Drag-and-Drop Plate List with Aspect Ratio Tags & Layout Overrides */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                    DANH SÁCH ẢNH CHI TIẾT ({selectedProject.galleryImages.length}{' '}
                    PLATES) · HỖ TRỢ KÉO THẢ HOẶC BẤM NÚT LÊN/XUỐNG
                  </span>
                </div>
                <span className="font-mono-plaque text-[10px] text-[var(--text-muted)]">
                  Tự động nhận diện: Ngang tràn viền (AR ≥ 1.65) · Dọc ghép đôi
                  (AR ≤ 0.90) · Vuông cân đối (0.90 &lt; AR &lt; 1.65)
                </span>
              </div>

              <div className="space-y-3">
                {selectedProject.galleryImages.map((img, idx) => {
                  const badge = getVietnameseAspectBadge(img);
                  return (
                    <div
                      key={img.id}
                      draggable
                      onDragStart={() => setDraggedPlateIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleDropPlateReorder(idx)}
                      className={`flex flex-col gap-4 border bg-[var(--bg-plaque)] p-3.5 transition-all sm:flex-row sm:items-center ${
                        draggedPlateIndex === idx
                          ? 'border-[var(--accent-gallery)] opacity-60'
                          : 'border-[var(--border-hairline)]'
                      }`}
                    >
                      {/* Drag Handle + Thumbnail */}
                      <div className="flex items-center gap-2.5">
                        <div
                          className="cursor-grab text-[var(--text-muted)] active:cursor-grabbing"
                          title="Kéo thả để đổi thứ tự ảnh"
                        >
                          <GripVertical className="h-4 w-4" strokeWidth={1.5} />
                        </div>

                        <div
                          onClick={() => setPreviewLightboxIndex(idx)}
                          className="relative h-20 w-28 shrink-0 cursor-zoom-in overflow-hidden border border-[var(--border-hairline)] bg-neutral-900"
                        >
                          <img
                            src={img.url}
                            alt={img.caption}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 font-mono-plaque text-[9px] text-[#C8A97E]">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                        </div>
                      </div>

                      {/* Aspect Ratio Classification Tag + Caption Input */}
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`border px-2 py-0.5 font-mono-plaque text-[10px] tracking-wider uppercase ${badge.toneClass}`}
                          >
                            {badge.label}
                          </span>
                          <span className="font-mono-plaque text-[10px] text-[var(--text-muted)]">
                            {badge.arText}
                          </span>
                        </div>

                        <input
                          type="text"
                          value={img.caption}
                          onChange={(e) =>
                            handleUpdatePlate(img.id, {
                              caption: e.target.value,
                            })
                          }
                          placeholder="Nhập chú thích nghệ thuật cho bức ảnh này..."
                          className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                        />
                      </div>

                      {/* Layout Override Selector + Up/Down/Delete */}
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <select
                          value={img.layoutOverride ?? 'auto'}
                          onChange={(e) =>
                            handleUpdatePlate(img.id, {
                              layoutOverride: e.target.value as LayoutOverride,
                            })
                          }
                          aria-label="Chế độ hiển thị ảnh"
                          className="h-9 border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-2.5 font-mono-plaque text-[10px] text-[var(--text-primary)] uppercase focus:border-[var(--accent-gallery)] focus:outline-none"
                        >
                          <option value="auto">Tự động căn chỉnh</option>
                          <option value="full">Ép tràn viền 100%</option>
                          <option value="half">Ép chia đôi 50%</option>
                        </select>

                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveGalleryPlate(idx, -1)}
                          title="Đưa ảnh lên"
                          className="flex h-9 w-9 items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-wall)] text-[var(--text-primary)] hover:border-[var(--accent-gallery)] disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>

                        <button
                          type="button"
                          disabled={
                            idx === selectedProject.galleryImages.length - 1
                          }
                          onClick={() => handleMoveGalleryPlate(idx, 1)}
                          title="Đưa ảnh xuống"
                          className="flex h-9 w-9 items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-wall)] text-[var(--text-primary)] hover:border-[var(--accent-gallery)] disabled:opacity-30"
                        >
                          <ArrowDown
                            className="h-3.5 w-3.5"
                            strokeWidth={1.5}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePlate(img.id)}
                          title="Xoá ảnh này"
                          className="flex h-9 w-9 items-center justify-center border border-red-800/30 bg-red-950/10 text-red-500 hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LIVE SMART AUTO-LAYOUT PREVIEW */}
            <div className="space-y-4 border-t border-[var(--border-strong)] pt-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                    LIVE SMART AUTO-LAYOUT PREVIEW · XEM TRƯỚC DÀN TRANG TỰ ĐỘNG
                  </span>
                  <h3 className="font-serif-gallery text-2xl sm:text-3xl">
                    Bố Cục Hiển Thị Thực Tế Trên Trang Con “
                    {selectedProject.title}”
                  </h3>
                </div>
              </div>

              <div className="border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-4 sm:p-8">
                <SmartGalleryGrid
                  images={selectedProject.galleryImages}
                  projectTitle={selectedProject.title}
                  onOpenLightbox={(index) => setPreviewLightboxIndex(index)}
                />
              </div>
            </div>

            <LightboxModal
              images={selectedProject.galleryImages}
              activeIndex={previewLightboxIndex}
              projectTitle={selectedProject.title}
              exhibitNumber={selectedProject.exhibitNumber}
              onClose={() => setPreviewLightboxIndex(null)}
              onChangeIndex={(idx) => setPreviewLightboxIndex(idx)}
            />
          </div>
        )}

        {/* ===================================================================
            TAB 3: QUẢN LÝ NỘI DUNG CHUNG CỦA WEBSITE (SITE SETTINGS & BRANDING)
           =================================================================== */}
        {activeTab === 'site-settings' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left 7 Cols: Website Avatar, Brand Identity, Hero Manifesto & Contact / Footer Settings */}
            <div className="space-y-8 lg:col-span-7">
              {/* Section 0: Website Avatar, Curator Portrait & Browser Favicon */}
              <section className="space-y-5 border border-[var(--accent-gallery)] bg-[var(--bg-plaque)] p-5 sm:p-7">
                <div>
                  <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                    PHẦN 00 · THAY ĐỔI AVATAR CỦA WEBSITE (LOGO CHÂN DUNG & FAVICON TRÌNH DUYỆT)
                  </span>
                  <h2 className="font-serif-gallery text-2xl">
                    Ảnh Đại Diện Website & Chân Dung Giám Tuyển
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Ảnh Avatar này sẽ hiển thị cạnh tên thương hiệu trên thanh Header, khu vực Giám đốc Nghệ thuật và tự động đồng bộ làm biểu tượng tab trình duyệt (Favicon).
                  </p>
                </div>

                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  {/* Live Avatar Emblem Preview */}
                  <div className="flex flex-col items-center gap-2.5 border border-[var(--border-hairline)] bg-[var(--bg-wall)] p-4 sm:w-44">
                    <img
                      src={
                        siteSettings.brandAvatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=85'
                      }
                      alt={siteSettings.brandName}
                      className={`h-24 w-24 border-2 border-[var(--accent-gallery)] object-cover shadow-md ${
                        siteSettings.avatarShape === 'square'
                          ? 'rounded-none'
                          : 'rounded-full'
                      }`}
                    />
                    <span className="font-mono-plaque text-[9.5px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
                      XEM TRƯỚC AVATAR WEB
                    </span>
                  </div>

                  {/* Upload & URL Controls */}
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => brandAvatarInputRef.current?.click()}
                        className="flex items-center gap-2 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-4 py-2.5 font-mono-plaque text-[11px] tracking-[0.15em] text-[#FAF9F5] uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>
                          Tải Ảnh Avatar Từ Máy Tính / Điện Thoại (Tự Nén WebP)
                        </span>
                      </button>

                      <select
                        value={siteSettings.avatarShape ?? 'circle'}
                        onChange={(e) =>
                          updateSiteSettings({
                            avatarShape: e.target.value as 'circle' | 'square',
                          })
                        }
                        aria-label="Kiểu khung Avatar"
                        className="border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2.5 font-mono-plaque text-[10.5px] text-[var(--text-primary)] uppercase focus:border-[var(--accent-gallery)] focus:outline-none"
                      >
                        <option value="circle">Khung Tròn (Circle)</option>
                        <option value="square">
                          Khung Vuông Bảo Tàng (Square)
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                        Hoặc Dán Đường Dẫn Ảnh Avatar (URL / Base64)
                      </label>
                      <input
                        type="text"
                        value={siteSettings.brandAvatar ?? ''}
                        onChange={(e) =>
                          updateSiteSettings({ brandAvatar: e.target.value })
                        }
                        placeholder="https://..."
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                        Tên & Chức Danh Giám Đốc Nghệ Thuật (Hiển thị cạnh Avatar)
                      </label>
                      <input
                        type="text"
                        value={siteSettings.curatorName ?? ''}
                        onChange={(e) =>
                          updateSiteSettings({ curatorName: e.target.value })
                        }
                        placeholder="VD: Lê Minh Quân — Giám Đốc Nghệ Thuật"
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-xs text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={siteSettings.showAvatarInHeader !== false}
                        onChange={(e) =>
                          updateSiteSettings({
                            showAvatarInHeader: e.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[var(--accent-gallery)]"
                      />
                      <span>
                        Hiển thị Avatar cạnh Tên Website trên thanh điều hướng Header & đồng bộ làm Favicon trình duyệt
                      </span>
                    </label>
                  </div>
                </div>
              </section>

              {/* Section A: Brand Name & Hero Manifesto */}
              <section className="space-y-5 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-5 sm:p-7">
                <div>
                  <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                    PHẦN 01 · TÊN THƯƠNG HIỆU & TUYÊN NGÔN NGHỆ THUẬT (HERO MANIFESTO)
                  </span>
                  <h2 className="font-serif-gallery text-2xl">
                    Tiêu Đề Sảnh Chính & Tuyên Ngôn Giám Tuyển
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Tên Website / Thương Hiệu Cá Nhân (Header Title)
                    </label>
                    <input
                      type="text"
                      value={siteSettings.brandName}
                      onChange={(e) =>
                        updateSiteSettings({ brandName: e.target.value })
                      }
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Dòng Chữ Phụ Cạnh Logo (Header Tagline)
                    </label>
                    <input
                      type="text"
                      value={siteSettings.brandSubtitle}
                      onChange={(e) =>
                        updateSiteSettings({ brandSubtitle: e.target.value })
                      }
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 font-mono-plaque text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                    Nhãn Phía Trên Tiêu Đề Lớn (Hero Kicker Badge)
                  </label>
                  <input
                    type="text"
                    value={siteSettings.heroBadge}
                    onChange={(e) =>
                      updateSiteSettings({ heroBadge: e.target.value })
                    }
                    className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 font-mono-plaque text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Tiêu Đề Lớn — Phần Đầu
                    </label>
                    <input
                      type="text"
                      value={siteSettings.heroTitlePrefix}
                      onChange={(e) =>
                        updateSiteSettings({ heroTitlePrefix: e.target.value })
                      }
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--accent-gallery)] uppercase">
                      Chữ Nhấn In Nghiêng (Accent)
                    </label>
                    <input
                      type="text"
                      value={siteSettings.heroTitleAccent}
                      onChange={(e) =>
                        updateSiteSettings({ heroTitleAccent: e.target.value })
                      }
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 font-serif-gallery text-base text-[var(--accent-gallery)] italic focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Tiêu Đề Lớn — Phần Cuối
                    </label>
                    <input
                      type="text"
                      value={siteSettings.heroTitleSuffix}
                      onChange={(e) =>
                        updateSiteSettings({ heroTitleSuffix: e.target.value })
                      }
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                    Lời Tựa Tuyên Ngôn Nghệ Thuật (Hero Subtitle / Manifesto)
                  </label>
                  <textarea
                    rows={3}
                    value={siteSettings.heroManifesto}
                    onChange={(e) =>
                      updateSiteSettings({ heroManifesto: e.target.value })
                    }
                    className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                  />
                </div>
              </section>

              {/* Section B: Contact Info, Social Links & Commission Form Copy */}
              <section className="space-y-5 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-5 sm:p-7">
                <div>
                  <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                    PHẦN 02 · THÔNG TIN LIÊN HỆ, MẠNG XÃ HỘI & BIỂU MẪU ĐẶT LỊCH
                  </span>
                  <h2 className="font-serif-gallery text-2xl">
                    Liên Hệ Nhận Job & Chân Trang (Footer)
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Email Nhận Job / Tư Vấn
                    </label>
                    <input
                      type="email"
                      value={siteSettings.contactEmail}
                      onChange={(e) =>
                        updateSiteSettings({ contactEmail: e.target.value })
                      }
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Số Điện Thoại / Zalo Liên Hệ
                    </label>
                    <input
                      type="text"
                      value={siteSettings.contactPhoneZalo}
                      onChange={(e) =>
                        updateSiteSettings({ contactPhoneZalo: e.target.value })
                      }
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Khung Giờ Tiếp Khách (Gallery Hours)
                    </label>
                    <input
                      type="text"
                      value={siteSettings.galleryHours}
                      onChange={(e) =>
                        updateSiteSettings({ galleryHours: e.target.value })
                      }
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 font-mono-plaque text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Địa Điểm Studio (Locations)
                    </label>
                    <input
                      type="text"
                      value={siteSettings.studioLocations}
                      onChange={(e) =>
                        updateSiteSettings({ studioLocations: e.target.value })
                      }
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 font-mono-plaque text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Social Links: Behance, Instagram, LinkedIn */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Link Behance
                    </label>
                    <input
                      type="url"
                      value={siteSettings.socialLinks.behance}
                      onChange={(e) =>
                        updateSiteSettings({
                          socialLinks: {
                            ...siteSettings.socialLinks,
                            behance: e.target.value,
                          },
                        })
                      }
                      placeholder="https://behance.net/..."
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Link Instagram
                    </label>
                    <input
                      type="url"
                      value={siteSettings.socialLinks.instagram}
                      onChange={(e) =>
                        updateSiteSettings({
                          socialLinks: {
                            ...siteSettings.socialLinks,
                            instagram: e.target.value,
                          },
                        })
                      }
                      placeholder="https://instagram.com/..."
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Link LinkedIn
                    </label>
                    <input
                      type="url"
                      value={siteSettings.socialLinks.linkedin}
                      onChange={(e) =>
                        updateSiteSettings({
                          socialLinks: {
                            ...siteSettings.socialLinks,
                            linkedin: e.target.value,
                          },
                        })
                      }
                      placeholder="https://linkedin.com/in/..."
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Commission Section Heading & Footer Copyright */}
                <div className="space-y-4 border-t border-[var(--border-hairline)] pt-4">
                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Tiêu Đề Biểu Mẫu Đặt Lịch Tư Vấn (Commission Heading)
                    </label>
                    <input
                      type="text"
                      value={siteSettings.commissionTitle}
                      onChange={(e) =>
                        updateSiteSettings({ commissionTitle: e.target.value })
                      }
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Mô Tả Ngắn Dưới Tiêu Đề Đặt Lịch
                    </label>
                    <textarea
                      rows={2}
                      value={siteSettings.commissionDescription}
                      onChange={(e) =>
                        updateSiteSettings({
                          commissionDescription: e.target.value,
                        })
                      }
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Dòng Bản Quyền Chân Trang (Footer Copyright)
                    </label>
                    <input
                      type="text"
                      value={siteSettings.footerCopyright}
                      onChange={(e) =>
                        updateSiteSettings({ footerCopyright: e.target.value })
                      }
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2 font-mono-plaque text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Right 5 Cols: Default Lighting Mode & Filter Categories Manager */}
            <div className="space-y-8 lg:col-span-5">
              {/* Section C: Default Gallery Lighting Mode */}
              <section className="space-y-4 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-5 sm:p-7">
                <div>
                  <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                    PHẦN 03 · CHẾ ĐỘ ÁNH SÁNG MẶC ĐỊNH KHI KHÁCH MỚI VÀO WEB
                  </span>
                  <h2 className="font-serif-gallery text-2xl">
                    Gallery Lighting Mode Mặc Định
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        mode: 'daylight' as LightingMode,
                        title: 'Sáng Giấy Mỹ Thuật',
                        hex: 'Daylight Paper #F7F6F2',
                        icon: SunMedium,
                      },
                      {
                        mode: 'spotlight' as LightingMode,
                        title: 'Tối Phòng Tranh',
                        hex: 'Spotlight Velvet #0E0E0E',
                        icon: LampCeiling,
                      },
                    ] as const
                  ).map((option) => {
                    const Icon = option.icon;
                    const isSelected =
                      siteSettings.defaultLightingMode === option.mode;
                    return (
                      <button
                        key={option.mode}
                        type="button"
                        onClick={() => {
                          updateSiteSettings({
                            defaultLightingMode: option.mode,
                          });
                          showToast(
                            `Đã đặt chế độ màu mặc định là "${option.title}".`
                          );
                        }}
                        className={`flex flex-col items-start gap-2 border p-4 text-left transition-all ${
                          isSelected
                            ? 'border-[var(--accent-gallery)] bg-[var(--accent-gallery-soft)]'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-wall)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <Icon
                            className="h-5 w-5 text-[var(--accent-gallery)]"
                            strokeWidth={1.5}
                          />
                          {isSelected && (
                            <span className="bg-[var(--accent-gallery)] px-2 py-0.5 font-mono-plaque text-[9px] text-[#FAF9F5] uppercase">
                              Mặc Định
                            </span>
                          )}
                        </div>
                        <div className="font-serif-gallery text-lg font-medium text-[var(--text-primary)]">
                          {option.title}
                        </div>
                        <div className="font-mono-plaque text-[10px] text-[var(--text-muted)]">
                          {option.hex}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Section D: Filter Categories Manager */}
              <section className="space-y-5 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-5 sm:p-7">
                <div>
                  <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                    PHẦN 04 · QUẢN LÝ DANH MỤC BỘ LỌC (THÊM / SỬA / XOÁ TAB HẠNG MỤC)
                  </span>
                  <h2 className="font-serif-gallery text-2xl">
                    Các Tab Hạng Mục Thiết Kế ({siteSettings.categories.length})
                  </h2>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Khi bạn đổi tên một hạng mục tại đây, toàn bộ các dự án thuộc hạng mục đó sẽ tự động được đồng bộ sang tên mới.
                  </p>
                </div>

                {/* Add New Category Bar */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                    placeholder="Nhập tên hạng mục mới (VD: Editorial & Book)..."
                    className="flex-1 border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="flex items-center gap-1.5 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-3.5 py-2 font-mono-plaque text-[10px] tracking-[0.15em] text-[#FAF9F5] uppercase"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Thêm</span>
                  </button>
                </div>

                {/* Existing Categories List */}
                <div className="divide-y divide-[var(--border-hairline)] border border-[var(--border-hairline)] bg-[var(--bg-wall)]">
                  {siteSettings.categories.map((cat, idx) => {
                    const projectCount = projects.filter(
                      (p) => p.category === cat
                    ).length;
                    const isEditing = editingCategoryIndex === idx;

                    return (
                      <div
                        key={`${cat}-${idx}`}
                        className="flex items-center justify-between gap-2 p-3"
                      >
                        {isEditing ? (
                          <div className="flex flex-1 items-center gap-2">
                            <input
                              type="text"
                              autoFocus
                              value={editingCategoryValue}
                              onChange={(e) =>
                                setEditingCategoryValue(e.target.value)
                              }
                              className="flex-1 border border-[var(--accent-gallery)] bg-[var(--bg-plaque)] px-2.5 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                renameCategoryAcrossPortfolio(
                                  cat,
                                  editingCategoryValue
                                );
                                setEditingCategoryIndex(null);
                                showToast(
                                  `Đã đổi tên danh mục "${cat}" thành "${editingCategoryValue.trim()}".`
                                );
                              }}
                              className="bg-[var(--accent-gallery)] px-2.5 py-1 font-mono-plaque text-[10px] text-[#FAF9F5] uppercase"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryIndex(null)}
                              className="border border-[var(--border-hairline)] px-2 py-1 font-mono-plaque text-[10px] text-[var(--text-muted)] uppercase"
                            >
                              Huỷ
                            </button>
                          </div>
                        ) : (
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-mono-plaque text-xs text-[var(--text-primary)]">
                              {cat}
                            </div>
                            <div className="font-mono-plaque text-[10px] text-[var(--text-muted)]">
                              {projectCount} dự án trong hạng mục này
                            </div>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryIndex(idx);
                                setEditingCategoryValue(cat);
                              }}
                              className="border border-[var(--border-hairline)] bg-[var(--bg-plaque)] px-2 py-1 font-mono-plaque text-[9.5px] text-[var(--text-secondary)] uppercase hover:border-[var(--accent-gallery)] hover:text-[var(--text-primary)]"
                            >
                              Sửa Tên
                            </button>

                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveCategory(idx, -1)}
                              className="flex h-7 w-7 items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-plaque)] disabled:opacity-30"
                            >
                              <ArrowUp className="h-3 w-3" strokeWidth={1.5} />
                            </button>

                            <button
                              type="button"
                              disabled={
                                idx === siteSettings.categories.length - 1
                              }
                              onClick={() => handleMoveCategory(idx, 1)}
                              className="flex h-7 w-7 items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-plaque)] disabled:opacity-30"
                            >
                              <ArrowDown
                                className="h-3 w-3"
                                strokeWidth={1.5}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              className="flex h-7 w-7 items-center justify-center border border-red-800/30 bg-red-950/10 text-red-500 hover:bg-red-600 hover:text-white"
                            >
                              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: XUẤT BẢN & ĐỒNG BỘ DỮ LIỆU (PUBLISH & DATA SYNC)
           =================================================================== */}
        {activeTab === 'publish-sync' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Left 6 Cols: Instant Apply + Export/Import src/data/portfolio-data.json */}
            <div className="space-y-8 lg:col-span-6">
              <section className="space-y-5 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-5 sm:p-7">
                <div>
                  <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                    PHẦN 01 · XUẤT BẢN TỨC THÌ & ĐỒNG BỘ FILE CHUẨN (PORTFOLIO-DATA.JSON)
                  </span>
                  <h2 className="font-serif-gallery text-2xl">
                    Lưu Trực Tiếp Hoặc Xuất File Chuẩn Cho Mã Nguồn
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                    Sau khi cập nhật dự án và nội dung trên <code>/admin</code>, bạn có thể bấm{' '}
                    <strong>“Lưu & Áp Dụng Ngay”</strong> để cập nhật tức thì trên trình duyệt, hoặc bấm{' '}
                    <strong>“Xuất File Chuẩn (portfolio-data.json)”</strong> để tải file dữ liệu chuẩn về ghi đè vào thư mục{' '}
                    <code>src/data/portfolio-data.json</code> trước khi đóng gói web/app.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleSaveAndApplyClick}
                    className="flex items-center justify-center gap-2 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-4 py-3.5 font-mono-plaque text-xs tracking-[0.16em] text-[#FAF9F5] uppercase transition-opacity hover:opacity-90"
                  >
                    <Save className="h-4 w-4" strokeWidth={1.5} />
                    <span>Lưu & Áp Dụng Ngay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      exportPortfolioJson();
                      showToast(
                        'Đã tải xuống file chuẩn portfolio-data.json (Hãy chép đè vào src/data/portfolio-data.json).'
                      );
                    }}
                    className="flex items-center justify-center gap-2 border border-[var(--text-primary)] bg-[var(--text-primary)] px-4 py-3.5 font-mono-plaque text-xs tracking-[0.16em] text-[var(--bg-wall)] uppercase transition-opacity hover:opacity-90"
                  >
                    <Download className="h-4 w-4" strokeWidth={1.5} />
                    <span>Xuất File Chuẩn (portfolio-data.json)</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-hairline)] pt-4">
                  <input
                    ref={importJsonInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportJsonFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => importJsonInputRef.current?.click()}
                    className="flex items-center gap-2 border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-4 py-2.5 font-mono-plaque text-[10.5px] tracking-[0.15em] text-[var(--text-primary)] uppercase hover:border-[var(--accent-gallery)]"
                  >
                    <FileJson className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Nhập File JSON (Import)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(canonicalJsonPreview);
                      showToast(
                        'Đã sao chép toàn bộ nội dung portfolio-data.json vào Clipboard.'
                      );
                    }}
                    className="flex items-center gap-2 border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-4 py-2.5 font-mono-plaque text-[10.5px] tracking-[0.15em] text-[var(--text-primary)] uppercase hover:border-[var(--accent-gallery)]"
                  >
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Copy JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetToSeedData();
                      showToast(
                        'Đã khôi phục dữ liệu gốc từ src/data/portfolio-data.json.'
                      );
                    }}
                    className="flex items-center gap-2 border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-4 py-2.5 font-mono-plaque text-[10.5px] tracking-[0.15em] text-[var(--text-muted)] uppercase hover:border-red-600 hover:text-red-500"
                  >
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Khôi Phục Dữ Liệu Gốc</span>
                  </button>
                </div>

                {/* Live JSON Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                    <span>CẤU TRÚC FILE CHUẨN: SRC/DATA/PORTFOLIO-DATA.JSON</span>
                    <span>{projects.length} PROJECTS + SITE SETTINGS</span>
                  </div>
                  <pre className="max-h-64 overflow-auto border border-[var(--border-hairline)] bg-[var(--bg-wall)] p-3 font-mono-plaque text-[10px] leading-relaxed text-[var(--text-secondary)]">
                    {canonicalJsonPreview.slice(0, 2600)}
                    {canonicalJsonPreview.length > 2600
                      ? '\n... (Bấm "Xuất File Chuẩn" hoặc "Copy JSON" để lấy toàn bộ dữ liệu)'
                      : ''}
                  </pre>
                </div>
              </section>
            </div>

            {/* Right 6 Cols: Supabase Cloud Storage & Database Sync (src/services/cloudSync.ts) */}
            <div className="space-y-8 lg:col-span-6">
              <section className="space-y-5 border border-[var(--border-hairline)] bg-[var(--bg-plaque)] p-5 sm:p-7">
                <div>
                  <span className="font-mono-plaque text-[10px] tracking-[0.2em] text-[var(--accent-gallery)] uppercase">
                    PHẦN 02 · ĐỒNG BỘ ĐÁM MÂY SUPABASE STORAGE & DATABASE (SRC/SERVICES/CLOUDSYNC.TS)
                  </span>
                  <h2 className="font-serif-gallery text-2xl">
                    Kết Nối Đám Mây Tự Động Khi Điền API Key
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                    Module <code>src/services/cloudSync.ts</code> đã được tích hợp sẵn. Khi bạn điền{' '}
                    <code>Supabase URL</code> và <code>Anon / Service Key</code> dưới đây (hoặc cấu hình trong <code>.env</code>), hệ thống sẽ tự động đẩy dữ liệu và ảnh lên đám mây.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Supabase Project URL (VITE_SUPABASE_URL)
                    </label>
                    <input
                      type="url"
                      value={cloudConfig.supabaseUrl}
                      onChange={(e) =>
                        setCloudConfig((prev) => ({
                          ...prev,
                          supabaseUrl: e.target.value,
                        }))
                      }
                      placeholder="https://your-project-id.supabase.co"
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 font-mono-plaque text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                      Supabase API Key (VITE_SUPABASE_ANON_KEY)
                    </label>
                    <input
                      type="password"
                      value={cloudConfig.supabaseAnonKey}
                      onChange={(e) =>
                        setCloudConfig((prev) => ({
                          ...prev,
                          supabaseAnonKey: e.target.value,
                        }))
                      }
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3.5 py-2.5 font-mono-plaque text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                        Storage Bucket (Lưu Ảnh & JSON)
                      </label>
                      <input
                        type="text"
                        value={cloudConfig.bucketName}
                        onChange={(e) =>
                          setCloudConfig((prev) => ({
                            ...prev,
                            bucketName: e.target.value,
                          }))
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 font-mono-plaque text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-mono-plaque text-[10px] tracking-[0.15em] text-[var(--text-muted)] uppercase">
                        Database Table Name
                      </label>
                      <input
                        type="text"
                        value={cloudConfig.tableName}
                        onChange={(e) =>
                          setCloudConfig((prev) => ({
                            ...prev,
                            tableName: e.target.value,
                          }))
                        }
                        className="w-full border border-[var(--border-hairline)] bg-[var(--bg-wall)] px-3 py-2 font-mono-plaque text-xs text-[var(--text-primary)] focus:border-[var(--accent-gallery)] focus:outline-none"
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={cloudConfig.autoSyncOnSave}
                      onChange={(e) => {
                        const updated = {
                          ...cloudConfig,
                          autoSyncOnSave: e.target.checked,
                        };
                        setCloudConfig(updated);
                        saveCloudSyncConfig(updated);
                      }}
                      className="h-4 w-4 accent-[var(--accent-gallery)]"
                    />
                    <span>
                      Tự động tải ảnh lên Supabase Storage & đồng bộ Database mỗi khi bấm “Lưu & Áp Dụng Ngay”
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-hairline)] pt-4 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handlePushToSupabase}
                    className="flex items-center justify-center gap-2 border border-[var(--accent-gallery)] bg-[var(--accent-gallery)] px-4 py-3 font-mono-plaque text-[11px] tracking-[0.15em] text-[#FAF9F5] uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <CloudUpload className="h-4 w-4" strokeWidth={1.5} />
                    <span>Đồng Bộ Lên Đám Mây (Push)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handlePullFromSupabase}
                    className="flex items-center justify-center gap-2 border border-[var(--border-strong)] bg-[var(--bg-wall)] px-4 py-3 font-mono-plaque text-[11px] tracking-[0.15em] text-[var(--text-primary)] uppercase transition-colors hover:border-[var(--accent-gallery)] disabled:opacity-50"
                  >
                    <CloudDownload className="h-4 w-4" strokeWidth={1.5} />
                    <span>Tải Từ Đám Mây Về (Pull)</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
