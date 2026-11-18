# Cho bạn bè chơi game từ máy Windows của bạn

Cách thử nhanh: Cloudflare Quick Tunnel cung cấp đường dẫn HTTPS tạm thời, không cần mở cổng modem hay có tên miền. Máy của bạn chạy web, API, phòng chơi và SQLite; Cloudflare chuyển tiếp truy cập tới máy.

## Chạy lần đầu

1. Cài Node.js 22.13 trở lên nếu chưa có. Dự án hiện dùng Node 22 và SQLite tích hợp.
2. Cài công cụ Cloudflare trong PowerShell hoặc Terminal:

   ```powershell
   winget install --id Cloudflare.cloudflared --exact
   ```

   Sau khi cài, mở Terminal mới để nhận đường dẫn lệnh. Nếu máy không có winget, dùng bản Windows từ trang tải chính thức bên dưới.

3. Trong thư mục dự án `chess2`, nhấp đúp **start-public.cmd**. Tệp này cài thư viện còn thiếu, dựng giao diện và chạy web + API chung tại `http://127.0.0.1:8080`. Chờ dòng `Web + API`.
4. Mở Terminal thứ hai và chạy:

   ```powershell
   cloudflared tunnel --url http://127.0.0.1:8080
   ```

5. Sao chép đường dẫn **https://...trycloudflare.com** do Cloudflare in ra. Gửi đường dẫn đó cho bạn bè; tất cả mở **cùng đường dẫn**, đăng nhập/đăng ký rồi vào Online. Một người tạo bàn, người kia chọn bàn và tham gia. Nên thử bàn 0 xu, chế độ Demo trước.

## Khi đang chơi

- Giữ cả hai cửa sổ chạy. Máy phải bật, không ngủ và còn Internet. Đóng game server hoặc tunnel sẽ ngắt phòng; luật mất kết nối 60 giây hiện có vẫn áp dụng.
- Địa chỉ localhost/127.0.0.1 và 192.168.x.x không dùng để gửi cho người ngoài mạng. Chia sẻ đường dẫn HTTPS của Cloudflare.
- Quick Tunnel thay đổi địa chỉ sau mỗi lần mở, dùng cho thử nghiệm và không bảo đảm hoạt động liên tục. Muốn địa chỉ cố định, dùng tên miền và Cloudflare Tunnel có tài khoản. Muốn game chạy khi tắt máy, chuyển lên VPS.
- Dữ liệu tài khoản, ví, lịch sử nằm trong `api/data/arena.sqlite`, không mất khi tắt tunnel. Thế cờ cá nhân lưu trên trình duyệt vẫn chưa đồng bộ tài khoản. Khi sao lưu cả hệ thống, giữ thư mục `api/data` (gồm khóa cấu hình thanh toán) và các biến bí mật trong `api/.env`; không gửi chúng cho người chơi.
- Trang admin vẫn dùng tài khoản và phân quyền hiện tại. Không chia sẻ tài khoản quản trị cho người chơi.
- Thanh toán thật cần tên miền HTTPS cố định và cập nhật địa chỉ công khai/callback trong Admin và nhà cung cấp. Đừng dùng URL Quick Tunnel đổi liên tục cho đơn thanh toán thật.

## Chẩn đoán nhanh

- `8080` đã được dùng: đóng phiên start-public.cmd cũ trước khi mở lại. Không chạy hai API dùng cùng SQLite đồng thời (kể cả API dev ở cổng 3001); hãy dừng API dev bằng Ctrl+C trước khi mở bản public.
- Không có liên kết: kiểm tra `cloudflared --version`; mở Terminal mới sau khi cài. Nếu có `~/.cloudflared/config.yaml`, Quick Tunnel có thể không khởi động được; dùng cấu hình tunnel hiện có hoặc xem tài liệu Cloudflare, không xóa cấu hình cũ khi chưa rõ.
- `502 Bad Gateway`: kiểm tra cửa sổ start-public.cmd còn chạy và mở được `http://127.0.0.1:8080` trên máy chủ.
- Bàn không cập nhật: mọi người phải dùng cùng đường dẫn; kiểm tra trạng thái Đã kết nối sảnh. WebSocket và API đều dùng cùng địa chỉ HTTPS, không trỏ tới localhost của máy khách.

## Ghi chú cho người phát triển

`ARENA_SERVE_UI=1` bật phục vụ duy nhất thư mục `ui_chess/dist`; đường dẫn SPA như `/admin` trả index.html, đường dẫn API/tệp riêng không rơi vào SPA. Không public Vite dev server hay mã nguồn. File chạy dùng `vite build`; kiểm tra TypeScript toàn dự án vẫn là bước riêng vì các game cũ còn lỗi kiểu đã tồn tại.

Phiên public đặt `NODE_ENV=production` để cookie đăng nhập có Secure/HttpOnly/SameSite, bind loopback và nhận khách qua HTTPS tunnel. Cloudflare giữ Host công khai; không thêm `--http-host-header localhost` vì sẽ lệch kiểm tra Origin. Trust proxy chỉ nhận loopback để phân biệt IP người dùng qua proxy, thay vì gộp mọi khách vào một hạn mức đăng nhập.

`api/.env` được đọc nếu có. Không cần thay ARENA_ORIGINS hay bật allowedHosts=true. Global legacy socket đã dùng cùng origin; Vite dev có proxy /socket.io riêng để vẫn dùng bình thường ở chế độ phát triển.

Nguồn chính thức:
- https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
- https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
- https://nodejs.org/
