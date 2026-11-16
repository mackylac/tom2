import type {
  PortfolioArchivePayload,
  Project,
  SiteSettings,
} from '../types/portfolio';
import {
  PORTFOLIO_STORAGE_BUCKET,
  PORTFOLIO_STORE_ROW_ID,
  PORTFOLIO_STORE_TABLE,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  supabase,
} from './supabaseClient';

export interface CloudSyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  bucketName: string;
  tableName: string;
  autoSyncOnSave: boolean;
}

const STORAGE_KEY_CLOUD_CONFIG = 'atelier_vespera_supabase_config_v2';

export function getDefaultCloudSyncConfig(): CloudSyncConfig {
  return {
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    bucketName: PORTFOLIO_STORAGE_BUCKET,
    tableName: PORTFOLIO_STORE_TABLE,
    autoSyncOnSave: true,
  };
}

export function loadCloudSyncConfig(): CloudSyncConfig {
  const defaults = getDefaultCloudSyncConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLOUD_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CloudSyncConfig>;
      return {
        supabaseUrl: parsed.supabaseUrl?.trim() || defaults.supabaseUrl,
        supabaseAnonKey:
          parsed.supabaseAnonKey?.trim() || defaults.supabaseAnonKey,
        bucketName: parsed.bucketName?.trim() || defaults.bucketName,
        tableName: parsed.tableName?.trim() || defaults.tableName,
        autoSyncOnSave: parsed.autoSyncOnSave ?? true,
      };
    }
  } catch {
    // Ignore storage read error
  }
  return defaults;
}

export function saveCloudSyncConfig(config: CloudSyncConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_CLOUD_CONFIG, JSON.stringify(config));
  } catch {
    // Ignore storage error
  }
}

export function isCloudSyncConfigured(
  config: CloudSyncConfig = loadCloudSyncConfig()
): boolean {
  return Boolean(
    config.supabaseUrl.trim().startsWith('http') &&
      config.supabaseAnonKey.trim().length > 15
  );
}

/**
 * Strips Vietnamese accents & special characters to produce a safe ASCII filename.
 */
export function sanitizeStorageFileName(originalName: string): string {
  const withoutExt = originalName.replace(/\.[^/.]+$/, '');
  const ascii = withoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return ascii || 'image';
}

/**
 * Converts a Base64 data:image/... URL into a Blob for uploading to Supabase Storage.
 */
function dataUrlToBlob(dataUrl: string): {
  blob: Blob;
  ext: string;
  mimeType: string;
} | null {
  try {
    const [header, base64Data] = dataUrl.split(',');
    if (!header || !base64Data) return null;
    const mimeMatch = header.match(/data:([^;]+);base64/);
    const mimeType = mimeMatch?.[1] || 'image/webp';
    const ext = mimeType.includes('png')
      ? 'png'
      : mimeType.includes('jpeg') || mimeType.includes('jpg')
        ? 'jpg'
        : mimeType.includes('svg')
          ? 'svg'
          : 'webp';

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return {
      blob: new Blob([bytes], { type: mimeType }),
      ext,
      mimeType,
    };
  } catch {
    return null;
  }
}

/**
 * Uploads an image File to Supabase Storage Bucket `portfolio-images`
 * and returns its Public CDN URL (`publicUrl`).
 */
