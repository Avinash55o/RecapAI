// vite.config.ts
import { defineConfig } from "vite"
import electron from "vite-plugin-electron"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // main.ts
        entry: "electron/main.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            sourcemap: true,
            minify: false,
            rollupOptions: {
              // Only mark electron and node built-ins as external.
              // DO NOT mark npm packages (openai, anthropic, etc.) as external —
              // Rollup must bundle them into CJS so the ESM-only packages work.
              external: [
                "electron",
                /^node:/,
                "fs", "path", "os", "crypto", "events", "stream",
                "util", "http", "https", "net", "tls", "zlib",
                "child_process", "worker_threads", "buffer", "url",
                "querystring", "assert", "constants", "timers",
                "string_decoder", "punycode", "dns", "readline"
              ]
            },
            commonjsOptions: {
              // Transform ESM modules (like openai) so they can be inlined as CJS
              transformMixedEsModules: true
            }
          }
        }
      },
      {
        // preload.ts
        entry: "electron/preload.ts",
        vite: {
          build: {
            outDir: "dist-electron",
            sourcemap: true,
            rollupOptions: {
              external: ["electron"]
            }
          }
        }
      }
    ])
  ],
  base: process.env.NODE_ENV === "production" ? "./" : "/",
  server: {
    port: 54321,
    strictPort: true,
    watch: {
      usePolling: true
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
})
