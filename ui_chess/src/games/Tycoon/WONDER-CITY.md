# Cờ Tỷ Phú — Wonder City

Giao diện dùng chung offline/online: nền thành phố pastel, bốn nhân vật chibi, ô đất nổi, cờ chủ sở hữu, nhà nhỏ, xúc xắc tương tác, bảng số dư và âm thanh tùy chọn. Bản cập nhật hình thoi dùng SVG cho mặt ô bo góc, sprite nhà cửa/nhân vật, dãy người chơi trái, bảng hiệu ứng phải và thanh hành động dưới. Mỗi ô vẫn là nút tương tác độc lập. Giữ luật 32 ô; không phải bản sao từng pixel của ảnh mẫu.

## Luật đang hoạt động
- Offline: 2–4 người, đấu bot hoặc cùng thiết bị. Online: 2 tài khoản.
- Mỗi người $1.500 trong ván; tiền này tách biệt ví xu.
- Tung hai xúc xắc, đi vòng 32 ô, qua Xuất phát +$200.
- Mua/bỏ qua đất, thuê đất, bộ hai phố cùng màu, xây cân bằng tối đa ba cấp, bán nhà/đất về ngân hàng.
- Ga tàu, tiện ích, thuế, công viên, thẻ cơ hội, tạm giữ/bảo lãnh, nợ và phá sản.
- Người cuối cùng hoặc tổng tài sản cuối số vòng quyết định thắng; hỗ trợ đồng thắng.
- Chưa có đấu giá, trao đổi tài sản giữa người chơi, thế chấp, trang phục hoặc thẻ kỹ năng.

## Hiệu ứng
`tycoon-motion.ts` dựng chuỗi từ hai trạng thái được xác nhận liên tiếp. `useTycoonReplay` dùng chung hai chế độ; máy chủ quyết định xúc xắc và thẻ online. Không phát lại snapshot trùng, mất nhiều phiên bản hoặc khi đặt lại bàn.

- Xúc xắc 1.000ms; nhảy từng ô 150ms.
- Thẻ lật 800ms; nhà tù 850ms.
- Mua/xây 650ms; số tiền/đồng xu 750ms; đổi lượt 450ms; chiến thắng 1.400ms.
- Giữ trạng thái trước giao dịch trong lúc đi; khóa thao tác cho đến khi kết thúc chuỗi. Hủy timer khi unmount/có trạng thái mới.
- Cờ sở hữu, nhà nổi, bộ màu sáng, tiền dương vàng/âm hồng, bảng tiền đếm dần; âm thanh tổng hợp bật bằng thao tác người dùng.
- Tôn trọng `prefers-reduced-motion`.

## Kiểm tra 18-11-2026
- 18 bài kiểm tra luật + 3 bài kiểm tra chuỗi hiệu ứng đạt.
- 14 bài kiểm tra native API đạt, gồm quyền thao tác, trạng thái cũ, bộ thẻ riêng và thanh toán một lần.
- Playwright: vào từ sảnh, offline tung/nhảy/thuế; hai phiên độc lập bàn 0 xu cùng nhận dice/hop, mua Chicago $160, cờ sở hữu và bốn đồng xu. Sau mua cả hai hiển thị $1.340/$1.500; lượt thứ hai có hiệu ứng đến từ đối thủ.
- Kiểm tra 393×852 không tràn ngang; chế độ giảm chuyển động bỏ qua chuỗi; nút âm thanh bật được.
- ESLint các file Tycoon đạt. Vite đóng gói đạt. `tsc -b` toàn dự án còn lỗi có trước tại các game cũ; không có lỗi tại Tycoon/OnlineNativeMatch/ArenaHub/Ô Ăn Quan trong lần lọc kiểm tra.
- Nhánh thẻ/nhà tù/xây được kiểm thử mô hình, chưa quan sát đủ mọi sự kiện bằng trình duyệt. Hình minh họa dùng sprite và CSS, không mô phỏng vật lý 3D hay biểu cảm khuôn mặt riêng cho từng sự kiện.

## Tài nguyên
Ảnh tạo bằng công cụ imagegen tích hợp, nén WebP bằng sharp:
- `public/tycoon/chibi-atlas.webp`: atlas 2×2, alpha, 1024px.
- `public/tycoon/wonder-city.webp`: nền thành phố 1600×900.
- Prompt gốc: `public/tycoon/ASSET-PROMPTS.md`.


## Kiểm tra bản hình thoi
- 32/32 tâm ô nhận đúng đối tượng bấm; chọn Dallas và mua đất qua thanh mới hoạt động.
- Offline qua sảnh: xúc xắc → nhảy → mua, không thay luật.
- Hai phiên online riêng, bàn 0 xu: cùng dice/hop, dừng tại ô 5 ở cả hai phía. Có ảnh giữa lúc gieo xúc xắc.
- Mobile 393×852 không tràn ngang. Bảng hiệu ứng mặc định thu gọn trên thiết bị hẹp và bật lại từ nút Hiệu ứng.
- Bố cục tham chiếu 1672×941, ảnh `tycoon-isometric-desktop.png` tại gốc dự án.
- Nhà/khách sạn/cửa hàng/rương bên ngoài đường đi là trang trí; nhà trên đất và cờ sở hữu phản ánh trạng thái thật.
- Không thêm nút trao đổi/thẻ kỹ năng chưa có luật. Thay bằng Mua đất, Bán nhà, Hết lượt/Bỏ qua đang hoạt động.
