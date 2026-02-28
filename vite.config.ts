import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  // For GitHub Pages: set base to repo name. Override with VITE_BASE env var.
  base: process.env.VITE_BASE ?? (command === "build" ? "/StellarisTechCalculator/" : "/"),
  plugins: [solid(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.3.2"),
    __STELLARIS_VERSION__: JSON.stringify("4.3.x"),
  },
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
