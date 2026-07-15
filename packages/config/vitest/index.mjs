export const baseVitestConfig = {
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    passWithNoTests: true,
  },
};
