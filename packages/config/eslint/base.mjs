import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

const sharedIgnores = {
  ignores: [
    "**/.next/**",
    "**/.turbo/**",
    "**/coverage/**",
    "**/dist/**",
    "**/node_modules/**",
  ],
};

export default [
  sharedIgnores,
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];
