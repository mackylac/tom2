import { DEFAULT_SITE_SETTINGS, SEED_PROJECTS } from '../data/seedProjects';
import type {
  LightingMode,
  PortfolioArchivePayload,
  Project,
  SiteSettings,
} from '../types/portfolio';
import { uploadImageToSupabaseStorage } from './cloudSync';

const STORAGE_KEY_PROJECTS = 'atelier_vespera_projects_v2';
const STORAGE_KEY_SITE_SETTINGS = 'atelier_vespera_site_settings_v2';
const STORAGE_KEY_LIGHTING = 'atelier_vespera_lighting_v2';
const SESSION_KEY_ADMIN_AUTH = 'atelier_vespera_admin_session_v1';

export function getExpectedAdminPassword(): string {
  const envPwd = (
    import.meta.env.VITE_ADMIN_PASSWORD as string | undefined
  )?.trim();
  return envPwd && envPwd.length > 0 ? envPwd : '2026';
}

export function isAdminSessionActive(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY_ADMIN_AUTH) === 'authenticated';
  } catch {
    return false;
  }
}

export function verifyAndCreateAdminSession(inputPin: string): boolean {
  const expected = getExpectedAdminPassword();
  if (inputPin.trim() === expected) {
    try {
      sessionStorage.setItem(SESSION_KEY_ADMIN_AUTH, 'authenticated');
    } catch {
      // Ignore sessionStorage error
    }
    return true;
  }
  return false;
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY_ADMIN_AUTH);
  } catch {
    // Ignore sessionStorage error
  }
}

export function normalizeExhibitNumbers(list: Project[]): Project[] {
  return list.map((item, idx) => ({
    ...item,
    exhibitNumber:
      item.exhibitNumber && item.exhibitNumber.trim().length > 0
        ? item.exhibitNumber.trim()
        : String(idx + 1).padStart(2, '0'),
  }));
}

export function resequenceExhibitNumbers(list: Project[]): Project[] {
  return list.map((item, idx) => ({
    ...item,
    exhibitNumber: String(idx + 1).padStart(2, '0'),
  }));
}

export function loadProjectsFromStorage(): Project[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY_PROJECTS) ??
      localStorage.getItem('atelier_vespera_projects_v1');
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as Project[];
      }
    }
  } catch {
    // Fallback to seed projects if storage is unavailable
  }
  return SEED_PROJECTS;
}

export function saveProjectsToStorage(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  } catch {
    // Ignore storage quota exceeded errors
  }
}

export function loadSiteSettingsFromStorage(): SiteSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SITE_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SiteSettings>;
      return {
        ...DEFAULT_SITE_SETTINGS,
        ...parsed,
        socialLinks: {
          ...DEFAULT_SITE_SETTINGS.socialLinks,
          ...(parsed.socialLinks ?? {}),
        },
        categories:
          Array.isArray(parsed.categories) && parsed.categories.length > 0
            ? parsed.categories
            : DEFAULT_SITE_SETTINGS.categories,
      };
    }
  } catch {
    // Ignore storage error
  }
  return DEFAULT_SITE_SETTINGS;
}

export function saveSiteSettingsToStorage(settings: SiteSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SITE_SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore storage error
  }
}

export function loadLightingFromStorage(
  fallbackDefault: LightingMode = DEFAULT_SITE_SETTINGS.defaultLightingMode
): LightingMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LIGHTING);
    if (saved === 'spotlight' || saved === 'daylight') {
      return saved;
    }
  } catch {
    // Ignore storage error
  }
  return fallbackDefault;
}

export function saveLightingToStorage(mode: LightingMode): void {
  try {
    localStorage.setItem(STORAGE_KEY_LIGHTING, mode);
  } catch {
    // Ignore storage error
  }
}

export function buildCanonicalArchivePayload(
  projects: Project[],
  siteSettings: SiteSettings
): PortfolioArchivePayload {
  return {
    version: '2.0.0',
    updatedAt: new Date().toISOString(),
    siteSettings,
    projects,
  };
}

export function exportPortfolioToJsonFile(
  projects: Project[],
  siteSettings: SiteSettings
): void {
  const payload = buildCanonicalArchivePayload(projects, siteSettings);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'portfolio-data.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function parseAndValidatePortfolioJson(jsonText: string): {
  ok: boolean;
  message: string;
  projects?: Project[];
  siteSettings?: SiteSettings;
} {
  try {
    const parsed = JSON.parse(jsonText) as
      | Project[]
      | {
          projects?: Project[];
          siteSettings?: Partial<SiteSettings>;
        };

    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.projects)
        ? parsed.projects
        : null;

    if (!list || list.length === 0) {
      return {
        ok: false,
        message:
          'File JSON không hợp lệ hoặc không chứa danh sách dự án (projects[]).',
      };
    }

    const valid = list.every(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.coverImage === 'string' &&
        Array.isArray(item.galleryImages)
    );

    if (!valid) {
      return {
        ok: false,
        message:
          'Cấu trúc dự án thiếu trường bắt buộc (id, title, coverImage, galleryImages).',
      };
    }

    let mergedSettings: SiteSettings | undefined;
    if (!Array.isArray(parsed) && parsed.siteSettings) {
      mergedSettings = {
        ...DEFAULT_SITE_SETTINGS,
        ...parsed.siteSettings,
        socialLinks: {
          ...DEFAULT_SITE_SETTINGS.socialLinks,
          ...(parsed.siteSettings.socialLinks ?? {}),
        },
        categories:
          Array.isArray(parsed.siteSettings.categories) &&
          parsed.siteSettings.categories.length > 0
            ? parsed.siteSettings.categories
            : DEFAULT_SITE_SETTINGS.categories,
      };
    }

    const normalized = normalizeExhibitNumbers(list);
    return {
      ok: true,
      message: `Đã nhập thành công ${normalized.length} dự án triển lãm${
        mergedSettings ? ' kèm cấu hình chung của website' : ''
      }.`,
      projects: normalized,
      siteSettings: mergedSettings,
    };
  } catch {
    return {
      ok: false,
      message: 'Không thể đọc định dạng JSON. Vui lòng kiểm tra lại file.',
    };
  }
}

/**
 * Reads an image File's natural dimensions, uploads the file directly to
 * Supabase Storage bucket `portfolio-images` (with safe ASCII filename + Date.now()),
 * and returns its `publicUrl` plus exact natural width & height for SmartGalleryGrid.
 * NEVER stores heavy Base64 strings into the database.
 */
export function processUploadedImageFile(
  file: File,
  folder = 'uploads'
): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  cloudUploaded?: boolean;
}> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      const naturalW = img.naturalWidth || 1200;
      const naturalH = img.naturalHeight || 900;
      URL.revokeObjectURL(objectUrl);

      const uploadRes = await uploadImageToSupabaseStorage(file, folder);
      if (uploadRes.ok && uploadRes.publicUrl) {
        resolve({
          dataUrl: uploadRes.publicUrl,
          width: naturalW,
          height: naturalH,
          cloudUploaded: true,
        });
        return;
      }

      reject(
        new Error(
          uploadRes.message ||
            'Không thể tải ảnh lên Supabase Storage bucket portfolio-images.'
        )
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc file hình ảnh.'));
    };

    img.src = objectUrl;
  });
}

export function probeImageUrlDimensions(
  url: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 1400,
        height: img.naturalHeight || 1000,
      });
    };
    img.onerror = () => {
      resolve({ width: 1400, height: 1000 });
    };
    img.src = url;
  });
}
