import type { PortfolioArchivePayload } from '../types/portfolio';

export interface CloudSyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  bucketName: string;
  tableName: string;
  autoSyncOnSave: boolean;
}

const STORAGE_KEY_CLOUD_CONFIG = 'atelier_vespera_supabase_config_v1';

export function getDefaultCloudSyncConfig(): CloudSyncConfig {
  const envUrl =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
  const envKey =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ??
    '';

  return {
    supabaseUrl: envUrl,
    supabaseAnonKey: envKey,
    bucketName: 'portfolio-assets',
    tableName: 'portfolio_archive',
    autoSyncOnSave: false,
  };
}

export function loadCloudSyncConfig(): CloudSyncConfig {
  const defaults = getDefaultCloudSyncConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLOUD_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CloudSyncConfig>;
      return {
        supabaseUrl: parsed.supabaseUrl ?? defaults.supabaseUrl,
        supabaseAnonKey: parsed.supabaseAnonKey ?? defaults.supabaseAnonKey,
        bucketName: parsed.bucketName || defaults.bucketName,
        tableName: parsed.tableName || defaults.tableName,
        autoSyncOnSave: Boolean(parsed.autoSyncOnSave),
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

function cleanBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Uploads an image file to Supabase Storage Bucket and returns its Public CDN URL.
 */
export async function uploadImageToSupabaseStorage(
  file: File,
  folder = 'exhibits',
  config: CloudSyncConfig = loadCloudSyncConfig()
): Promise<{ ok: boolean; publicUrl?: string; message: string }> {
  if (!isCloudSyncConfigured(config)) {
    return {
      ok: false,
      message:
        'Chưa cấu hình Supabase URL và API Key. Hệ thống sẽ dùng chế độ nén WebP/Base64 cục bộ.',
    };
  }

  const baseUrl = cleanBaseUrl(config.supabaseUrl);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
  const safeName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .toLowerCase();
  const objectPath = `${folder}/${Date.now()}-${safeName}.${ext}`;
  const endpoint = `${baseUrl}/storage/v1/object/${encodeURIComponent(
    config.bucketName
  )}/${objectPath}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        'Content-Type': file.type || 'image/webp',
        'x-upsert': 'true',
      },
      body: file,
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        ok: false,
        message: `Lỗi tải ảnh lên Supabase Storage (${response.status}): ${errText}`,
      };
    }

    const publicUrl = `${baseUrl}/storage/v1/object/public/${encodeURIComponent(
      config.bucketName
    )}/${objectPath}`;

    return {
      ok: true,
      publicUrl,
      message: 'Đã tải ảnh lên Supabase Storage CDN thành công.',
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
 * Pushes the entire PortfolioArchivePayload (siteSettings + projects) to Supabase Database (or Storage fallback).
 */
export async function pushPortfolioToSupabase(
  payload: PortfolioArchivePayload,
  config: CloudSyncConfig = loadCloudSyncConfig()
): Promise<{ ok: boolean; message: string }> {
  if (!isCloudSyncConfigured(config)) {
    return {
      ok: false,
      message:
        'Vui lòng điền Supabase Project URL và Anon/Service API Key trước khi đồng bộ đám mây.',
    };
  }

  const baseUrl = cleanBaseUrl(config.supabaseUrl);
  const restEndpoint = `${baseUrl}/rest/v1/${encodeURIComponent(
    config.tableName
  )}`;

  try {
    const response = await fetch(restEndpoint, {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        id: 'main',
        updated_at: payload.updatedAt,
        payload,
      }),
    });

    if (response.ok) {
      return {
        ok: true,
        message: `Đã đồng bộ thành công ${payload.projects.length} dự án và cấu hình website lên bảng Supabase "${config.tableName}".`,
      };
    }

    // Fallback: try uploading portfolio-data.json directly to Supabase Storage bucket
    const storageEndpoint = `${baseUrl}/storage/v1/object/${encodeURIComponent(
      config.bucketName
    )}/portfolio-data.json`;
    const storageRes = await fetch(storageEndpoint, {
      method: 'POST',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'x-upsert': 'true',
      },
      body: JSON.stringify(payload, null, 2),
    });

    if (storageRes.ok) {
      return {
        ok: true,
        message: `Đã lưu tệp portfolio-data.json lên Supabase Storage bucket "${config.bucketName}" thành công.`,
      };
    }

    const errText = await response.text();
    return {
      ok: false,
      message: `Supabase phản hồi lỗi (${response.status}): ${errText}`,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `Không thể kết nối tới Supabase: ${err.message}`
          : 'Lỗi kết nối mạng khi đồng bộ lên đám mây.',
    };
  }
}

/**
 * Pulls the latest PortfolioArchivePayload from Supabase Database (or Storage fallback).
 */
export async function pullPortfolioFromSupabase(
  config: CloudSyncConfig = loadCloudSyncConfig()
): Promise<{
  ok: boolean;
  message: string;
  data?: PortfolioArchivePayload;
}> {
  if (!isCloudSyncConfigured(config)) {
    return {
      ok: false,
      message:
        'Vui lòng điền Supabase Project URL và API Key trước khi tải dữ liệu từ đám mây.',
    };
  }

  const baseUrl = cleanBaseUrl(config.supabaseUrl);
  const restEndpoint = `${baseUrl}/rest/v1/${encodeURIComponent(
    config.tableName
  )}?id=eq.main&select=payload`;

  try {
    const response = await fetch(restEndpoint, {
      method: 'GET',
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const rows = (await response.json()) as Array<{
        payload?: PortfolioArchivePayload;
      }>;
      if (Array.isArray(rows) && rows[0]?.payload) {
        return {
          ok: true,
          message: 'Đã tải dữ liệu mới nhất từ Supabase Database thành công.',
          data: rows[0].payload,
        };
      }
    }

    // Fallback: check public or authenticated Storage bucket for portfolio-data.json
    const storageEndpoint = `${baseUrl}/storage/v1/object/public/${encodeURIComponent(
      config.bucketName
    )}/portfolio-data.json?t=${Date.now()}`;
    const storageRes = await fetch(storageEndpoint);
    if (storageRes.ok) {
      const data = (await storageRes.json()) as PortfolioArchivePayload;
      if (data && Array.isArray(data.projects)) {
        return {
          ok: true,
          message: 'Đã tải tệp portfolio-data.json từ Supabase Storage thành công.',
          data,
        };
      }
    }

    return {
      ok: false,
      message:
        'Không tìm thấy bản ghi dữ liệu trên Supabase. Hãy nhấn "Push lên Đám Mây" lần đầu tiên để khởi tạo.',
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? `Lỗi kết nối Supabase: ${err.message}`
          : 'Không thể tải dữ liệu từ đám mây.',
    };
  }
}
