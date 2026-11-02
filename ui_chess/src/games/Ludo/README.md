# Cờ cá ngựa · Neon Club

Mở từ thẻ **Cờ cá ngựa** ở sảnh game. Mặc định chơi với 3 bot; chọn **Ván mới → Cùng bạn bè** để chơi 2–4 người trên cùng thiết bị. Đây là game miễn phí tại chỗ, chưa tích hợp phòng online hoặc ví xu.

- `ludoEngine.ts`: luật chơi thuần, tách khỏi giao diện và hiệu ứng.
- `LudoBoard.tsx`: bàn và quân ngựa SVG với góc nhìn nghiêng, ô nổi khối và bốn màu.
- `LudoGame.tsx`: xúc xắc, lựa chọn ngựa, hiệu ứng di chuyển, bot, tạm dừng và cấu hình.
- `ludo.css`: giao diện riêng, không ghi đè các game khác.

Biến thể Ludo: tung 6 xuất chuồng; tung 6 được thêm lượt; ba lần 6 liên tiếp bỏ lượt tung thứ ba. Đi trên đường chung rồi về đường riêng, phải đúng số điểm để đến đích. Đáp xuống ô không an toàn có quân đối phương sẽ đá các quân đó về chuồng. Có 8 ô sao an toàn; được đứng chung ô, không áp dụng luật hàng rào. Đưa đủ 4 ngựa về đích để thắng. Các ô đích hiển thị 1–6 trên đường riêng.

Xúc xắc dùng `crypto.getRandomValues` với rejection sampling. Bot ưu tiên về đích, đá ngựa và xuất chuồng; có thể tạm dừng để ngừng bot. Âm thanh mặc định tắt và có nút bật riêng. Quân được di chuyển từng bước, không nhảy qua đường chéo của bàn.

Kiểm tra: trong `ui_chess`, chạy `npm run test:ludo`. Bộ kiểm thử bao gồm bố cục đường đi, xuất chuồng, chuyển lượt, luật ba lần 6, đá ngựa, ô an toàn, về đích, cấu hình 2–4 người và mô phỏng đầy đủ một ván bot đến chiến thắng.
