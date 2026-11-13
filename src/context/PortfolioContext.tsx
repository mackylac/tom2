import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DEFAULT_SITE_SETTINGS, SEED_PROJECTS } from '../data/seedProjects';
import {
  isCloudSyncConfigured,
  loadCloudSyncConfig,
  pushPortfolioToSupabase,
} from '../services/cloudSync';
import {
  buildCanonicalArchivePayload,
  clearAdminSession,
  exportPortfolioToJsonFile,
  isAdminSessionActive,
  loadLightingFromStorage,
  loadProjectsFromStorage,
  loadSiteSettingsFromStorage,
  normalizeExhibitNumbers,
  parseAndValidatePortfolioJson,
  resequenceExhibitNumbers,
  saveLightingToStorage,
  saveProjectsToStorage,
  saveSiteSettingsToStorage,
  verifyAndCreateAdminSession,
} from '../services/portfolioStorageService';
import type {
  CategoryFilter,
  LightingMode,
  PortfolioArchivePayload,
  Project,
  SiteSettings,
} from '../types/portfolio';

interface PortfolioContextValue {
  /** All projects (including hidden ones for /admin) */
  projects: Project[];
  /** Only visible projects (!p.hidden) for the public Main Exhibition Hall */
  visibleProjects: Project[];
  siteSettings: SiteSettings;
  updateSiteSettings: (
    updater: Partial<SiteSettings> | ((prev: SiteSettings) => SiteSettings)
  ) => void;
  renameCategoryAcrossPortfolio: (oldName: string, newName: string) => void;
  lightingMode: LightingMode;
  setLightingMode: (mode: LightingMode) => void;
  toggleLightingMode: () => void;
  activeCategory: CategoryFilter;
  setActiveCategory: (category: CategoryFilter) => void;
  isStudioManagerOpen: boolean;
  openStudioManager: (projectId?: string) => void;
  closeStudioManager: () => void;
  selectedManagerProjectId: string | null;
  setSelectedManagerProjectId: (id: string | null) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (id: string) => void;
  toggleProjectVisibility: (id: string) => void;
  moveProjectOrder: (index: number, direction: -1 | 1) => void;
  resetToSeedData: () => void;
  saveAndApplyAllNow: () => Promise<{ ok: boolean; message: string }>;
  exportPortfolioJson: () => void;
  importPortfolioJson: (jsonText: string) => { ok: boolean; message: string };
  applyImportedArchive: (archive: PortfolioArchivePayload) => void;
  isAdminAuthenticated: boolean;
  loginAdmin: (pin: string) => boolean;
  logoutAdmin: () => void;
  lastSavedAt: string;
}

