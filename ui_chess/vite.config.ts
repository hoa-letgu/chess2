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
    host: "192.168.1.19", // hoặc true để mở tất cả địa chỉ mạng
    port: 5173,           // tuỳ chỉnh nếu muốn
  },
})
