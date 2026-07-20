# Thêm Short Link Kiếm Tiền Cho Luồng Tải Game

## Summary

- Thêm luồng tải mới: user đã mua game bấm `Tải xuống` -> web gọi Cloudflare Worker -> Worker kiểm tra quyền sở hữu còn hạn -> tạo link trung gian qua shortener API -> user đi qua short link -> shortener redirect về Worker -> Worker redirect tới link Drive/Gofile thật.
- Không lưu link tải thật trong document `games` public nữa, vì hiện tại `games` đang `allow read: true` nên `downloadUrl` có thể bị lấy từ Firestore.
- Provider short link chưa chọn, nên triển khai adapter server-side có cấu hình bằng environment variables; UI không phụ thuộc provider cụ thể.

## Key Changes

### Firestore data model

- `games/{gameId}` public: giữ thông tin hiển thị, bỏ dần `downloadUrl` khỏi dữ liệu public.
- Thêm collection private `gameDownloads/{gameId}` chỉ admin đọc/ghi, chứa:
  - `targetUrl`: link Drive/Gofile thật.
  - `enabled`: bật/tắt tải.
  - `password`: mật khẩu giải nén nếu cần.
  - `updatedAt`.

### Firestore rules

- `games` vẫn public read, admin write.
- `gameDownloads` chỉ admin đọc/ghi từ client; user thường không được đọc trực tiếp.

### Cloudflare Worker

- Thêm endpoint `POST /create-download-link`.
- Input: `{ gameId, userId }`.
- Worker xác thực user bằng Firebase ID token, đọc `users/{uid}.ownedGames`, kiểm tra game đã mua và `expiresAt` còn hạn.
- Worker đọc `gameDownloads/{gameId}.targetUrl`, tạo token tải có TTL ngắn, gọi shortener adapter để tạo short URL trỏ về `/final-download?token=...`.
- Response: `{ shortUrl, expiresInSeconds }`.
- Thêm endpoint `GET /final-download?token=...` để xác thực token và redirect tới `targetUrl`.

### Shortener adapter

- Dùng env config thay vì khóa provider:
  - `SHORTENER_API_URL`
  - `SHORTENER_API_KEY`
  - `SHORTENER_URL_PARAM`, default `url`
  - `SHORTENER_KEY_PARAM`, default `api`
  - `SHORTENER_RESPONSE_PATH`, default `shortenedUrl`
- Nếu API lỗi, Worker trả lỗi rõ ràng, không fallback sang link thật.

### React UI

- `GameDetail.jsx`: thay thẻ `<a href={game.downloadUrl}>` bằng button gọi `/create-download-link`, mở `shortUrl` tab mới.
- `Profile.jsx`: nút tải trong thư viện game dùng cùng helper tạo short link.
- Hiển thị loading/error khi tạo link thất bại.

### Admin

- `GameForm.jsx`: thay field `Link Tải Game` bằng section "Link tải riêng tư", lưu vào `gameDownloads`.
- Khi edit game, admin có thể cập nhật link tải thật và mật khẩu giải nén.
- Không render link thật trong danh sách public.

## Test Plan

- User chưa đăng nhập bấm tải: bị yêu cầu đăng nhập.
- User chưa mua game: Worker trả lỗi không có quyền tải.
- User đã mua nhưng hết hạn: Worker trả lỗi hết hạn.
- User đã mua còn hạn: nhận short URL, đi qua shortener rồi được redirect tới Drive/Gofile thật.
- Firestore public read `games/{gameId}` không còn chứa link thật cho game mới/cập nhật.
- Admin thêm/sửa game lưu đúng metadata public và link private.
- Shortener API lỗi/token thiếu/env sai: UI báo lỗi, link thật không bị lộ.
- Chạy `npm run build` và test thủ công luồng tải trên dev server.

## Assumptions

- Chỉ áp dụng cho nội dung bạn có quyền phân phối.
- Short link sẽ chạy mỗi lần tải để tối đa hóa doanh thu.
- Link gốc phải được ẩn khỏi Firestore public.
- Provider short link chưa chọn; adapter sẽ dùng API dạng query/JSON phổ biến trước, khi bạn chọn dịch vụ cụ thể thì chỉ cần điền env hoặc chỉnh một adapter nhỏ trong Worker.