const PortfolioContext = createContext<PortfolioContextValue | undefined>(
  undefined
);

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() =>
    loadSiteSettingsFromStorage()
  );

  const [projects, setProjects] = useState<Project[]>(() =>
    loadProjectsFromStorage()
  );

  const [lightingMode, setLightingModeState] = useState<LightingMode>(() =>
    loadLightingFromStorage(siteSettings.defaultLightingMode)
  );

  const [activeCategory, setActiveCategory] =
    useState<CategoryFilter>('All Works');
  const [isStudioManagerOpen, setIsStudioManagerOpen] = useState(false);
  const [selectedManagerProjectId, setSelectedManagerProjectId] = useState<
    string | null
  >(() => projects[0]?.id ?? null);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(
    () => isAdminSessionActive()
  );

  const [lastSavedAt, setLastSavedAt] = useState<string>(() =>
    new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );

  const visibleProjects = useMemo(
    () => projects.filter((p) => !p.hidden),
    [projects]
  );

  useEffect(() => {
    saveProjectsToStorage(projects);
  }, [projects]);

  useEffect(() => {
    saveSiteSettingsToStorage(siteSettings);
    document.title = `${siteSettings.brandName} — Digital Art Gallery`;

    if (siteSettings.brandAvatar) {
      let iconLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        document.head.appendChild(iconLink);
      }
      iconLink.href = siteSettings.brandAvatar;

      const appleTouchIcon = document.querySelector<HTMLLinkElement>(
        "link[rel='apple-touch-icon']"
      );
      if (appleTouchIcon) {
        appleTouchIcon.href = siteSettings.brandAvatar;
      }
    }
  }, [siteSettings]);

  useEffect(() => {
    document.documentElement.setAttribute('data-lighting', lightingMode);
    saveLightingToStorage(lightingMode);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute(
        'content',
        lightingMode === 'spotlight' ? '#0E0E0E' : '#F7F6F2'
      );
    }
  }, [lightingMode]);

  const setLightingMode = (mode: LightingMode) => {
    setLightingModeState(mode);
  };

  const toggleLightingMode = () => {
    setLightingModeState((prev) =>
      prev === 'daylight' ? 'spotlight' : 'daylight'
    );
  };

  const updateSiteSettings = (
    updater: Partial<SiteSettings> | ((prev: SiteSettings) => SiteSettings)
  ) => {
    setSiteSettings((prev) => {
      const next =
        typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      // If defaultLightingMode changed, also apply it immediately so the admin sees the change
      if (
        !(' socialLinks' in next) &&
        next.defaultLightingMode !== prev.defaultLightingMode
      ) {
        setLightingModeState(next.defaultLightingMode);
      }
      return next;
    });
  };

  const renameCategoryAcrossPortfolio = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || oldName === trimmed) return;

    setSiteSettings((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c === oldName ? trimmed : c)),
    }));

    setProjects((prev) =>
      prev.map((proj) =>
        proj.category === oldName ? { ...proj, category: trimmed } : proj
      )
    );

    if (activeCategory === oldName) {
      setActiveCategory(trimmed);
    }
  };

  const openStudioManager = (projectId?: string) => {
    if (projectId) {
      setSelectedManagerProjectId(projectId);
    } else if (!selectedManagerProjectId && projects.length > 0) {
      setSelectedManagerProjectId(projects[0].id);
    }
    setIsStudioManagerOpen(true);
  };

  const closeStudioManager = () => {
    setIsStudioManagerOpen(false);
  };

  const addProject = (project: Project) => {
    setProjects((prev) => resequenceExhibitNumbers([project, ...prev]));
    setSelectedManagerProjectId(project.id);
  };

  const updateProject = (updated: Project) => {
    setProjects((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      const next = resequenceExhibitNumbers(filtered);
      if (selectedManagerProjectId === id) {
        setSelectedManagerProjectId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const toggleProjectVisibility = (id: string) => {
    setProjects((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, hidden: !item.hidden } : item
      )
    );
  };

  const moveProjectOrder = (index: number, direction: -1 | 1) => {
    setProjects((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return resequenceExhibitNumbers(copy);
    });
  };

  const resetToSeedData = () => {
    setProjects(SEED_PROJECTS);
    setSiteSettings(DEFAULT_SITE_SETTINGS);
    setLightingModeState(DEFAULT_SITE_SETTINGS.defaultLightingMode);
    setSelectedManagerProjectId(SEED_PROJECTS[0]?.id ?? null);
    saveProjectsToStorage(SEED_PROJECTS);
    saveSiteSettingsToStorage(DEFAULT_SITE_SETTINGS);
  };

  const saveAndApplyAllNow = async (): Promise<{
    ok: boolean;
    message: string;
  }> => {
    saveProjectsToStorage(projects);
    saveSiteSettingsToStorage(siteSettings);
    const nowLabel = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastSavedAt(nowLabel);

    const cloudConfig = loadCloudSyncConfig();
    if (isCloudSyncConfigured(cloudConfig) && cloudConfig.autoSyncOnSave) {
      const payload = buildCanonicalArchivePayload(projects, siteSettings);
      const cloudRes = await pushPortfolioToSupabase(payload, cloudConfig);
      return {
        ok: cloudRes.ok,
        message: cloudRes.ok
          ? `Đã lưu & áp dụng tức thì lúc ${nowLabel} (Đồng bộ Supabase Cloud thành công).`
          : `Đã lưu cục bộ lúc ${nowLabel}. Cảnh báo Cloud: ${cloudRes.message}`,
      };
    }

    return {
      ok: true,
      message: `Đã Lưu & Áp Dụng Ngay toàn bộ ${projects.length} dự án và cấu hình website lúc ${nowLabel}.`,
    };
  };

  const exportPortfolioJson = () => {
    exportPortfolioToJsonFile(projects, siteSettings);
  };

  const importPortfolioJson = (
    jsonText: string
  ): { ok: boolean; message: string } => {
    const result = parseAndValidatePortfolioJson(jsonText);
    if (result.ok && result.projects) {
      setProjects(result.projects);
      setSelectedManagerProjectId(result.projects[0]?.id ?? null);
      if (result.siteSettings) {
        setSiteSettings(result.siteSettings);
        setLightingModeState(result.siteSettings.defaultLightingMode);
      }
    }
    return { ok: result.ok, message: result.message };
  };

  const applyImportedArchive = (archive: PortfolioArchivePayload) => {
    if (Array.isArray(archive.projects) && archive.projects.length > 0) {
      const normalized = normalizeExhibitNumbers(archive.projects);
      setProjects(normalized);
      setSelectedManagerProjectId(normalized[0]?.id ?? null);
    }
    if (archive.siteSettings) {
      setSiteSettings({
        ...DEFAULT_SITE_SETTINGS,
        ...archive.siteSettings,
      });
    }
  };

  const loginAdmin = (pin: string): boolean => {
    const ok = verifyAndCreateAdminSession(pin);
    if (ok) {
      setIsAdminAuthenticated(true);
    }
    return ok;
  };

  const logoutAdmin = () => {
    clearAdminSession();
    setIsAdminAuthenticated(false);
  };

  return (
    <PortfolioContext.Provider
      value={{
        projects,
        visibleProjects,
        siteSettings,
        updateSiteSettings,
        renameCategoryAcrossPortfolio,
        lightingMode,
        setLightingMode,
        toggleLightingMode,
        activeCategory,
        setActiveCategory,
        isStudioManagerOpen,
        openStudioManager,
        closeStudioManager,
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
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};

export function usePortfolio(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return ctx;
}
