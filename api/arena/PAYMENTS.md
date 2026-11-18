# Thanh toán QR, ví và thẻ

Mặc định **Demo**, tỷ lệ **1 VNĐ = 1 xu**. Nạp tiền chỉ hoạt động khi quản trị cấu hình merchant, bật kênh, chọn môi trường và lưu công tắc **Nạp tiền**. Việc thêm mã không tự mở tài khoản merchant hoặc kích hoạt thu tiền thật.

## Thiết lập bằng trang admin

1. Cập nhật API, chạy `npm install`, khởi động lại API và tải lại frontend. Đăng nhập `admin`, mở **Cấu hình thanh toán**.
2. Trong **Tự cấu hình tài khoản cổng thanh toán**, chọn cổng và Sandbox/Live tương ứng với thông tin merchant được cấp. Điền các trường và bấm **Lưu thông tin cổng**. Có thể bắt đầu với một cổng, tắt các kênh chưa dùng.
3. Nhập **Địa chỉ website công khai**, ví dụ `https://game.example.com`. Frontend, `/api/arena` và `/arena-socket` dùng cùng nguồn; reverse proxy phải chuyển tiếp các đường dẫn này đến API. Localhost không nhận được webhook từ Internet. Không dùng địa chỉ callback của bên khác.
4. Đăng ký webhook với nhà cung cấp theo danh sách dưới đây. Bật các kênh muốn hiển thị. Nếu chỉ dùng một merchant ZaloPay, có thể chọn **Kênh chuyển khoản ngân hàng → ZaloPay · VietQR** để dùng chung cho ví ZaloPay, VietQR và thẻ quốc tế; từng tính năng cần được nhà cung cấp cấp phép trên tài khoản merchant.
5. Chọn Sandbox để thử với tài khoản thử của nhà cung cấp. Bật **Nạp tiền** và **Lưu cấu hình thanh toán**. Sau khi hoàn thành kiểm thử/onboarding, nhập thông tin Live, chọn Live, bật kênh và lưu. Không dùng tiền thật trên Sandbox.

Chuyển Demo ↔ Nạp tiền, hoặc Sandbox ↔ Live khi đang nạp tiền, yêu cầu không còn bàn đang chờ/đang chơi. Đổi phương thức/tỷ lệ không thay đổi số tiền hoặc số xu đã chốt trên đơn cũ. Không thay khóa merchant khi còn đơn chưa đối soát; duy trì thông tin của cả hai môi trường để xử lý các thông báo đến muộn.

## Thông tin của mỗi cổng

| Cổng | Trường cần nhập | Kênh |
|---|---|---|
| MoMo | Partner code, Access key, Secret key | Ví MoMo / QR / hosted checkout |
| ZaloPay | App ID, Key 1, Key 2 | Ví; thẻ quốc tế (`international_card`); VietQR (`vietqr`) nếu được cấp phép |
| ShopeePay | Client ID, Secret key, Merchant ID, Store ID | Checkout/QR, nền tảng PC hoặc mobile web |
| payOS | Client ID, API key, Checksum key | VietQR ngân hàng; payOS chỉ có API Live, không mô phỏng ngân hàng thật trên Sandbox |
| PayPal | Client ID, Client secret, Webhook ID, VNĐ cho 1 USD | PayPal Orders v2 bằng USD; số tiền USD thực tế được hiển thị trước thanh toán |

PayPal không thu VNĐ trong phần tích hợp này. Giá gói tính bằng VNĐ, số cent USD được làm tròn lên theo tỷ giá merchant tự nhập. Đơn chốt sẵn số cent, loại tiền và xu; không tự lấy tỷ giá thị trường hoặc tính lại sau khi khách thanh toán. Thẻ Visa/Mastercard trong giao diện dùng trang nhập thẻ do ZaloPay cung cấp, không nhập số thẻ/CVV vào website game.

Webhook (thay tên miền bằng website của bạn):

```text
POST https://game.example.com/api/arena/payments/webhook/momo
POST https://game.example.com/api/arena/payments/webhook/zalopay
POST https://game.example.com/api/arena/payments/webhook/shopeepay
POST https://game.example.com/api/arena/payments/webhook/payos
POST https://game.example.com/api/arena/payments/webhook/paypal
```

