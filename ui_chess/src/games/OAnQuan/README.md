# Ô ăn quan · Làng quê

Mở thẻ **Ô ăn quan** trong sảnh. Game tại chỗ miễn phí: chơi với Bé Trâu (máy) hoặc hai người cùng thiết bị; Chọn Đấu online ở sảnh để dùng phòng hai người và ví xu thử nghiệm chung.

## Cách chơi của bản này

- 10 ô dân × 5 quân và 2 ô quan, mỗi ô một quan. Dân = 1 điểm, quan = 10 điểm.
- Phía dưới đi trước. Chọn ô dân của mình và hướng rải. Rải từng quân, bao gồm vào ô quan. Quan không bao giờ được nhặt lên để rải.
- Sau khi rải hết, ô kế tiếp là ô dân có quân thì nhặt tiếp để rải. Gặp ô quan có quân thì dừng. Gặp một ô trống và sau đó là một ô có quân thì ăn ô sau; ăn liên tiếp khi có các khoảng trống xen kẽ.
- Tùy chọn **quan non**: cần ít nhất 5 dân trong ô có quan mới được ăn. Mặc định tắt cho bản dễ tiếp cận.
- Nếu đầu lượt cả 5 ô của người tiếp theo đều trống, rải lại 1 dân mỗi ô và trừ 5 điểm. Bản số hóa cho phép ghi nợ tạm (điểm âm) khi chưa đủ điểm; không cần thao tác vay dân của người còn lại. Tổng giá trị trên bàn cộng điểm luôn bằng 70.
- Khi hai quan đã bị ăn: thu dân ở 5 ô bên mình về điểm của mình. Dân còn tại các ô quan đã trống quan thuộc người ăn quan cuối cùng.
- Thế rải lặp trong một nước sẽ dừng nước đó để tránh lặp vô hạn. Ván đạt 300 lượt thì kết thúc theo điểm đã ăn. Hai điều này là giới hạn kỹ thuật của bản chơi tại chỗ.

Các biến thể có thể khác nhau về quan non, giá trị quan, vay dân và cách thu quân cuối ván. Giao diện hướng dẫn ghi rõ quy tắc dùng trong game. Tham khảo cơ chế rải/ăn quân từ [nghiên cứu của nhóm UIT/VNU-HCM về Ô ăn quan](https://arxiv.org/html/2507.03711v1) và [tài liệu trò chơi dân gian của Thư viện Lâm Đồng](https://www.thuvienlamdong.org.vn/Files/Books/151697.pdf); bản này không áp dụng giới hạn cấm ăn quan trong hai vòng đầu của nghiên cứu.

## Chức năng và mã nguồn

- `engine.ts`: luật thuần, các khung hình rải/ăn và bot nhìn trước hai nửa lượt.
- `QuanBoard.tsx`: bàn đất nung, 10 ô dân/2 ô quan, sỏi và điểm từng ô.
- `QuanArt.tsx`: minh họa SVG làng quê và bé trâu đội nón lá.
- `OAnQuanGame.tsx`: chọn ô/hướng, gợi ý, đi lại, tạm dừng và rải nhanh.
- **Đi lại** trong chế độ máy quay về trước nước gần nhất của người; trong chế độ hai người quay lại một nước.
- **Khéo tính** xem nước đáp trả tốt nhất của đối phương. **Nhẹ nhàng** ưu tiên điểm tức thời.
- Hình vẽ và phong cách được giới hạn trong game, không thay đổi game khác.

Trong `ui_chess`, chạy `npm run test:quan` để kiểm tra luật, điểm, khung hình và mô phỏng ván hoàn chỉnh.
