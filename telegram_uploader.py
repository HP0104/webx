"""
Telegram Image Storage Uploader
Ho tro upload anh vo han len Telegram Channel qua Bot API.
- Tu dong xu ly FloodWait (rate limit 429)
- Tu dong luu metadata va mapping JSON
- Ho tro giu nguyen goc (document) hoac anh chuan (photo)
"""

import os
import sys
import time
import json
import requests
from typing import List, Dict, Optional

# Cấu hình UTF-8 cho console Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# ================= CẤU HÌNH CỦA BẠN =================
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "YOUR_CHAT_ID_HERE")
WORKER_DOMAIN = "https://img-cdn.takarvn.workers.dev"
# ====================================================

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}

class TelegramUploader:
    def __init__(self, bot_token: str = BOT_TOKEN, chat_id: str = CHAT_ID, worker_domain: str = WORKER_DOMAIN):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.worker_domain = worker_domain.rstrip("/")
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"

    def get_public_url(self, file_id: str) -> str:
        """Tạo link xem trực tiếp qua Cloudflare Worker (giấu Token)."""
        if self.worker_domain:
            return f"{self.worker_domain}/file/{file_id}.jpg"
        # Nếu chưa cấu hình Worker, trả về hướng dẫn
        return f"WORKER_CHUA_CAU_HINH (file_id: {file_id})"

    def upload_single_photo(self, file_path: str, caption: str = "", as_document: bool = False, max_retries: int = 5) -> Dict:
        """
        Upload 1 ảnh lên Telegram.
        - as_document=False: Upload dạng Photo (Telegram tự nén nhẹ để load nhanh).
        - as_document=True: Upload dạng Document (giữ nguyên 100% độ nét gốc).
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Không tìm thấy file: {file_path}")

        method = "sendDocument" if as_document else "sendPhoto"
        url = f"{self.base_url}/{method}"

        filename = os.path.basename(file_path)
        if not caption:
            caption = f"#{os.path.splitext(filename)[0]}"

        for attempt in range(max_retries):
            try:
                with open(file_path, "rb") as f:
                    files = {"document" if as_document else "photo": f}
                    data = {
                        "chat_id": self.chat_id,
                        "caption": caption
                    }
                    resp = requests.post(url, data=data, files=files, timeout=60)
                    res_json = resp.json()

                # Thành công
                if res_json.get("ok"):
                    result = res_json["result"]
                    if as_document:
                        file_id = result["document"]["file_id"]
                        file_size = result["document"].get("file_size", 0)
                    else:
                        # Lấy ảnh ở độ phân giải lớn nhất (phần tử cuối mảng photo)
                        best_photo = result["photo"][-1]
                        file_id = best_photo["file_id"]
                        file_size = best_photo.get("file_size", 0)

                    return {
                        "success": True,
                        "filename": filename,
                        "file_path": file_path,
                        "file_id": file_id,
                        "public_url": self.get_public_url(file_id),
                        "file_size": file_size,
                        "message_id": result["message_id"]
                    }

                # Dính rate limit (FloodWait 429)
                elif res_json.get("error_code") == 429:
                    retry_after = res_json.get("parameters", {}).get("retry_after", 5)
                    print(f"  [FloodWait] Telegram yêu cầu đợi {retry_after}s trước khi gửi tiếp...")
                    time.sleep(retry_after + 1)
                    continue

                else:
                    err_desc = res_json.get("description", "Unknown error")
                    print(f"  [Lỗi Telegram] {err_desc}")
                    time.sleep(2)

            except Exception as e:
                print(f"  [Network Error lần {attempt + 1}/{max_retries}]: {e}")
                time.sleep(3)

        return {"success": False, "filename": filename, "file_path": file_path, "error": "Vượt quá số lần thử lại"}

    def upload_folder(self, folder_path: str, output_json: str = "uploaded_images.json", delay: float = 0.6) -> List[Dict]:
        """
        Quét và upload toàn bộ ảnh trong 1 thư mục lên Telegram.
        Tự động ghi kết quả vào file JSON để làm Database link ảnh.
        """
        if not os.path.exists(folder_path):
            print(f"Không tìm thấy thư mục: {folder_path}")
            return []

        # Lấy danh sách ảnh
        images = []
        for root, _, files in os.walk(folder_path):
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in IMAGE_EXTS:
                    images.append(os.path.join(root, f))

        images.sort()
        total = len(images)
        print(f"=== Bắt đầu upload {total} ảnh lên Telegram Channel ===")

        # Đọc dữ liệu cũ nếu đã từng upload dở
        results = []
        uploaded_map = {}
        if os.path.exists(output_json):
            try:
                with open(output_json, "r", encoding="utf-8") as f:
                    old_data = json.load(f)
                    for item in old_data:
                        if item.get("success"):
                            uploaded_map[item["file_path"]] = item
                            results.append(item)
                print(f"Đã tải trước {len(uploaded_map)} ảnh đã up từ file {output_json}")
            except Exception:
                pass

        count = len(uploaded_map)
        for idx, img_path in enumerate(images, 1):
            if img_path in uploaded_map:
                continue

            print(f"[{idx}/{total}] Đang upload: {os.path.basename(img_path)}...")
            res = self.upload_single_photo(img_path)
            if res.get("success"):
                results.append(res)
                count += 1
                print(f"  -> OK: {res['public_url']}")
            else:
                print(f"  -> THẤT BẠI: {res.get('error')}")

            # Lưu file định kỳ sau mỗi ảnh để không bao giờ sợ mất dữ liệu
            with open(output_json, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)

            # Nghỉ nhẹ để chống dính FloodWait
            time.sleep(delay)

        print(f"\n🎉 Hoàn tất! Đã upload thành công {count}/{total} ảnh.")
        print(f"📁 Dữ liệu chi tiết đã lưu vào: {output_json}")

        # Tạo thêm file TXT chỉ chứa danh sách link ảnh (mỗi dòng 1 link) để copy cực nhanh
        txt_path = os.path.splitext(output_json)[0] + "_links.txt"
        with open(txt_path, "w", encoding="utf-8") as f:
            for item in results:
                if item.get("success"):
                    f.write(item["public_url"] + "\n")
        print(f"📋 Danh sách link thuần túy đã lưu vào: {txt_path}")

        # Tạo file HTML để mở lên đọc thử toàn bộ chương truyện
        html_path = os.path.splitext(output_json)[0] + "_preview.html"
        html_content = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Xem thử chương truyện</title>
    <style>
        body { background: #111; color: #eee; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
        .comic-page { max-width: 900px; width: 100%; margin-bottom: 5px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: block; }
    </style>
</head>
<body>
"""
        for item in results:
            if item.get("success"):
                html_content += f'    <img class="comic-page" src="{item["public_url"]}" loading="lazy" alt="{item["filename"]}">\n'
        html_content += "</body>\n</html>"

        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"🌐 Trang xem thử truyện đã lưu vào: {html_path} (Bấm đúp để mở)")

        return results

if __name__ == "__main__":
    uploader = TelegramUploader()
    
    print("\n" + "="*55)
    print("      🚀 TELEGRAM UNLIMITED IMAGE UPLOADER 🚀")
    print("="*55)
    
    # Kiểm tra nếu có truyền tham số qua dòng lệnh
    if len(sys.argv) > 1:
        folder = sys.argv[1].strip("\"'")
    else:
        # Cho phép người dùng nhập hoặc kéo thả thư mục vào cửa sổ CMD
        folder = input("\n👉 Hãy KÉO THẢ thư mục ảnh vào đây rồi bấm Enter: ").strip("\"' ")

    if not folder or not os.path.exists(folder):
        print(f"❌ Thư mục không tồn tại: {folder}")
        sys.exit(1)

    folder_name = os.path.basename(os.path.normpath(folder))
    output_json = f"{folder_name}_data.json"

    print(f"\n📂 Thư mục chọn: {folder}")
    print(f"💾 File xuất kết quả: {output_json}")
    print("\nBắt đầu tải ảnh...")
    
    uploader.upload_folder(folder, output_json=output_json, delay=0.5)
