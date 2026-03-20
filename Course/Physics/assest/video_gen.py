import yt_dlp
import json

playlist_url = input("Enter Playlist URL : ")
videos = []

ydl_opts = {
    'quiet': True,
    'extract_flat': True
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(playlist_url, download=False)

    for video in info['entries']:
        videos.append({
            "title": video['title'],
            "id": video['id']
        })

# เพิ่มคลิปเดี่ยว
# videos.append({
#     "title": "Single",
#     "id": "VIDEO_ID"
# })

# save json
with open("tmp_videos.json", "w", encoding="utf-8") as f:
    json.dump(videos, f, ensure_ascii=False, indent=2)

print('Creating tmp_videos.json Successfully. Using by change its name to "videos.json"')