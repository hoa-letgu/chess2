# Hiệu ứng quân cờ tướng / cờ úp / cờ thế

Dùng chung `useXiangqiMotion` cho ArenaBoard và UpBoard, cả offline và online.
Chuyển động chỉ biểu diễn trạng thái đã được luật game / máy chủ chấp nhận.

- Tốt 310ms, Sĩ 360ms, Tướng 460ms, Tượng 510ms, Mã 610ms, Xe 390ms.
- Pháo đi 360ms, ăn quân 660ms.
- Cờ úp giữ mặt úp trong chuyển động, dùng vai trò trước khi lật; hiện quân mới lúc đáp xuống.
- Góc nhìn đảo bàn được tính theo tọa độ hiển thị; đổi góc nhìn hủy chuyển động đang chạy.
- Không chạy lại khi nhận cùng trạng thái; bỏ hiệu ứng khi tải bàn hoặc thay nhiều ô.
- Chặn bấm bàn trong thời gian quân di chuyển; nước nhận tiếp theo hủy hiệu ứng trước và dùng trạng thái mới.
- Tôn trọng tùy chọn giảm chuyển động của hệ điều hành.
- Online cờ úp giữ component qua các phiên bản ván, để nước đi từ đối thủ cũng có hiệu ứng.

Kiểm tra: 3 bài kiểm tra nhận diện nước đi/thời lượng/lật quân, 16 bài cờ thế và 14 bài cờ úp đạt. Vite build đạt. Kiểm tra TypeScript toàn dự án vẫn có lỗi cũ ở các game legacy.

Chưa xác minh hình ảnh giữa chuyển động và hai phiên trình duyệt online: Playwright MCP và trình duyệt trong ứng dụng đều không kết nối được 127.0.0.1:5178; thử HTTP tại máy báo socket bị chặn quyền truy cập. Cần kiểm tra trực quan khi kết nối local hoạt động, gồm 7 loại quân, Pháo ăn quân, cả hai hướng bàn và hai người chơi.
