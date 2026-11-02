import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "192.168.1.12", // hoặc true để mở tất cả địa chỉ mạng
    port: 5173,           // tuỳ chỉnh nếu muốn
    proxy: {
      "/api/arena": { target: "http://127.0.0.1:3001", changeOrigin: false },
      "/arena-socket": { target: "http://127.0.0.1:3001", ws: true, changeOrigin: false },
    },
  },
})
