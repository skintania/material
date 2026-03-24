export const CONFIG = {
    API_URL: "https://skintania-api.skintania143.workers.dev"
};
// วิธีใช้ import config.js เข้ามา
// จะมีตัวแปร API_URL
// วิธีเรียก api_url/bucket_name?file=path_to_file

/*
อย่าลืม pass header เข้าไปด้วย
fetch("https://your-worker.workers.dev/skdrive", {
  headers: {
    "Authorization": "Bearer " + localStorage.getItem("user_token")
  }
})
*/