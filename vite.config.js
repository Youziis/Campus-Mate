import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";

const dayjsEsm = fileURLToPath(
  new URL(
    "./node_modules/element-plus/node_modules/dayjs/esm/",
    import.meta.url,
  ),
);

export default defineConfig({
  plugins: [vue()],
  // Element Plus resolves Day.js to its CommonJS entry; use Day.js's ESM sources.
  resolve: {
    alias: [
      {
        find: /^dayjs\/plugin\/(.+?)(?:\.js)?$/,
        replacement: `${dayjsEsm}plugin/$1/index.js`,
      },
      { find: /^dayjs$/, replacement: `${dayjsEsm}index.js` },
    ],
  },
  optimizeDeps: { noDiscovery: true },
  server: {
    proxy: {
      "/api": "http://localhost:3002",
      "/uploads": "http://localhost:3002",
    },
  },
});
