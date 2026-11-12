export const Colors = {
  // Alpine White Clean Backgrounds
  bg: '#f8fafc',
  bgElevated: '#ffffff',
  bgSoft: '#f1f5f9',
  bgCardHover: '#e2e8f0',

  // Border & Dividers
  border: '#e2e8f0',
  borderLight: 'rgba(15, 23, 42, 0.08)',
  borderGlow: 'rgba(79, 70, 229, 0.25)',

  // High-Contrast Obsidian Text Hierarchy
  text: '#0f172a',
  textSecondary: '#334155',
  muted: '#64748b',
  subtext: '#64748b',

  // Royal Indigo Brand & Accents
  primary: '#4f46e5',
  primaryDark: '#3730a3',
  primaryHover: '#312e81',
  primaryLight: 'rgba(79, 70, 229, 0.08)',

  secondary: '#0284c7',
  secondaryLight: 'rgba(2, 132, 199, 0.08)',

  // Status Colors (WCAG AA Contrast)
  ok: '#059669',
  okLight: 'rgba(5, 150, 105, 0.1)',

  warn: '#d97706',
  warnLight: 'rgba(217, 119, 6, 0.1)',

  danger: '#e11d48',
  dangerLight: 'rgba(225, 29, 72, 0.1)',

  // Priority Tokens
  high: '#e11d48',
  medium: '#d97706',
  low: '#059669',

  // Neutrals
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const Typography = {
  xs: 11,
  sm: 13,
  body: 15,
  subheading: 17,
  heading: 22,
  title: 28,
  display: 34,
};

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 26,
  full: 9999,
};

export const Gradients = {
  primary: ['#6366f1', '#4f46e5'] as const,
  primaryPurple: ['#6366f1', '#8b5cf6'] as const,
  cyanBlue: ['#06b6d4', '#3b82f6'] as const,
  success: ['#10b981', '#059669'] as const,
  danger: ['#ef4444', '#dc2626'] as const,
  cardGlass: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)'] as const,
  heroGlow: ['rgba(99, 102, 241, 0.25)', 'rgba(6, 182, 212, 0.05)'] as const,
};
