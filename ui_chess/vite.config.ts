import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const arenaTarget = process.env.ARENA_API_TARGET || "http://127.0.0.1:3001";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "192.168.1.8", // hoặc true để mở tất cả địa chỉ mạng
    port: 5173,           // tuỳ chỉnh nếu muốn
    proxy: {
      "/api/arena": { target: arenaTarget, changeOrigin: false },
      "/arena-socket": { target: arenaTarget, ws: true, changeOrigin: false },
      "/socket.io": { target: arenaTarget, ws: true, changeOrigin: false },
    },
  },
})
