# Ô Ăn Quan: hiệu ứng chung offline và online

Chuỗi được dựng từ `lastMove` đã xác nhận, kiểm tra lại trạng thái kết quả trước khi phát. Bốc 300ms, bốc tiếp 200ms, rải 150ms/viên, ăn dân 500ms, ăn Quan 900ms, chốt lượt 250ms. Sỏi bay cung thấp, Quan bay về kho với sóng vàng và hạt sáng. Điểm tăng sau thu quân; kết thúc có hoa giấy và Quan đã thu. Có rải nhanh, âm thanh tùy chọn, hỗ trợ giảm chuyển động, hủy timer và giữ lượt trong khi phát.

Đã kiểm tra: 11 bài luật và 3 bài chuỗi; 14 native API; thử HTTP/socket tám game. Playwright offline và hai phiên online qua bảy nước: bắt Quan có vòng sóng 900ms, kết thúc 48–22 ở cả hai phía, 18 hạt hoa giấy và hai Quan. Mobile 393px không tràn ngang. Kiểm tra lại lỗi đếm điểm khi đổi thời lượng cuối ván: số hiển thị khớp 48–22, tổng 70.
