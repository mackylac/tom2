import rawPortfolioData from './portfolio-data.json';
import type {
  PortfolioArchivePayload,
  Project,
  SiteSettings,
} from '../types/portfolio';

const archive = rawPortfolioData as unknown as PortfolioArchivePayload;

export const DEFAULT_SITE_SETTINGS: SiteSettings = archive.siteSettings;

export const SEED_PROJECTS: Project[] = archive.projects;
