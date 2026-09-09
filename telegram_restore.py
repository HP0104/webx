#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
TELEGRAM MANGA AUTO-RESTORE & BACKUP TOOL (CỨU HỘ VÀ PHỤC HỒI DỮ LIỆU)
=============================================================================
Tính năng:
1. Đọc toàn bộ ảnh và caption từ Kênh Telegram.
2. Tự động bóc tách cấu trúc:
   - Tên truyện (qua hashtag #Ten_Truyen hoặc 🔖 Tên truyện)
   - Tên Chapter (qua hashtag #Chap_X)
   - Thứ tự trang (Trang X/Y)
   - Mã ảnh (file_id)
3. Tự động phục hồi cây dữ liệu đầy đủ của toàn bộ Website:
   Manga -> Chapters -> Danh sách ảnh CDN chuẩn SEO
4. Xuất ra file "manga_restored_database.json" chuẩn format để khôi phục
   ngay lập tức vào Firebase Firestore nếu web bị mất dữ liệu!
=============================================================================
"""

import os
import sys
import json
import re
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ================= CẤU HÌNH =================
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "-1004320007781")
WORKER_DOMAIN = os.environ.get("WORKER_DOMAIN", "https://img-cdn.takarvn.workers.dev").rstrip('/')
OUTPUT_FILE = "manga_restored_database.json"
# ============================================

def slugify(text):
    if not text:
        return ""
    import unicodedata
    n = unicodedata.normalize('NFD', text)
    n = ''.join(c for c in n if unicodedata.category(c) != 'Mn')
    n = n.replace('đ', 'd').replace('Đ', 'D').lower()
    return re.sub(r'[^a-z0-9]+', '-', n).strip('-')

def parse_caption(caption):
    """
    Phân tích Caption có cấu trúc từ Telegram
    Ví dụ:
    📚 #Vo_Luyen_Dinh_Phong
    📖 #Chap_01 | 📄 Trang 01/30
    🔖 Võ Luyện Đỉnh Phong - Chapter 1
    """
    data = {
        "manga_title": "Chưa phân loại",
        "chapter_title": "Chapter 1",
        "page_index": 1,
        "total_pages": 1
    }
    if not caption:
        return data

    # 1. Tìm tên truyện từ dòng 🔖
    title_match = re.search(r'🔖\s*([^\n-]+)(?:\s*-\s*([^\n]+))?', caption)
    if title_match:
        data["manga_title"] = title_match.group(1).strip()
        if title_match.group(2):
            data["chapter_title"] = title_match.group(2).strip()

    # 2. Tìm hashtag truyện nếu chưa có tên
    if data["manga_title"] == "Chưa phân loại":
        manga_tag = re.search(r'📚\s*#([a-zA-Z0-9_]+)', caption)
        if manga_tag:
            data["manga_title"] = manga_tag.group(1).replace('_', ' ')

    # 3. Tìm chapter tag
    chap_tag = re.search(r'📖\s*#([a-zA-Z0-9_]+)', caption)
    if chap_tag and data["chapter_title"] == "Chapter 1":
        data["chapter_title"] = chap_tag.group(1).replace('_', ' ')

    # 4. Tìm số trang Trang X/Y
    page_match = re.search(r'Trang\s*(\d+)(?:/(\d+))?', caption, re.IGNORECASE)
    if page_match:
        data["page_index"] = int(page_match.group(1))
        if page_match.group(2):
            data["total_pages"] = int(page_match.group(2))

    return data

def restore_from_export_json(json_path):
    """Khôi phục từ file export Telegram Desktop (result.json)"""
    print(f"[*] Đang đọc file export Telegram: {json_path}")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    messages = data.get("messages", [])
    print(f"[*] Tìm thấy {len(messages)} tin nhắn trong kênh.")

    database = {}

    for msg in messages:
        # Kiểm tra tin nhắn có ảnh
        photo = msg.get("photo")
        text = msg.get("text", "")
        if isinstance(text, list):
            text = "".join(item if isinstance(item, str) else item.get("text", "") for item in text)

        if not photo:
            continue

        info = parse_caption(text)
        manga_name = info["manga_title"]
        chap_name = info["chapter_title"]
        page_idx = info["page_index"]

        # Đường dẫn ảnh qua CDN
        file_id = os.path.basename(photo)
        manga_slug = slugify(manga_name)
        chap_slug = slugify(chap_name)
        page_str = f"p{page_idx:02d}"

        cdn_url = f"{WORKER_DOMAIN}/file/{manga_slug}/{chap_slug}/{page_str}_{file_id}"

        if manga_name not in database:
            database[manga_name] = {
                "title": manga_name,
                "slug": manga_slug,
                "chapters": {}
            }

        if chap_name not in database[manga_name]["chapters"]:
            database[manga_name]["chapters"][chap_name] = []

        database[manga_name]["chapters"][chap_name].append({
            "page": page_idx,
            "url": cdn_url
        })

    # Sắp xếp lại thứ tự các trang trong từng chapter
    formatted_mangas = []
    for manga_name, m_data in database.items():
        chapters_list = []
        for chap_name, pages in m_data["chapters"].items():
            # Sắp xếp theo số trang
            sorted_pages = sorted(pages, key=lambda x: x["page"])
            chapters_list.append({
                "title": chap_name,
                "images": [p["url"] for p in sorted_pages],
                "totalImages": len(sorted_pages)
            })

        formatted_mangas.append({
            "title": manga_name,
            "slug": m_data["slug"],
            "cover": chapters_list[0]["images"][0] if chapters_list and chapters_list[0]["images"] else "",
            "totalChapters": len(chapters_list),
            "chapters": chapters_list,
            "restoredAt": datetime.now().isoformat()
        })

    return formatted_mangas

def main():
    print("=" * 65)
    print("  TELEGRAM MANGA AUTO-RESTORE & DATA RESCUE ENGINE")
    print("=" * 65)
    print(f"• Kênh Telegram CHAT_ID: {CHAT_ID}")
    print(f"• CDN Domain: {WORKER_DOMAIN}")
    print("-" * 65)

    export_file = "result.json"
    if os.path.exists(export_file):
        print(f"[✓] Phát hiện file sao lưu '{export_file}'. Đang tiến hành giải mã...")
        restored = restore_from_export_json(export_file)
    else:
        print("[i] Hướng dẫn sao lưu & khôi phục dữ liệu từ Telegram:")
        print("  1. Mở Telegram Desktop trên máy tính.")
        print("  2. Vào Kênh truyện của bạn -> Bấm nút '...' (Góc trên phải) -> 'Export channel history'.")
        print("  3. Chọn định dạng 'Machine-readable JSON' và tải về.")
        print("  4. Đặt file 'result.json' vào cùng thư mục với script này rồi chạy lại.")
        print("-" * 65)
        print("[*] Đang tạo mẫu cấu trúc khôi phục chuẩn...")
        
        # Mẫu minh họa cấu trúc phục hồi
        restored = [{
            "title": "Mẫu Truyện Đã Phục Hồi",
            "slug": "mau-truyen-da-phuc-hoi",
            "cover": f"{WORKER_DOMAIN}/file/sample_cover.jpg",
            "chapters": [
                {
                    "title": "Chapter 1",
                    "images": [
                        f"{WORKER_DOMAIN}/file/sample/chap-1/p01_AgACAgIA.jpg",
                        f"{WORKER_DOMAIN}/file/sample/chap-1/p02_AgACAgIB.jpg"
                    ]
                }
            ]
        }]

    # Lưu kết quả ra file JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(restored, f, ensure_ascii=False, indent=2)

    print(f"[✓] Đã tạo file dữ liệu khôi phục: {OUTPUT_FILE}")
    print(f"[✓] Tổng số truyện nhận diện được: {len(restored)}")
    print("=" * 65)

if __name__ == "__main__":
    main()
