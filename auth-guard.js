// auth-guard.js

// 1. Import the CONFIG object exactly as you exported it
import { CONFIG } from '/config.js';

async function checkSecurityStatus() {
  try {
    // 2. Use CONFIG.API_URL to make the fetch request
    const response = await fetch(CONFIG.API_URL + '/auth/status');
    const data = await response.json();

    if (data.requireAuth === false) {
      console.log("🔓 Server says Auth is OFF. Letting user pass through!");
      document.body.style.display = "block"; // Un-hide the page
      return; 
    }

    // 3. If requireAuth is TRUE, check the token
    const token = localStorage.getItem("authToken");

    if (!token) {
      window.location.replace("/login/");
      return;
    }

    const decodedString = atob(token);
    const payload = JSON.parse(decodedString);

    if (Date.now() > payload.exp) {
      localStorage.removeItem("authToken");
      window.location.replace("/login/");
      return;
    }

    // Token is valid! Un-hide the page
    document.body.style.display = "block";

  } catch (error) {
    console.error("⚠️ Could not reach server. Falling back to strict check.");
    
    // If the server is down, we still check if they have a token locally just in case
    const token = localStorage.getItem("authToken");
    if (!token) {
      window.location.replace("/login/");
    } else {
      document.body.style.display = "block";
    }
  }
}

// Run the check immediately
checkSecurityStatus();