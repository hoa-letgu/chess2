# Tài khoản, ví xu thử nghiệm và bàn online chung

## Chạy thử

Cần Node.js 22.13 trở lên (dùng SQLite tích hợp trong Node).

1. Trong thư mục `api`: chạy `npm install`, sau đó `npm start` (cổng 3001).
2. Trong thư mục `ui_chess`: chạy `npm install`, sau đó `npm run dev -- --host 0.0.0.0`.
3. Mở địa chỉ Vite hiển thị. Chọn **Tài khoản & ví xu**, hoặc chọn game rồi **Đấu online · Bàn xu**.
4. Đăng ký hai tài khoản bằng hai trình duyệt hoặc một cửa sổ thường và một cửa sổ ẩn danh (các tab cùng trình duyệt chia sẻ phiên đăng nhập).
5. Nạp xu giả lập, tạo bàn, chọn đúng game ở tài khoản còn lại rồi vào bàn. Hai bên phải trực tuyến và đủ số dư. Người tạo bàn đi trước.

Bot và các màn chơi cũ được giữ nguyên; chúng không có quyền cập nhật ví mới. Bàn xu dùng giao diện bàn chung và bộ xử lý server riêng, không sử dụng các sự kiện phòng cũ bị trùng tên.

## Quy tắc

- Đăng ký tài khoản mới có 0 xu. Nạp giả lập các gói 1.000 / 5.000 / 10.000 xu, tối đa 100.000 xu trong 24 giờ. Ở chế độ Demo không gọi cổng thanh toán. Cấu hình QR/tiền thật xem `PAYMENTS.md`; xu vẫn không rút hay đổi thưởng.
- Mỗi người chỉ có một bàn đang chờ hoặc đang chơi. Mức cược là số nguyên từ 0 đến 100.000 xu/người.
- Tạo bàn chưa trừ xu. Người thứ hai vào bàn sẽ bắt đầu ván và giữ cược của cả hai trong cùng một giao dịch. Nếu bất kỳ bên nào thiếu xu, cả hai không bị trừ.
- Thắng: nhận quỹ 2X, bao gồm vốn X. Thua: mất X. Hòa: mỗi bên được hoàn X. Bàn 0 xu không phát sinh giao dịch ví.
- Server kiểm tra lượt, nước đi, thành viên, phiên bản bàn và kết quả. Client không thể gửi kết quả hoặc tự sửa số dư.
- Đầu hàng tính thua. Hòa cần đối phương chấp nhận đề nghị còn hiệu lực.
- Mất toàn bộ kết nối của một tài khoản: chờ 60 giây để kết nối lại. Nếu hết hạn và đối thủ trực tuyến, tính thua. Nếu cả hai ngoại tuyến, chờ hai bên hết hạn rồi hoàn cược. Đóng một tab trong khi còn tab khác kết nối không tính là mất kết nối.
- Khi server khởi động lại, ván và tiền đang giữ vẫn được lưu. Người chơi có lại 60 giây kể từ khi server kiểm tra ván để kết nối lại; sau đó áp dụng quy tắc trên.

## Luật game dùng cho bản thử nghiệm

- Cờ vua: `chess.js`, bao gồm phong cấp, nhập thành, bắt tốt qua đường, chiếu bí và hòa theo lịch sử nước đi.
- Caro: bàn 15×15, từ 5 quân liên tiếp trở lên thắng (không áp dụng chặn hai đầu hoặc luật Renju); đầy bàn không ai thắng thì hòa.
- Cờ tướng: kiểm tra cung, sông, cản mã, mắt tượng, ngòi pháo, đối tướng và tự chiếu. Hết nước hợp lệ tính thua; lặp thế 3 lần tính hòa. Chưa phân xử trường chiếu/trường tróc theo luật thi đấu chuyên sâu.
- Cờ vây: bàn 9/13/19, bắt quân, cấm tự sát và lặp bàn cờ (positional superko). Hai bên bỏ lượt liên tiếp sẽ tính diện tích với komi 6,5. Không có bước đánh dấu quân chết: cần bắt hết quân chết trước khi hai bên bỏ lượt. Có thể thỏa thuận hòa.

- Cờ cá ngựa: hai người, mỗi bên bốn ngựa; tung 6 để xuất chuồng, đi đúng số để về đích. Máy chủ tung xúc xắc.
- Ô ăn quan: 10 ô dân, 2 ô quan; chọn ô và hướng rải, tính ăn quân và kết thúc bằng cùng luật offline.
- Cờ chém: bàn 5×5; gánh, vây và mở theo bộ luật của game offline.
- Cờ úp: bàn 9×10; máy chủ rút mặt quân từ túi quân còn lại khi quân đi lần đầu. Không gửi trước danh tính quân chưa mở.
- Cờ tỷ phú: hai người, 32 ô, tối đa 12 vòng; mua đất, xây/bán nhà, trả nợ, tạm giữ và phá sản. Xúc xắc và bộ bài do máy chủ giữ; bài sắp rút không gửi cho client. Hết vòng so tổng tài sản, đồng hạng hoàn xu. Tiền $ trong ván tách biệt với ví xu.
- Shogi: đi/thả quân, phong cấp, chiếu bí, hòa lặp thế, xử trường chiếu và tuyên thắng nhập ngọc theo luật offline.
- Cờ Đam: Đam Anh 8×8, bắt buộc bắt và đi tiếp chuỗi bắt; phong vua, khóa quân và hòa theo luật offline.
- Othello: bàn 8×8; lật đủ tám hướng, tự nhường lượt khi hết nước, đếm quân khi hai bên cùng hết nước.