export async function uploadImageToSupabaseStorage(
  file: File,
  folder = 'uploads'
): Promise<{ ok: boolean; publicUrl?: string; message: string }> {
  const ext = (file.name.split('.').pop() || 'png')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const safeName = sanitizeStorageFileName(file.name);
  const filePath = `${folder}/${Date.now()}-${safeName}.${ext || 'png'}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(PORTFOLIO_STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/png',
      });

    if (uploadError) {
      return {
        ok: false,
        message: `Lỗi tải ảnh lên Supabase Storage (${PORTFOLIO_STORAGE_BUCKET}): ${uploadError.message}`,
      };
    }

    const { data } = supabase.storage
      .from(PORTFOLIO_STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!data?.publicUrl) {
      return {
        ok: false,
        message: 'Không lấy được đường dẫn publicUrl từ Supabase Storage.',
      };
    }

    return {
      ok: true,
      publicUrl: data.publicUrl,
      message: 'Đã tải ảnh lên Supabase Storage thành công.',
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `Không thể kết nối Supabase Storage: ${err.message}`
          : 'Lỗi mạng khi tải ảnh lên đám mây.',
    };
  }
}

/**
 * Uploads a legacy Base64 data URL to `portfolio-images` bucket and returns its clean `publicUrl`.
 */
export async function uploadDataUrlToSupabaseStorage(
  dataUrl: string,
  prefix = 'asset'
): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  const converted = dataUrlToBlob(dataUrl);
  if (!converted) return dataUrl;

  const filePath = `migrated/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}-${prefix}.${converted.ext}`;

  const { error } = await supabase.storage
    .from(PORTFOLIO_STORAGE_BUCKET)
    .upload(filePath, converted.blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: converted.mimeType,
    });

  if (error) {
    return dataUrl;
  }

  const { data } = supabase.storage
    .from(PORTFOLIO_STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return data?.publicUrl || dataUrl;
}

/**
 * Ensures no Base64 strings remain in `projects` or `siteSettings` before saving to `public.portfolio_store`.
 */
export async function sanitizeBase64BeforeCloudSave(
  projects: Project[],
  siteSettings: SiteSettings
): Promise<{ projects: Project[]; siteSettings: SiteSettings }> {
  let cleanAvatar = siteSettings.brandAvatar ?? '';
  if (cleanAvatar.startsWith('data:image/')) {
    cleanAvatar = await uploadDataUrlToSupabaseStorage(
      cleanAvatar,
      'brand-avatar'
    );
  }

  const cleanProjects = await Promise.all(
    projects.map(async (proj) => {
      let cover = proj.coverImage;
      if (cover.startsWith('data:image/')) {
        cover = await uploadDataUrlToSupabaseStorage(
          cover,
          `cover-${proj.exhibitNumber}`
        );
      }

      const gallery = await Promise.all(
        proj.galleryImages.map(async (img, idx) => {
          if (img.url.startsWith('data:image/')) {
            const uploadedUrl = await uploadDataUrlToSupabaseStorage(
              img.url,
              `plate-${proj.exhibitNumber}-${idx + 1}`
            );
            return { ...img, url: uploadedUrl };
          }
          return img;
        })
      );

      return {
        ...proj,
        coverImage: cover,
        galleryImages: gallery,
      };
    })
  );

  return {
    projects: cleanProjects,
    siteSettings: {
      ...siteSettings,
      brandAvatar: cleanAvatar,
    },
  };
}

/**
 * Reads row `id = 'main'` from `public.portfolio_store` on Supabase.
 */
export async function fetchPortfolioFromSupabaseStore(): Promise<{
  ok: boolean;
  exists: boolean;
  projects?: Project[];
  siteSettings?: Partial<SiteSettings>;
  updatedAt?: string;
  message: string;
}> {
  try {
    const { data, error } = await supabase
      .from(PORTFOLIO_STORE_TABLE)
      .select('id, projects, site_settings, updated_at')
      .eq('id', PORTFOLIO_STORE_ROW_ID)
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        exists: false,
        message: `Lỗi đọc dữ liệu từ Supabase (${PORTFOLIO_STORE_TABLE}): ${error.message}`,
      };
    }

    if (!data) {
      return {
        ok: true,
        exists: false,
        message: 'Chưa có dòng main trên bảng portfolio_store.',
      };
    }

    const rowProjects = Array.isArray(data.projects)
      ? (data.projects as Project[])
      : [];
    const rowSettings =
      data.site_settings && typeof data.site_settings === 'object'
        ? (data.site_settings as Partial<SiteSettings>)
        : undefined;

    return {
      ok: true,
      exists: rowProjects.length > 0,
      projects: rowProjects,
      siteSettings: rowSettings,
      updatedAt: data.updated_at as string | undefined,
      message: 'Đã tải dữ liệu từ Supabase Cloud thành công.',
    };
  } catch (err) {
    return {
      ok: false,
      exists: false,
      message:
        err instanceof Error
          ? `Lỗi kết nối Supabase: ${err.message}`
          : 'Không thể kết nối tới Supabase Cloud.',
    };
  }
}

/**
 * Upserts row `id = 'main'` with `projects` and `site_settings` into `public.portfolio_store`.
 */
export async function upsertPortfolioToSupabaseStore(
  projects: Project[],
  siteSettings: SiteSettings
): Promise<{
  ok: boolean;
  message: string;
  projects: Project[];
  siteSettings: SiteSettings;
}> {
  try {
    // Automatically migrate any leftover Base64 images to `portfolio-images` bucket first
    const sanitized = await sanitizeBase64BeforeCloudSave(
      projects,
      siteSettings
    );

    const nowIso = new Date().toISOString();
    const { error } = await supabase.from(PORTFOLIO_STORE_TABLE).upsert(
      {
        id: PORTFOLIO_STORE_ROW_ID,
        projects: sanitized.projects,
        site_settings: sanitized.siteSettings,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    );

    if (error) {
      return {
        ok: false,
        message: `Lỗi lưu lên Supabase (${error.message})`,
        projects: sanitized.projects,
        siteSettings: sanitized.siteSettings,
      };
    }

    return {
      ok: true,
      message: 'Đã lưu lên Cloud thành công!',
      projects: sanitized.projects,
      siteSettings: sanitized.siteSettings,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `Không thể kết nối tới Supabase: ${err.message}`
          : 'Lỗi mạng khi lưu lên Cloud.',
      projects,
      siteSettings,
    };
  }
}

/**
 * Compatibility wrapper for manual Push button in Tab 4 of /admin
 */
export async function pushPortfolioToSupabase(
  payload: PortfolioArchivePayload
): Promise<{ ok: boolean; message: string }> {
  const res = await upsertPortfolioToSupabaseStore(
    payload.projects,
    payload.siteSettings
  );
  return {
    ok: res.ok,
    message: res.message,
  };
}

/**
 * Compatibility wrapper for manual Pull button in Tab 4 of /admin
 */
export async function pullPortfolioFromSupabase(): Promise<{
  ok: boolean;
  message: string;
  data?: PortfolioArchivePayload;
}> {
  const res = await fetchPortfolioFromSupabaseStore();
  if (!res.ok) {
    return { ok: false, message: res.message };
  }
  if (!res.exists || !res.projects || res.projects.length === 0) {
    return {
      ok: false,
      message: 'Chưa có dữ liệu dự án trên bảng public.portfolio_store.',
    };
  }
  return {
    ok: true,
    message: 'Đã tải dữ liệu mới nhất từ Supabase Cloud thành công!',
    data: {
      version: '2.0.0',
      updatedAt: res.updatedAt || new Date().toISOString(),
      projects: res.projects,
      siteSettings: (res.siteSettings as SiteSettings) || ({} as SiteSettings),
    },
  };
}
