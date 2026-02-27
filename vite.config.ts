import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  // For GitHub Pages: set base to repo name. Override with VITE_BASE env var.
  base: process.env.VITE_BASE ?? (command === "build" ? "/StellarisTechCalculator/" : "/"),
  plugins: [solid(), tailwindcss()],
  worker: {
    format: "es" as const,
  },
  build: {
    target: "esnext",
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
}));
