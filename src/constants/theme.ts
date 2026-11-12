export type AppThemeKey = 'snow' | 'tactile' | 'saas' | 'vibrant';

export interface ThemeConfig {
  key: AppThemeKey;
  name: string;
  tag: string;
  description: string;
  colors: {
    bg: string;
    bgElevated: string;
    bgSoft: string;
    border: string;
    borderGlow: string;
    text: string;
    subtext: string;
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    secondaryLight: string;
    ok: string;
    okLight: string;
    warn: string;
    warnLight: string;
    danger: string;
    dangerLight: string;
  };
  cardRadius: number;
  btnRadius: number;
  heroGradient: readonly [string, string];
  progressGradient: readonly [string, string];
  badgeBg: string;
}

// Single Canonical Alpine White Design System
const alpineWhiteConfig: ThemeConfig = {
  key: 'snow',
  name: 'Alpine White',
  tag: '❄️ Crisp White & Royal Indigo',
  description: 'Ultra-clean studio white light mode. Pure porcelain canvas, deep obsidian typography, and high-contrast royal indigo accents.',
  colors: {
    bg: '#f8fafc',
    bgElevated: '#ffffff',
    bgSoft: '#f1f5f9',
    border: '#e2e8f0',
    borderGlow: 'rgba(79, 70, 229, 0.25)',
    text: '#0f172a',
    subtext: '#64748b',
    primary: '#4f46e5',
    primaryDark: '#3730a3',
    primaryLight: 'rgba(79, 70, 229, 0.08)',
    secondary: '#0284c7',
    secondaryLight: 'rgba(2, 132, 199, 0.08)',
    ok: '#059669',
    okLight: 'rgba(5, 150, 105, 0.1)',
    warn: '#d97706',
    warnLight: 'rgba(217, 119, 6, 0.1)',
    danger: '#e11d48',
    dangerLight: 'rgba(225, 29, 72, 0.1)',
  },
  cardRadius: 16,
  btnRadius: 12,
  heroGradient: ['#e0e7ff', '#ffffff'],
  progressGradient: ['#4f46e5', '#818cf8'],
  badgeBg: 'rgba(79, 70, 229, 0.08)',
};

export const THEMES: Record<AppThemeKey, ThemeConfig> = {
  snow: alpineWhiteConfig,
  tactile: alpineWhiteConfig,
  saas: alpineWhiteConfig,
  vibrant: alpineWhiteConfig,
};