ShopeePay đăng ký callback trong quy trình onboarding. Với PayPal, đăng ký webhook thực và lấy Webhook ID; theo dõi ít nhất `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`, `CUSTOMER.DISPUTE.CREATED`. Sau khi người chơi duyệt trên PayPal, nút **Hoàn tất sau khi duyệt trên PayPal** gửi yêu cầu capture có kiểm tra quyền chủ đơn và mã idempotency. Redirect tự nó không cộng xu.

## Bảo vệ cấu hình và dữ liệu

Thông tin nhập từ admin được mã hóa AES-256-GCM trong `payment_credentials` (SQLite). Trình duyệt chỉ nhận cờ “đã cấu hình”, không nhận lại giá trị. Để trống giữ nguyên; ô “Xóa giá trị đã lưu” gỡ giá trị khỏi SQLite. Nhật ký chỉ ghi tên các trường thay đổi, không ghi bí mật. Thông tin lưu trong SQLite ưu tiên hơn các biến môi trường của cùng cổng/môi trường.

Khóa mã hóa mặc định được tạo tại `api/data/payment-config.key` khi lần đầu lưu merchant; không trả khóa này qua API và thư mục dữ liệu đã được Git bỏ qua. **Sao lưu khóa này cùng SQLite ở nơi bảo mật**; mất khóa sẽ không giải mã được thông tin đã lưu. Có thể dùng biến máy chủ `PAYMENT_CONFIG_KEY` (32 byte dưới dạng 64 ký tự hex hoặc base64) thay cho file. Dùng một khóa ổn định qua các lần triển khai; không thay khóa khi chưa chuyển đổi dữ liệu cũ.

Nếu muốn cấu hình bằng máy chủ, dùng `api/.env.example`, sao chép thành `api/.env`, điền giá trị rồi chạy `npm run start:payments`. File `.env` được Git bỏ qua. Các biến có tiền tố môi trường, ví dụ `MOMO_SANDBOX_SECRET_KEY` và `MOMO_LIVE_SECRET_KEY`, giúp giữ cấu hình của các đơn đang chờ ở cả hai môi trường. Biến không có tiền tố môi trường chỉ thuộc môi trường khởi động máy chủ. Địa chỉ/env lưu từ admin ưu tiên hơn mặc định máy chủ.

Ba ví tách biệt:

- Demo: số dư cũ trong `users.balance`, giao dịch `demo_topup`.
- Sandbox: `users.sandbox_balance`, giao dịch `sandbox_topup`; không chuyển thành xu thật.
- Live: `users.paid_balance`, giao dịch `paid_topup`.

Bàn đấu chốt `wallet_mode`; giữ cược/quyết toán dùng đúng ví đó. Đơn nạp cũng chốt ví, môi trường, giá gói, loại tiền và số xu. Dù admin đổi chế độ trước khi nhận thông báo, đơn vẫn vào đúng ví gốc. Tất cả thay đổi xu và biên nhận thanh toán dùng cùng SQLite transaction.

`payment_orders` lưu đơn; `payment_receipts` có khóa duy nhất theo cổng/môi trường/mã giao dịch để không cộng hai lần; `payment_events` lưu sự kiện đối soát. Người chơi chỉ đọc được đơn của mình. Nội dung QR được tạo cục bộ từ dữ liệu cổng trả về, không gửi sang website tạo QR khác. QR của đơn hiện có hiệu lực 20 phút; đơn được thanh toán hợp lệ muộn vẫn được đối soát và cộng đúng một lần.

Webhook phải xác minh chữ ký, rồi máy chủ gọi API nhà cung cấp để kiểm tra lại. Máy chủ kiểm tra mã đơn, số tiền, loại tiền, merchant và mã giao dịch; không tin trạng thái do trình duyệt gửi. Các đơn chưa rõ kết quả giữ trạng thái cần kiểm tra, không tự báo thất bại rồi tạo mã mới. Mỗi phút hệ thống kiểm tra tối đa ba đơn chưa đối soát trong 24 giờ gần nhất, ưu tiên đơn ít được kiểm tra; người chơi cũng có nút kiểm tra trực tiếp. Quá 24 giờ cần dùng kiểm tra thủ công theo mã đơn hoặc nhận webhook hợp lệ.