Cả 13 trò dùng chung đăng nhập, danh sách phòng, giữ cược, hòa/đầu hàng và kết nối lại. Tất cả bàn online hiện có hai người thật; cá ngựa và tỷ phú chưa có phòng online 3–4 người. Chế độ offline/bot vẫn riêng và miễn phí.

## Đồng bộ luật của tám trò mới

Nguồn luật chuẩn là tám file engine TypeScript trong `ui_chess/src/games`. `npm start`, `npm run dev` và `npm test` tự chạy `arena/sync-rules.mjs` để tạo JavaScript vào `arena/rules`, có dấu SHA-256 để kiểm tra đúng phiên bản. Không sửa trực tiếp file sinh ra. Có thể chạy riêng `npm run sync:rules`. Khi triển khai chỉ thư mục API, cần kèm các file đã sinh trong `arena/rules`.

Sau khi cập nhật mã, khởi động lại API đang chạy và tải lại frontend để nhận đủ 13 trò.

## Lưu trữ và triển khai

- Mặc định: `api/data/arena.sqlite` cùng các file WAL/SHM; thư mục đã được bỏ qua bởi Git. Không xóa thư mục này nếu muốn giữ tài khoản, ví và ván đấu. Sao lưu bằng công cụ SQLite phù hợp khi server đang chạy hoặc dừng server trước khi sao chép các file.
- Mật khẩu được băm bằng scrypt với salt riêng. Phiên đăng nhập có thời hạn 7 ngày, cookie HttpOnly/SameSite=Strict; token chỉ lưu dạng hash trong DB.
- Lịch sử ví ghi mọi lần giữ cược, hoàn cược và trả thưởng. Các cập nhật tiền và trạng thái ván dùng SQLite transaction. Nạp giả lập dùng request ID để chống cộng trùng khi thử lại.
- Vite chuyển tiếp `/api/arena` và `/arena-socket` về `127.0.0.1:3001`. Khi triển khai phải chuyển tiếp hai đường dẫn này cùng nguồn với frontend; `/arena-socket` cần hỗ trợ WebSocket. Chạy `NODE_ENV=production` trên HTTPS để cookie có cờ Secure.
- Biến cấu hình: `PORT`, `ARENA_DB_PATH`, `ARENA_ORIGINS` (danh sách nguồn tin cậy cách nhau bằng dấu phẩy khi thực sự cần chạy khác nguồn).
- Bản này dành cho một tiến trình API; presence và thời điểm mất kết nối được quản lý trong tiến trình. Không chạy nhiều bản API độc lập dùng chung DB nếu chưa bổ sung bộ điều phối kết nối.

## Kiểm tra

Trong `api`, chạy `npm test` (54 kiểm tra): tài khoản, phiên đăng nhập, ví, giao dịch giữ cược, quyết toán đúng một lần, hòa, bàn miễn phí, quyền thành viên, nước đi, lưu DB và tích hợp HTTP/WebSocket với thời gian giả lập 60 giây. Tám trò mới có kiểm tra HTTP/WebSocket, từ chối sai lượt/sai phiên bản/trạng thái giả, quyết toán, lật quân úp, chuỗi bắt, nhường lượt, phong cấp/thả quân và bảo vệ bộ bài.

Trong `ui_chess`, `npx vite build` kiểm tra đóng gói. `npm run build` còn gặp lỗi TypeScript có sẵn trong các module game cũ; phần mới không tắt hoặc nới cấu hình TypeScript để che các lỗi đó.

Kiểm tra trình duyệt cách ly: `node arena/test-support/preview.mjs` mở API ở cổng 3301 với SQLite trong bộ nhớ và hai tài khoản giả lập. Frontend Vite có thể đặt `ARENA_API_TARGET=http://127.0.0.1:3301` để thử riêng, không chạm dữ liệu thật. Chương trình này chỉ hỗ trợ kiểm tra, không dùng làm máy chủ triển khai.


## Trang quản trị

Mở **Quản trị** ở sảnh hoặc đường dẫn `/#admin` (cũng hỗ trợ `/admin` nếu máy chủ frontend chuyển về `index.html`). API quản trị ở `/api/arena/admin/*`, bắt buộc phiên đăng nhập có `users.is_admin=1`. Đăng ký công khai luôn tạo người chơi thường; client không thể tự cấp quyền. Không có mật khẩu admin mặc định.

Đăng ký tài khoản trong game trước, rồi chủ máy chủ chạy trong thư mục `api`:

