import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves a project repo at /<repo-name>/, not the domain root —
// GITHUB_ACTIONS is set automatically in every workflow run, so local dev
// and `npm run build` run by hand both keep the normal root base.
const base = process.env.GITHUB_ACTIONS === 'true' ? '/spanishApp/' : '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Vocab Test',
        short_name: 'Vocab Test',
        description: 'Test-only companion for the Spanish vocabulary desktop app.',
        // Relative, not absolute — resolves correctly whether this is
        // served from the domain root (local preview) or a subpath
        // (GitHub Pages project sites live at /<repo-name>/).
        start_url: '.',
        display: 'standalone',
        background_color: '#f6f6f7',
        theme_color: '#4c6ef5',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The whole Words/Test flow must work with zero network once
        // installed — everything it needs already lives in IndexedDB.
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
    }),
  ],
  server: {
    // Binds to 0.0.0.0 instead of just localhost, so `npm run dev` alone is
    // reachable from a phone on the same Wi-Fi at this Mac's LAN IP — no
    // `--host` flag to remember every time.
    host: true,
    fs: {
      // The pure lib/type modules this app reuses live in ../src (see
      // src/lib/phoneSync.ts and friends) — outside this project's own
      // root, so the dev server's file-serving guard needs to be told
      // that's expected, not a stray path traversal.
      allow: ['..'],
    },
  },
  // Same LAN-reachability as `server` above, for `npm run preview` (serves
  // the actual production build — what the installed PWA runs day to day).
  preview: {
    host: true,
  },
})
