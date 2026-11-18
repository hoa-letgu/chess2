# Cờ thế · Thiên Cơ Kỳ Trận

Chế độ giải thế cờ tướng miễn phí trong sảnh, chọn offline rồi vào bàn và chọn thế ở Tàng kinh kỳ phổ. Có 12 bài tập tự biên soạn: 6 thế gốc và 6 thế đổi cánh, không gán tên một bộ kỳ phổ lịch sử.

Mục tiêu: Hồng quân đi trước, chiếu liên tiếp để chiếu bí trong 1, 2 hoặc 3 nước đỏ. Bộ giải xét mọi nước phòng thủ hợp lệ, chấp nhận các lời giải khác nhau; không khóa vào một chuỗi tọa độ. Luật đủ Xe/Mã/Tượng/Sĩ/Pháo/Tốt/Tướng, cản chân/mắt, ngòi pháo, sông, cung và không để hai Tướng đối mặt. Không cho bắt Tướng thay cho chiếu bí.

Worker phân tích tách khỏi luồng giao diện; thay thế cờ sẽ hủy worker cũ. Gợi ý đánh dấu quân và ô đích; Đi lại quay về trước lượt đỏ vừa đi. Thành tích tốt nhất lưu localStorage theo từng thế: 3 sao tự giải, 2 sao dùng gợi ý, 1 sao dùng đi lại. Lưu trên thiết bị, không gắn số dư hoặc xếp hạng tài khoản.

Danh mục API có 13 game online (mode=online). Admin bật/tắt bảo trì Cờ thế độc lập. Cờ thế chỉ có bàn luyện tập 0 xu.

Bàn dùng ArenaBoard và hiệu ứng Chiếu Tướng bát quái có sẵn; nền rừng trúc xanh huyền ảo dùng cothe/bamboo-mystic.webp. Bìa cover.svg là minh họa vector cùng hệ bìa của các game trong dự án.

Kiểm tra: npm run test:cothe. Mỗi thế được kiểm tra vị trí gốc, độ dài tối thiểu của bài nhiều nước và toàn bộ nhánh phòng thủ sau lời giải. Có kiểm tra chân mã, ngòi pháo, sông/cung, chiếu Tướng, nước sai và lời giải khác.


## Online và offline
Sảnh Cờ thế mở lựa chọn Offline phá thế cùng máy hoặc Online đấu thế hai người.
Online dùng tài khoản, phòng, kết nối lại và lưu kết quả SQLite chung. Chủ bàn cầm Đỏ, khách cầm Đen; chủ chọn một trong 12 thế trước khi mở phòng. Mặc định Tam Điệp Liên Hoàn (3 nước).
Đỏ phải chiếu liên tiếp và chiếu bí trong số nước đỏ quy định. Đen tự đi quân để hóa giải, không dùng bot. Đỏ ngắt chuỗi chiếu hoặc hết nước cho phép thì Đen thắng. Nước sai luật bị từ chối và không đổi trạng thái. Kết quả do máy chủ xác định.
Chỉ bàn 0 xu vì các bài tập có lời giải và hai vai không cân bằng. Không có gợi ý hoặc đi lại trong online. Tiến độ sao offline lưu riêng trên thiết bị.
Luật chuẩn nằm ở engine.ts, sync-rules.mjs tạo api/arena/rules/cothe.js khi khởi động và kiểm tra API.
Nền riêng bamboo-mystic.webp dùng cho cả offline, online, trang đăng nhập và tạo phòng Cờ thế.


## Người chơi tự tạo thế
Nút Tạo thế mở trình xếp quân trên bàn trống hoặc sao chép thế đang chọn. Chọn quân đỏ/đen rồi chạm điểm đặt, di chuyển, tẩy, hoàn tác (50 thao tác), đặt tên tối đa 60 ký tự và mục tiêu 1–3 nước đỏ. Kiểm tra đúng số quân, vị trí cung/sông/Sĩ/Tượng/Tốt, đúng hai Tướng và không chiếu sẵn. Worker kiểm tra lời giải trước mọi phòng thủ; giới hạn 8 giây, có Dừng kiểm tra, không lưu khi chưa tìm được lời giải.
Lưu và chơi tạo mục Thế của tôi, tối đa 50 thế trong localStorage (board-arena-cothe-custom-v1). Sửa / chia sẻ thế này cập nhật thế đã có và xóa điểm sao cũ. Chia sẻ bằng JSON phiên bản 1; chỉ chứa tên, bàn cờ, mục tiêu; nhập mã phải kiểm tra lại trước khi lưu. Mã tối đa 20.000 ký tự. Nội dung không hợp lệ được báo lỗi, không ghi đè bộ sưu tập.
Phòng online có thêm các thế riêng của thiết bị vào danh sách Thế cờ. Máy chủ kiểm tra lại cấu trúc, vật liệu và vị trí theo luật, tự tạo lượt/giới hạn/trạng thái, không tin kết quả hoặc trạng thái do client gửi. Kiểm tra lời giải nằm trong trình tạo trên máy người dùng; server không chạy bộ giải khi tạo phòng. Phòng chỉ 0 xu. Board và kết quả phòng lưu trong SQLite chung để đối thủ không cần cài hoặc nhập trước thế này. Bộ sưu tập cá nhân hiện lưu trên thiết bị, chưa đồng bộ theo tài khoản.