```powershell
npm run admin -- grant admin
# Thu hồi quyền nếu cần:
npm run admin -- revoke admin
```

Lệnh dùng cùng `ARENA_DB_PATH` với API; nếu cấu hình DB riêng, đặt cùng biến đó trước khi chạy. Cấp quyền không thay mật khẩu hoặc ví. Các thay đổi quyền và ghi chú rà soát có nhật ký SQLite. Không cấp quyền quản trị cho tài khoản người chơi thường trừ khi có chủ đích.

Khởi động lại API để áp dụng migration và tải lại giao diện. Migration giữ nguyên tài khoản, mật khẩu băm, ví và lịch sử bàn cũ. Các bảng thêm: `match_stats`, `match_players`, `online_spans`, `admin_reviews`, `admin_audit`; `users` thêm `is_admin`, `created`. Tài khoản cũ không có ngày tạo được hiển thị là chưa ghi nhận. Dữ liệu tiếp tục nằm trong `api/data/arena.sqlite`, không dùng một file JSON làm nguồn báo cáo.

Báo cáo có lọc ngày tối đa 366 ngày, mặc định 30 ngày UTC; bảng tài khoản và lịch sử có tìm kiếm/phân trang. Số dư, tổng tài khoản, bàn đang chơi và người online là giá trị hiện tại. Số ván và độ phổ biến game tính theo ngày bắt đầu; kết quả, tỷ lệ thắng và lãi xu tính theo ngày hoàn thành. Tỷ lệ thắng = thắng / tổng ván hoàn thành, gồm hòa; mặc định ít nhất 5 ván để vào bảng tỷ lệ (có thể đổi). Lãi xu = +mức cược khi thắng, -mức cược khi thua, 0 khi hòa; không gồm vốn hoàn trả, tiền đang giữ hoặc xu nạp. Bàn 0 xu vẫn được đếm vào lượt chơi.

Hiện chỉ ghi nhận ván online trên máy chủ. Ván bot/offline chưa đồng bộ lịch sử lên API nên không được cộng vào thống kê trận. Xu nạp chưa được quy cho một trò cụ thể. Nạp xu giả lập, quỹ cược và trả thưởng không phải doanh thu thật. Tích hợp thanh toán hiện theo `PAYMENTS.md`; thu nạp Live chỉ tính đơn đã xác minh, theo giá gói và chưa trừ phí/hoàn tiền. Phí bàn hiện bằng 0.

`online_spans` ghi khoảng thời gian kết nối hợp nhất mỗi tài khoản, gồm sảnh, admin và game khi đã đăng nhập. Nhiều tab không cộng trùng. Heartbeat lưu mỗi 15 giây; dừng bất thường chỉ tính đến heartbeat cuối (có thể thiếu tối đa một chu kỳ). Khởi động lại đóng khoảng cũ tại lần ghi cuối, không tính thời gian server tắt. Kết nối ghi hoạt động ở sảnh tách khỏi kết nối tham gia bàn, nên không vô hiệu hóa luật mất kết nối 60 giây của ván. Thời gian online không đồng nghĩa người dùng đang tương tác. Không có dữ liệu lịch sử trước lần bắt đầu ghi nhận.

Cảnh báo chỉ gợi ý rà soát: lệch số dư/sổ xu toàn thời gian; nạp ít nhất 50.000 xu trong kỳ; ít nhất 5 lần nạp trong 10 phút; thắng ít nhất 90% trên ít nhất 10 ván và lãi 10.000 xu; hoặc thắng ít nhất 90% trên ít nhất 5 ván có xu cùng đối thủ và lãi 1.000 xu. Không tự khóa tài khoản hay sửa tiền. Trạng thái rà soát gắn với quy tắc, kỳ báo cáo và bằng chứng hiện tại; bằng chứng thay đổi sẽ tạo tín hiệu mới để tránh bỏ qua hoạt động phát sinh sau lần rà soát.

Kiểm tra giao diện riêng: `node arena/test-support/admin-preview.mjs` dùng SQLite trong bộ nhớ ở cổng 3302. Khởi động Vite với `ARENA_API_TARGET=http://127.0.0.1:3302` để xem dữ liệu giả lập; không dùng chương trình này làm API thật. Ảnh kiểm tra dùng tài khoản và số liệu giả, không phải doanh thu của hệ thống thực.


## QR / ví điện tử / thẻ và công tắc Demo

Xem [PAYMENTS.md](PAYMENTS.md) để tự cấu hình merchant trong admin, chọn Sandbox/Live, bật tắt kênh, quản lý khóa mã hóa và đăng ký webhook. Tỷ lệ mặc định theo yêu cầu là **1 VNĐ = 1 xu**. Các ví demo, kiểm thử và tiền thật được giữ riêng.

Cờ thế: phòng hai người chọn sẵn bài tập, Đỏ chiếu liên tiếp để chiếu bí trong giới hạn; Đen hóa giải. Bàn 0 xu, trạng thái và kết quả lưu SQLite. Offline luyện tập riêng với máy và lưu sao trên thiết bị.
