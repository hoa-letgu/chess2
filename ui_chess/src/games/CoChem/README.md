# Cờ chém · Sân đình

Game này dùng biến thể **cờ gánh 5×5**, với tên Cờ chém theo cách gọi phổ biến. Tên gọi và luật dân gian có thể khác theo vùng; không phải biến thể quân bị loại khỏi bàn. Tham khảo cơ chế của [nhà phát triển Co Ganh](https://play.google.com/store/apps/details?id=org.earium.co.ganh.co.chem) và [hồ sơ luật do ChessPlayX dùng cho Cờ Gánh](https://chessplayx.com/vi/co-ganh). Các giới hạn kết thúc ván được công bố trong giao diện.

## Chơi

Mở **Cờ chém** từ sảnh. Mặc định Bạn Lá đấu Chú Cò; chọn **Ván mới** để đổi mức bot hoặc chơi hai người cùng thiết bị. Chọn Offline để chơi miễn phí tại chỗ, hoặc Đấu online để vào hệ thống phòng hai người và ví xu thử nghiệm chung.

- Ban đầu: mỗi bên 8 quân, 9 điểm trống. Bên Lá đi trước. Bên Sen chiếm hàng trên, hai góc hàng 2 và điểm trái hàng giữa; Lá đối xứng lại.
- Đi một quân một bước tới điểm trống có đường nối. Ngang/dọc tại mọi điểm, chéo chỉ khi tổng tọa độ hàng/cột là chẵn. Hình vẽ và bộ sinh nước đi dùng cùng hàm `neighbors`.
- **Gánh:** hai quân đối phương ở hai phía đối xứng nối kề quân vừa đi bị đổi phe. Có thể gánh nhiều cặp trong một nước. Không áp dụng luật chẹt một quân kẹp giữa hai quân mình.
- **Vây:** sau gánh, tất cả nhóm quân đối phương không còn giao điểm trống kề được đổi phe đồng thời.
- **Mở:** mặc định bật. Sau nước không đổi quân, nếu bên tới lượt có thể gánh bằng cách đi vào điểm vừa bỏ trống thì chỉ các nước đáp lại đó hợp lệ. Có thể tắt để học luật cơ bản.
- Thắng khi đối phương hết quân hoặc hết nước hợp lệ. Hòa khi bàn cờ, lượt và thế mở lặp 3 lần, hoặc đạt 200 lượt. Luôn giữ 16 quân trên bàn.
- Gợi ý đánh dấu quân và điểm đến; đi lại trước nước người gần nhất khi đấu bot, hoặc một nước khi chơi cùng thiết bị.
- Bot Nhẹ nhàng chấm điểm trực tiếp; Khéo nghĩ xem một nước đáp trả (hai nửa lượt).

## Mã nguồn và kiểm tra

`engine.ts` chứa luật thuần; `ChemBoard.tsx` vẽ lưới và quân SVG, dấu điểm đến, quân di chuyển và hiệu ứng lật phe. `ChemArt.tsx` chứa làng quê, ao sen và Cò đội nón lá. `chem.css` giới hạn giao diện trong game, không thay đổi các trò khác.

Trong `ui_chess`, chạy `npm run test:chem` để kiểm tra lưới, nước đi, gánh, vây, mở, thắng/hòa, bot và mô phỏng ván hoàn chỉnh.
