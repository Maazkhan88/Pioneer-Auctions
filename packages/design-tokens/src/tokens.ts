// Generated from tokens.json. Do not edit manually.

export const tokens = {
  "color": {
    "purple": {
      "900": "#2E1065",
      "700": "#5B21B6",
      "600": "#6D28D9",
      "100": "#EDE9FE"
    },
    "orange": {
      "600": "#EA580C",
      "500": "#F97316",
      "100": "#FFEDD5"
    },
    "semantic": {
      "success": "#16A34A",
      "successTint": "#DCFCE7",
      "danger": "#DC2626",
      "dangerTint": "#FEE2E2",
      "warning": "#D97706",
      "info": "#2563EB"
    },
    "slate": {
      "950": "#0F172A",
      "700": "#334155",
      "500": "#64748B",
      "300": "#CBD5E1",
      "200": "#E2E8F0",
      "100": "#F1F5F9",
      "50": "#F8FAFC",
      "0": "#FFFFFF"
    }
  },
  "space": {
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "6": 24,
    "8": 32,
    "12": 48,
    "16": 64
  },
  "radius": {
    "sm": 8,
    "md": 12,
    "lg": 16,
    "pill": 999
  },
  "type": {
    "display": {
      "fontSize": 40,
      "lineHeight": 48,
      "fontWeight": 700
    },
    "h1": {
      "fontSize": 28,
      "lineHeight": 36,
      "fontWeight": 700
    },
    "h2": {
      "fontSize": 22,
      "lineHeight": 30,
      "fontWeight": 700
    },
    "h3": {
      "fontSize": 18,
      "lineHeight": 26,
      "fontWeight": 600
    },
    "body": {
      "fontSize": 16,
      "lineHeight": 24,
      "fontWeight": 400
    },
    "caption": {
      "fontSize": 13,
      "lineHeight": 18,
      "fontWeight": 500
    }
  },
  "motion": {
    "fastMs": 120,
    "normalMs": 200,
    "slowMs": 320
  },
  "theme": {
    "light": {
      "background": "#F9F9FB",
      "paper": "#FFFFFF",
      "ink": "#1F2937",
      "muted": "#6B7280",
      "border": "#E5E7EB",
      "brandDeep": "#1C0632",
      "brand": "#500B8C",
      "brandInteractive": "#630FB5",
      "action": "#EF6C00",
      "urgency": "#F97316",
      "success": "#16A34A",
      "danger": "#DC2626",
      "warning": "#D97706",
      "info": "#2563EB"
    },
    "dark": {
      "background": "#0F031C",
      "paper": "#1C0D2E",
      "ink": "#F3F4F6",
      "muted": "#9CA3AF",
      "border": "#3D2B54",
      "brandDeep": "#EDE9FE",
      "brand": "#A78BFA",
      "brandInteractive": "#C084FC",
      "action": "#F97316",
      "urgency": "#FB923C",
      "success": "#22C55E",
      "danger": "#EF4444",
      "warning": "#F59E0B",
      "info": "#3B82F6"
    }
  }
} as const;

export type Tokens = typeof tokens;
