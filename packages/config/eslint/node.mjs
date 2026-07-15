import globals from "globals";

import baseConfig from "./base.mjs";

export default [
  ...baseConfig,
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
];