Hoàn tiền/đảo giao dịch/khiếu nại được đánh dấu **Cần đối soát**, chưa tự thu hồi xu hoặc tự trả tiền. Dùng công cụ nhà cung cấp và quy trình đối soát của merchant để xử lý; không coi hệ thống hiện tại là bộ xử lý refund/chargeback tự động.

## Số liệu admin

Xu nạp, lãi/lỗ, sổ xu và bàn đấu lọc theo ví đang áp dụng. Thu nạp Live tính các đơn Live đã xác nhận trong kỳ, theo giá gói VNĐ đã chốt; **chưa trừ phí cổng hoặc hoàn tiền**, và không phải lợi nhuận. PayPal thực thu USD; số tiền gốc hiển thị trong lịch sử đơn. Chưa thu phí bàn nên phí bàn bằng 0. Không quy xu nạp cho riêng một game khi đơn không có dữ liệu phân bổ.

## Kiểm tra

`npm test` trong `api`: 54 kiểm tra hiện tại, bao gồm phân quyền, từng adapter, chữ ký webhook, đối soát lại trạng thái, mã giao dịch trùng, sai số tiền, ví tách biệt, tỷ lệ 1:1, mã hóa, dữ liệu tồn tại sau khi mở lại SQLite và các game cũ. Các bài thanh toán dùng cổng giả lập, không thực hiện giao dịch tiền thật. Cần thử riêng với merchant Sandbox/Live của bạn trước khi vận hành thực tế.

`node arena/test-support/payment-preview.mjs`: API kiểm tra cổng giả lập ở `127.0.0.1:3303`, SQLite trong bộ nhớ. Vite có thể đặt `ARENA_API_TARGET=http://127.0.0.1:3303`; tài khoản `admin_preview` / `player_preview`, mật khẩu thử `preview-password`. Mã QR của preview chứa chuỗi `TEST-ONLY-...`, không dùng để chuyển tiền.

## Tài liệu chính thức đã đối chiếu

