import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: /api is proxied to FastAPI (the separate won-backend project).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8000" },
  },
});
