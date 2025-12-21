import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      // 👇 ADD THIS SECTION
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"], // Cache everything
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Increase limit to 5MB (Default is 2MB)
      },
      manifest: {
        name: "SAYON Coffee",
        short_name: "SAYON",
        description: "SAYON Coffee POS",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "landscape",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
