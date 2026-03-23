import { sign, verify } from 'hono/jwt'; // แนะนำให้ลง Hono หรือใช้ Web Crypto ปกติก็ได้ แต่เพื่อความง่าย ผมจะเขียนแบบ Native ให้ครับ

async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      const url = new URL(request.url);
      const pathName = url.pathname;

      // ---------------------------------------------------------
      // 1. ระบบ Register & Login (จัดการผ่าน D1)
      // ---------------------------------------------------------

      if (pathName === "/auth/register" && request.method === "POST") {
        const { firstname, lastname, username, osk_gen, student_id, email, password } = await request.json();

        const hashedPassword = await hashPassword(password);

        // แก้ไข Query ให้ตรงกับตารางใหม่ที่คุณสร้างใน Studio
        await env.DB.prepare(`
          INSERT INTO users (firstname, lastname, username, osk_gen, student_id, email, password) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(firstname, lastname, username, osk_gen, student_id, email, hashedPassword).run();

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      if (pathName === "/auth/login" && request.method === "POST") {
        const { email, password } = await request.json();
        const hashedPassword = await hashPassword(password);

        const user = await env.DB.prepare(
          "SELECT id, email, role, username FROM users WHERE email = ? AND password = ?"
        ).bind(email, hashedPassword).first();

        if (!user) {
          return new Response(JSON.stringify({ error: "Invalid login" }), { status: 401, headers: corsHeaders });
        }

        const token = btoa(JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + 3600000 }));
        return new Response(JSON.stringify({ token, role: user.role, username: user.username }), { headers: corsHeaders });
      }

      // ---------------------------------------------------------
      // 2. ระบบ Middleware (ปิดชั่วคราวเพื่อทดสอบ)
      // ---------------------------------------------------------
      
      /* // คอมเมนต์ส่วนตรวจสอบสิทธิ์ไว้ก่อน
      const authHeader = request.headers.get("Authorization");
      let userData = null;
      if (authHeader) {
        try {
          userData = JSON.parse(atob(authHeader.split(" ")[1]));
          if (userData.exp < Date.now()) throw new Error("Token expired");
        } catch (e) {
          return new Response(JSON.stringify({ error: "Invalid Token" }), { status: 401, headers: corsHeaders });
        }
      }

      if ((pathName.startsWith('/course') || pathName.startsWith('/skdrive')) && !userData) {
        return new Response(JSON.stringify({ error: "Please Login first" }), { status: 401, headers: corsHeaders });
      }
      */

      // ---------------------------------------------------------
      // 3. ระบบจัดการไฟล์ R2
      // ---------------------------------------------------------

      let targetBucket;
      if (pathName.startsWith('/skdrive')) {
        targetBucket = env.SKDRIVE_BUCKET;
      } else if (pathName.startsWith('/course')) {
        targetBucket = env.COURSE_CLIP_BUCKET;
      } else if (pathName.startsWith('/asset')) {
        targetBucket = env.ASSETS_BUCKET;
      } else {
        return new Response(JSON.stringify({ message: "API Ready (No Auth Required)" }), { headers: corsHeaders });
      }

      // ตรวจสอบว่ามี Bucket ที่ระบุไว้จริงหรือไม่
      if (!targetBucket) {
        return new Response(JSON.stringify({ error: "Bucket not found or not bound" }), { status: 500, headers: corsHeaders });
      }

      // ตัวอย่าง Logic การ List ไฟล์แบบง่าย (ยกของเดิมคุณมาใส่ต่อได้เลย)
      const list = await targetBucket.list();
      return new Response(JSON.stringify(list.objects), { headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};