- [MoMo — One-Time Payments](https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/)
- [ZaloPay — tạo đơn, ví/thẻ/VietQR](https://docs.zalopay.vn/docs/specs/order-create/)
- [ShopeePay — Checkout](https://product.shopeepay.com/integration/api/checkout-with-shopeepay)
- [ShopeePay — chữ ký và merchant](https://product.shopeepay.com/integration/get-started)
- [payOS API](https://payos.vn/docs/api/) và [SDK chính thức](https://github.com/payOSHQ/payos-lib-node)
- [PayPal Orders](https://developer.paypal.com/whats-an-order/) và [webhook](https://developer.paypal.com/api/rest/webhooks/)

## Khóa một phần xu

Admin → Người chơi → chọn tài khoản → Khóa xu một phần. Nhập **tổng số xu muốn khóa**, không phải số cộng thêm; ghi lý do và lưu. Nhập 0 kèm lý do để mở khóa. Mức khóa không vượt số dư hiện tại (không gồm xu đang giữ cược).

Số dư tổng không đổi; xu khả dụng = số dư tổng − xu khóa. Người chơi chỉ tạo/vào bàn trong phạm vi xu khả dụng; bàn 0 xu vẫn hoạt động. Kiểm tra thực hiện ở máy chủ, cho cả hai người ngay trước khi giữ cược. Ván đang chơi vẫn trả thưởng/hoàn cược đúng quy tắc; nạp và tiền về ván làm tăng xu khả dụng, không tự tăng mức khóa cố định.

Mức khóa lưu SQLite theo tài khoản và từng ví Demo/Sandbox/Live; đổi chế độ không xóa hoặc chuyển khóa sang ví khác. Lịch sử lưu quản trị viên, thời gian, mức cũ/mới, loại ví và lý do; hồ sơ hiển thị 20 thao tác gần nhất trên các ví. Lưu có kiểm tra phiên bản và loại ví để tránh ghi đè khi hai admin thao tác hoặc chế độ thanh toán đổi. Không tự khóa tài khoản thật khi cài tính năng.

## Bảo trì từng trò chơi

Admin → Bảo trì trò chơi → bật công tắc trò cần ẩn → nhập thông báo (tùy chọn) → Lưu cấu hình. Tắt công tắc và lưu để mở lại. Mặc định cả 12 trò đang mở; việc cài tính năng không tự ẩn trò nào.

Cấu hình nằm trong bảng SQLite `game_maintenance`, thay đổi được ghi vào `admin_audit`; chỉ admin được sửa, có kiểm tra phiên bản tránh ghi đè. Sảnh, thanh chọn nhanh và danh sách tạo bàn bỏ trò bảo trì, cập nhật trong khoảng 5 giây hoặc khi quay lại cửa sổ. Các thao tác tạo/vào bàn online được máy chủ chặn ngay sau khi lưu, kể cả bàn 0 xu. Bàn chờ được ẩn, chủ bàn vẫn có thể hủy; mở lại trò cho phép vào bàn cũ. Ván đang chơi tiếp tục, được kết nối lại và quyết toán xu bình thường. Bàn bot đã mở tiếp tục chạy trên thiết bị; bảo trì ẩn lối mở bàn bot từ sảnh, không đóng ván đang chơi. Ví và lịch sử vẫn truy cập được ngay cả khi mọi trò đều bảo trì.

## Banner và ảnh sự kiện

Admin → Banner & sự kiện → chọn loại ảnh → chọn ảnh trên thiết bị → Tải ảnh lên bản nháp. Sau đó nhập tiêu đề, mô tả, liên kết HTTPS (tùy chọn), thứ tự hiển thị; bật Hiển thị trên sảnh game và Lưu thay đổi. Sảnh có hai nhóm banner và sự kiện, cập nhật trong khoảng 10 giây hoặc khi quay lại cửa sổ. Mỗi nhóm sắp theo thứ tự tăng dần.

Nhận ảnh tĩnh JPG/PNG/WebP tối đa 5 MB và 20 triệu điểm ảnh; xác thực nội dung, giải mã và chuyển WebP tối đa 2400×1600, giữ tỷ lệ và bỏ metadata. Gợi ý banner 1600×600, ảnh sự kiện 1200×800. Không nhận SVG, HTML hoặc ảnh động. Chỉ quản trị viên đã đăng nhập mới tải/sửa/lưu trữ ảnh được; yêu cầu sửa có kiểm tra phiên bản để tránh ghi đè. Bản nháp/ảnh lưu trữ chỉ admin xem được.

Ảnh và nội dung đều lưu trong bảng SQLite `promotions`, cùng bản sao lưu cơ sở dữ liệu. Mọi tải ảnh/sửa/lưu trữ được ghi vào `admin_audit`. Nút Lưu trữ ảnh ẩn nội dung nhưng giữ dữ liệu; bật Hiện ảnh đã lưu trữ để Khôi phục bản nháp, sau đó bật hiển thị nếu muốn đưa lại lên sảnh. Không có thao tác xóa ảnh vĩnh viễn trên giao diện. Thư viện tối đa 100 ảnh (kể cả đã lưu trữ), tổng ảnh tối ưu tối đa 200 MB.

## Cộng/trừ xu thủ công và cộng bù đơn nạp

Admin → Người chơi → chọn tài khoản → Cộng / trừ xu thủ công. Chọn cộng hoặc trừ, nhập 1–10.000.000 xu/lần, lý do bắt buộc và mã biên nhận/tham chiếu (tùy chọn). Chọn Kiểm tra điều chỉnh, kiểm tra đúng người chơi, ví và số dư dự kiến rồi xác nhận. Điều chỉnh chỉ áp dụng ví Demo/Sandbox/Live đang chọn; không chuyển đổi giữa các ví và không hoàn tiền ra ngân hàng.

Số dư trước/sau, admin, thời gian, lý do, tham chiếu và mã thao tác lưu trong `wallet_adjustments`; sổ xu và `admin_audit` ghi cùng giao dịch SQLite. Gửi lại cùng mã thao tác và nội dung không cộng/trừ trùng; đổi nội dung với cùng mã bị từ chối. Máy chủ kiểm tra lại số dư trước khi lưu và giới hạn trừ theo xu khả dụng, không dùng xu khóa hoặc tiền đã giữ cược. Hồ sơ hiển thị 20 điều chỉnh gần nhất của ví hiện tại; lịch sử ví của người chơi hiển thị Admin cộng/trừ xu.

Khi cộng bù một đơn nạp chưa được cộng xu, dán **mã đơn nạp của hệ thống** vào trường riêng. Đơn phải thuộc đúng tài khoản/ví, chưa có trạng thái paid và chưa cộng bù; số xu phải đúng toàn bộ xu của đơn. Việc cộng bù không tự xác nhận đã thu tiền. Khi cổng xác nhận đúng tiền, loại tiền và mã giao dịch sau đó, đơn chuyển paid nhưng không tăng số dư lần nữa. Dòng sổ xu đã cộng bù được phân loại lại thành nạp đã xác minh (giữ ngày thực tế đã cộng xu); nhật ký điều chỉnh vẫn giữ nguyên. Doanh thu tiền thật chỉ phát sinh theo đơn Live được cổng xác nhận.

Mã biên nhận/tham chiếu tự do chỉ là ghi chú, không có chức năng chặn thanh toán đến muộn; muốn tránh cộng trùng cho đơn nạp cần gắn mã đơn hệ thống ở trường riêng. Nếu đã chủ động trừ lại khoản cộng bù bằng một điều chỉnh khác, đơn vẫn được coi là đã cộng bù; cần đối soát thủ công trước thao tác tiếp theo.

## Sự kiện ưu đãi nạp xu

Admin → Ưu đãi nạp xu. Chọn một kiểu: giảm tiền thanh toán 1–50% hoặc tặng thêm xu 1–500%; đặt tên, giờ bắt đầu/kết thúc, khoảng giá gói nạp và các kênh áp dụng rồi bật/lưu. Hệ thống có một sự kiện cấu hình tại mỗi thời điểm, không cộng dồn nhiều sự kiện. Mặc định tắt. Thời gian admin nhập theo giờ Việt Nam UTC+7, lưu thành mốc thời gian tuyệt đối; máy chủ xét bắt đầu bao gồm, kết thúc không bao gồm. Giảm giá làm tròn tiền lên đồng, xu tặng làm tròn xuống đến xu.

Ví dụ tỷ lệ 1 VNĐ = 1 xu: gói 100.000đ giảm 10% thu 90.000đ, nhận 100.000 xu; tặng thêm 200% thì thu 100.000đ và nhận 300.000 xu. Khoảng gói nạp hợp lệ vẫn từ 10.000 đến 1.000.000đ (bội số 1.000), xét trước giảm giá. Tỷ lệ quy đổi vẫn lấy từ cấu hình thanh toán. Nạp demo miễn phí không áp dụng; Sandbox có thể thử ưu đãi với ví kiểm thử riêng.

Máy chủ cung cấp báo giá trước thanh toán và kiểm tra lại mã báo giá khi tạo đơn. Nếu tỷ lệ hoặc ưu đãi thay đổi thì từ chối báo giá cũ và yêu cầu xem lại. Khi đơn đã tạo, giá gói gốc, số xu gốc/tặng, tên/tỷ lệ/phiên bản sự kiện được chốt trong đơn; thay đổi sự kiện không sửa đơn cũ, kể cả thanh toán đến sau giờ hết hạn. Gửi lại cùng mã tạo đơn trả về đúng đơn cũ. Cộng xu chỉ sau xác minh tiền thực trả với cổng, đủ tổng xu của đơn đúng một lần. Các cổng VNĐ nhận tiền sau giảm, PayPal quy đổi số tiền sau giảm sang USD theo tỷ giá đã cấu hình.

Báo cáo thực thu tính `amount_vnd` sau giảm; `base_amount_vnd` là giá gói gốc. Đơn cũ chưa có ưu đãi vẫn đọc giá/xu cũ bằng giá trị dự phòng. Cấu hình sự kiện lưu SQLite `topup_event_settings`, có phiên bản chống ghi đè và lịch sử `admin_audit`. Điều chỉnh thủ công tối đa 10 triệu xu/lần để cộng bù được cả gói ưu đãi lớn nhất 6 triệu xu.
