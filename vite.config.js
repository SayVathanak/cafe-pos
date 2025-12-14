import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import { presetUno, presetWebFonts } from "unocss";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS({
      presets: [
        presetUno(),
        presetWebFonts({
          provider: "google",
          fonts: {
            // Download Montserrat for standard text
            sans: "Montserrat:400,600,700,900",

            // Download Preahvihear for Khmer text
            khmer: "Preahvihear",
          },
        }),
      ],
      // This sets the global default font stack
      theme: {
        fontFamily: {
          sans: "Montserrat, Preahvihear, sans-serif",
        },
      },
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "SAYON Coffee",
        short_name: "SAYON",
        description: "SAYON Coffee",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone", // <--- This hides the browser URL bar!
        orientation: "landscape", // <--- Forces landscape mode on tablets
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
