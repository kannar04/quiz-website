# Website trắc nghiệm — Kế hoạch bảo trì cảng hàng không, sân bay

Website tĩnh gồm 320 câu hỏi được trích xuất nguyên thứ tự từ `ngan_hang_cau_hoi_thi_ket_thuc.md`.

## Mở website

Cách đơn giản nhất: mở trực tiếp `index.html` bằng Chrome, Edge hoặc Firefox. Dữ liệu dùng `questions.js`, vì vậy không cần backend và không gặp lỗi CORS khi mở bằng `file://`.

Cách chạy qua local server (tùy chọn):

```powershell
cd quiz-website
python -m http.server 4173
```

Sau đó mở `http://localhost:4173`.

## Kiểm tra tự động

Yêu cầu Node.js chỉ dành cho bước tạo dữ liệu/kiểm thử, không cần khi sử dụng website:

```powershell
node scripts/build-questions.js
node tests/quiz.test.js
```

Script tạo dữ liệu sẽ dừng với lỗi nếu không đủ 320 câu, sai thứ tự, thiếu một trong bốn lựa chọn hoặc đáp án không thuộc A–D.

## Cấu trúc

- `index.html`: ba màn hình Welcome, Quiz và Result.
- `css/style.css`: giao diện responsive và trạng thái đúng/sai.
- `js/questions.js`: dữ liệu 320 câu hỏi đã trích xuất.
- `js/quiz.js`: state và quy tắc chấm điểm/tối đa hai lượt.
- `js/app.js`: render giao diện, sự kiện và chuyển màn hình.
- `scripts/build-questions.js`: tái tạo, kiểm tra dữ liệu từ Markdown nguồn.
- `tests/quiz.test.js`: kiểm thử dữ liệu và các nhánh logic chính.

Bootstrap 4.6.2 được lưu cục bộ để website vẫn hiển thị đúng khi không có mạng; phần logic hoàn toàn dùng JavaScript thuần.
