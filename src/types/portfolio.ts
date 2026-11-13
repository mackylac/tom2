export type ProjectCategory = string;

export type CategoryFilter = 'All Works' | ProjectCategory;

export type FrameMaterial = 'matte-black' | 'gallery-oak' | 'brushed-bronze';

export type MatboardTone = 'ivory' | 'charcoal' | 'auto';

export type MatboardSize = 'compact' | 'standard' | 'grand';

export type LightingMode = 'daylight' | 'spotlight';

export type LayoutOverride = 'auto' | 'full' | 'half';

export interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  /** Optional known natural width; SmartGalleryGrid also reads img.naturalWidth on load */
  width?: number;
  /** Optional known natural height; SmartGalleryGrid also reads img.naturalHeight on load */
  height?: number;
  /** Manual override for SmartGalleryGrid: 'auto' (default), 'full' (100% width), or 'half' (paired 50% width) */
  layoutOverride?: LayoutOverride;
}

export interface Project {
  id: string;
  exhibitNumber: string; // e.g., "01"
  title: string;
  subtitle: string;
  client: string;
  category: ProjectCategory;
  year: string;
  role: string;
  deliverables: string[];
  frameStyle: FrameMaterial;
  matboardTone: MatboardTone;
  matboardSize?: MatboardSize;
  /** Whether the project is hidden from the public Main Exhibition Hall */
  hidden?: boolean;
  /**
   * STRICT RULE: The Main Exhibition Hall frame ONLY renders this single coverImage.
   */
  coverImage: string;
  coverAspect: 'portrait' | 'landscape' | 'square';
  location: string;
  curatorialStatement: string;
  conceptNarrative: string;
  executionDetails: string;
  /**
   * Sub-page gallery images rendered inside /project/:id via SmartGalleryGrid
   */
  galleryImages: GalleryImage[];
}

export interface SocialLinks {
  behance: string;
  instagram: string;
  linkedin: string;
}

export interface SiteSettings {
  brandName: string;
  brandSubtitle: string;
  /** Website / Curator Avatar & Favicon URL or Base64 DataURL */
  brandAvatar: string;
  /** Shape of the avatar emblem in Header & Curator Badge */
  avatarShape?: 'circle' | 'square';
  /** Curator / Designer Name & Title shown next to the avatar */
  curatorName?: string;
  /** Whether to display the avatar emblem in the top navigation bar */
  showAvatarInHeader?: boolean;
  heroBadge: string;
  heroTitlePrefix: string;
  heroTitleAccent: string;
  heroTitleSuffix: string;
  heroManifesto: string;
  categories: string[];
  defaultLightingMode: LightingMode;
  contactEmail: string;
  contactPhoneZalo: string;
  galleryHours: string;
  studioLocations: string;
  socialLinks: SocialLinks;
  commissionBadge: string;
  commissionTitle: string;
  commissionDescription: string;
  footerCopyright: string;
}

export interface PortfolioArchivePayload {
  version: string;
  updatedAt: string;
  siteSettings: SiteSettings;
  projects: Project[];
}

export const DEFAULT_PROJECT_CATEGORIES: string[] = [
  'Branding & Identity',
  'Packaging Design',
  'Menu & Print',
  'Key Visual & Digital',
];

export const PROJECT_CATEGORIES = DEFAULT_PROJECT_CATEGORIES;

export const CATEGORY_FILTERS: CategoryFilter[] = [
  'All Works',
  ...DEFAULT_PROJECT_CATEGORIES,
];

export const FRAME_MATERIAL_LABELS: Record<
  FrameMaterial,
  { name: string; vietnamese: string; finishNote: string }
> = {
  'matte-black': {
    name: 'Matte Black',
    vietnamese: 'Đen Nhám Bảo Tàng',
    finishNote: 'Anodized architectural ash-black aluminum molding',
  },
  'gallery-oak': {
    name: 'Gallery Oak',
    vietnamese: 'Gỗ Sồi Tự Nhiên',
    finishNote: 'Quarter-sawn European white oak with raw matte wax',
  },
  'brushed-bronze': {
    name: 'Brushed Bronze',
    vietnamese: 'Đồng Xước Cổ Điển',
    finishNote: 'Hand-brushed architectural brass with warm patina',
  },
};

export const MATBOARD_SIZE_LABELS: Record<
  MatboardSize,
  { name: string; vietnamese: string; paddingClass: string }
> = {
  compact: {
    name: 'Compact Matboard',
    vietnamese: 'Bo Giấy Mảnh Mai (p-3.5 / p-5)',
    paddingClass: 'p-3 sm:p-4 md:p-5',
  },
  standard: {
    name: 'Standard Museum Mat',
    vietnamese: 'Bo Giấy Tiêu Chuẩn (p-5 / p-7)',
    paddingClass: 'p-3.5 sm:p-5 md:p-6 lg:p-8',
  },
  grand: {
    name: 'Grand Exhibition Mat',
    vietnamese: 'Bo Giấy Rộng Bảo Tàng (p-6 / p-10)',
    paddingClass: 'p-5 sm:p-7 md:p-9 lg:p-11',
  },
};
