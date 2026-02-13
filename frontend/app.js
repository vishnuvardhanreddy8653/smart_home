// =====================================================
// Smart Home Application - Consolidated Logic
// Features: Authentication, Device Control, Voice Recognition, Speech Synthesis
// =====================================================

class SmartHomeApp {
  constructor() {
    this.currentPage = this.detectCurrentPage();
    this.isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    this.userEmail = localStorage.getItem("userEmail") || "";
    this.voiceEnabled = false;
    this.isListening = false;
    this.ws = null;
    this.speechRecognition = null;
    this.speechSynthesis = window.speechSynthesis;
    this.isSpeaking = false;
    this.lastCommandTimes = {}; // debounce per-device
    this.debounceMs = 1500;
    this._shouldRestartRecognitionAfterSpeak = false;
    
    // Initialize based on current page
    this.init();
  }

  detectCurrentPage() {
    const path = window.location.pathname;
    if (path.includes("signup")) return "signup";
    if (path.includes("login")) return "login";
    if (path.includes("dashboard")) return "dashboard";
    return "unknown";
  }

  init() {
    // Redirect based on login status
    if (this.isLoggedIn && this.currentPage !== "dashboard") {
      window.location.href = "dashboard.html";
      return;
    }

    if (!this.isLoggedIn && this.currentPage === "dashboard") {
      window.location.href = "login.html";
      return;
    }

    // Initialize page-specific functionality
    if (this.currentPage === "signup") {
      this.initSignupPage();
    } else if (this.currentPage === "login") {
      this.initLoginPage();
    } else if (this.currentPage === "dashboard") {
      this.initDashboard();
    }
  }

  // ==================== SIGNUP PAGE ====================
  initSignupPage() {
    const signupBtn = document.querySelector("button");
    if (signupBtn) {
      signupBtn.onclick = () => this.signupUser();
    }
  }

  signupUser() {
    const username = document.getElementById("username")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!email || !password) {
      alert("Please enter email and password!");
      return;
    }

    if (!this.isValidEmail(email)) {
      alert("Please enter a valid email address!");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long!");
      return;
    }

    // Save credentials (store email normalized)
    localStorage.setItem("userEmail", email.toLowerCase());
    localStorage.setItem("userPassword", password);
    localStorage.setItem("username", username || "User");

    alert("Signup successful! Please login.");
    window.location.href = "login.html";
  }

  // ==================== LOGIN PAGE ====================
  initLoginPage() {
    const loginBtn = document.querySelector("button");
    if (loginBtn) {
      loginBtn.onclick = () => this.loginUser();
    }

    // Enter key support
    const inputFields = document.querySelectorAll("input");
    inputFields.forEach(input => {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.loginUser();
      });
    });
  }

  loginUser() {
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();
    if (!email || !password) {
      alert("Please enter email and password!");
      return;
    }

    const storedEmail = localStorage.getItem("userEmail");
    const storedPassword = localStorage.getItem("userPassword");

    // Compare emails normalized to avoid case mismatch
    if ((email || "").toLowerCase() === (storedEmail || "").toLowerCase() && password === storedPassword) {
      localStorage.setItem("isLoggedIn", "true");
      // No TTS during login; dashboard will announce on load
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    } else {
      alert("Invalid email or password! Please check your credentials.");
      // No TTS on login page
    }
  }

  // ==================== DASHBOARD ====================
  initDashboard() {
    this.initDeviceControls();
    this.initWebSocket();
    this.initVoiceRecognition();
    this.initMicButton();
    this.setupLogout();

    // Announce welcome message
    const username = localStorage.getItem("username") || "User";
    this.speak(`Welcome ${username}. Your smart home is ready.`);
  }

  initDeviceControls() {
    // Get all toggle checkboxes
    document.querySelectorAll(".toggle-checkbox").forEach(toggle => {
      toggle.addEventListener("change", () => {
        const deviceId = toggle.id.split("-")[1];
        const statusText = document.getElementById("status-" + deviceId);
        const icon = document.getElementById("icon-" + deviceId);
        this.updateDeviceStatus(toggle, statusText, icon);
        this.sendToggleToBackend(deviceId, toggle.checked);
        this.announceDeviceStatus(deviceId, toggle.checked);
      });
    });

    // Card click handlers
    const cards = document.querySelectorAll(".smart-card");
    cards.forEach(card => {
      card.addEventListener("click", (event) => {
        if (event.target.closest(".toggle-wrapper")) return;
        const toggle = card.querySelector(".toggle-checkbox");
        toggle.checked = !toggle.checked;
        toggle.dispatchEvent(new Event("change"));
      });
    });
  }

  updateDeviceStatus(toggle, statusText, icon) {
    if (toggle.checked) {
      statusText.innerText = "On";
      icon.classList.add("active");
    } else {
      statusText.innerText = "Off";
      icon.classList.remove("active");
    }
  }

  announceDeviceStatus(deviceId, state) {
    const deviceNames = {
      light: "Bedroom Light",
      kitchen: "Kitchen Light",
      fan: "Living Room Fan"
    };
    const status = state ? "turned on" : "turned off";
    this.speak(`${deviceNames[deviceId] || deviceId} ${status}`);
  }

  sendToggleToBackend(deviceId, state) {
    fetch(`http://localhost:3000/api/device/${deviceId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, state })
    }).catch(err => console.error("Backend Error:", err));
  }

  // ==================== WEBSOCKET ====================
  initWebSocket() {
    const connectionStatus = document.getElementById("connectionStatus");

    this.ws = new WebSocket("ws://localhost:3000");

    this.ws.onopen = () => {
      if (connectionStatus) {
        connectionStatus.innerText = "Connected";
        connectionStatus.style.backgroundColor = "#05966950";
        connectionStatus.style.color = "#10b981";
      }
    };

    this.ws.onclose = () => {
      if (connectionStatus) {
        connectionStatus.innerText = "Disconnected";
        connectionStatus.style.backgroundColor = "#9333ea50";
        connectionStatus.style.color = "#ec4899";
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const toggle = document.getElementById("toggle-" + msg.deviceId);
        const statusText = document.getElementById("status-" + msg.deviceId);
        const icon = document.getElementById("icon-" + msg.deviceId);

        if (toggle && statusText && icon) {
          toggle.checked = msg.state;
          this.updateDeviceStatus(toggle, statusText, icon);
          this.announceDeviceStatus(msg.deviceId, msg.state);
        }
      } catch (err) {
        console.error("WebSocket message parsing error:", err);
      }
    };
  }

  // ==================== VOICE RECOGNITION ====================
  initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported");
      return;
    }

    this.speechRecognition = new SpeechRecognition();
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = true;
    this.speechRecognition.lang = "en-US";

    this.speechRecognition.onstart = () => {
      this.isListening = true;
      console.log("Voice recognition started");
    };

    this.speechRecognition.onresult = (event) => {
      // Only process final results to avoid repeated interim transcripts
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript.trim().length > 0) {
        this.processVoiceCommand(transcript.toLowerCase());
      }
    };

    this.speechRecognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);
      this.speak("Voice recognition error. Please try again.");
    };

    this.speechRecognition.onend = () => {
      this.isListening = false;
      console.log("Voice recognition ended");
      // If we stopped recognition to speak, restart it when appropriate
      if (this._shouldRestartRecognitionAfterSpeak) {
        this._shouldRestartRecognitionAfterSpeak = false;
        try { this.speechRecognition.start(); } catch (e) { /* ignore */ }
      }
    };
  }

  initMicButton() {
    const micBtn = document.getElementById("micBtn");
    const micStatus = document.getElementById("micStatus");

    if (!micBtn) return;

    micBtn.addEventListener("click", () => {
      this.voiceEnabled = !this.voiceEnabled;

      if (this.voiceEnabled && this.speechRecognition) {
        micBtn.classList.add("mic-active");
        if (micStatus) micStatus.innerText = "Listening...";
        // Start recognition but avoid speaking immediately (prevents TTS loop)
        try { this.speechRecognition.start(); } catch (e) { /* ignore */ }
      } else {
        micBtn.classList.remove("mic-active");
        if (micStatus) micStatus.innerText = "Tap mic to Activate";
        if (this.speechRecognition) this.speechRecognition.stop();
        // optional brief confirmation (recognition already stopped)
        this.speak("Voice recognition deactivated");
      }
    });
  }

  processVoiceCommand(transcript) {
    console.log("Voice command:", transcript);

    // If we are currently speaking, ignore incoming voice commands
    if (this.isSpeaking) {
      console.log("Ignoring voice command while speaking");
      return;
    }

    let actionTaken = false;

    // Light commands
    if (transcript.includes("light") || transcript.includes("bedroom")) {
      if (transcript.includes("on")) {
        this.toggleDevice("toggle-light", true);
        actionTaken = true;
      } else if (transcript.includes("off")) {
        this.toggleDevice("toggle-light", false);
        actionTaken = true;
      }
    }

    // Kitchen commands
    if (transcript.includes("kitchen")) {
      if (transcript.includes("on")) {
        this.toggleDevice("toggle-kitchen", true);
        actionTaken = true;
      } else if (transcript.includes("off")) {
        this.toggleDevice("toggle-kitchen", false);
        actionTaken = true;
      }
    }

    // Fan commands
    if (transcript.includes("fan") || transcript.includes("living room")) {
      if (transcript.includes("on")) {
        this.toggleDevice("toggle-fan", true);
        actionTaken = true;
      } else if (transcript.includes("off")) {
        this.toggleDevice("toggle-fan", false);
        actionTaken = true;
      }
    }

    // General commands
    if (transcript.includes("all on") || transcript.includes("turn on all")) {
      this._debouncedBulkToggle(true);
      this.speak("All devices turned on");
      actionTaken = true;
    }

    if (transcript.includes("all off") || transcript.includes("turn off all")) {
      this._debouncedBulkToggle(false);
      this.speak("All devices turned off");
      actionTaken = true;
    }

    // Status commands
    if (transcript.includes("status")) {
      this.reportDeviceStatus();
      actionTaken = true;
    }

    // If any action was taken, disable mic so it stops listening
    if (actionTaken) {
      this.disableVoiceListening();
    }
  }

  disableVoiceListening() {
    // Prevent restart after speech
    this._shouldRestartRecognitionAfterSpeak = false;

    if (this.speechRecognition && this.isListening) {
      try {
        this.speechRecognition.stop();
      } catch (e) { /* ignore */ }
    }

    this.voiceEnabled = false;

    const micBtn = document.getElementById("micBtn");
    const micStatus = document.getElementById("micStatus");
    if (micBtn) micBtn.classList.remove("mic-active");
    if (micStatus) micStatus.innerText = "Tap mic to Activate";
    console.log("Voice recognition disabled after command");
  }

  toggleDevice(toggleId, state) {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
      // Debounce rapid repeated commands for same toggle
      const deviceKey = toggleId;
      const now = Date.now();
      const last = this.lastCommandTimes[deviceKey] || 0;
      if (now - last < this.debounceMs) {
        console.log(`Debounced ${toggleId}`);
        return;
      }
      this.lastCommandTimes[deviceKey] = now;
      toggle.checked = state;
      toggle.dispatchEvent(new Event("change"));
    }
  }

  _debouncedBulkToggle(state) {
    const ids = ["toggle-light","toggle-kitchen","toggle-fan"];
    ids.forEach(id => this.toggleDevice(id, state));
  }

  reportDeviceStatus() {
    const lights = document.getElementById("status-light")?.innerText;
    const kitchen = document.getElementById("status-kitchen")?.innerText;
    const fan = document.getElementById("status-fan")?.innerText;

    const status = `Bedroom light is ${lights}, kitchen light is ${kitchen}, and living room fan is ${fan}`;
    this.speak(status);
  }

  // ==================== SPEECH SYNTHESIS ====================
  speak(text) {
    // Only allow speech synthesis on the dashboard page (disable on signup/login)
    if (this.currentPage !== "dashboard") return;
    if (!this.speechSynthesis) return;

    // If recognition is active, stop it temporarily to avoid feedback
    if (this.speechRecognition && this.isListening) {
      try {
        this._shouldRestartRecognitionAfterSpeak = true;
        this.speechRecognition.stop();
      } catch (e) { /* ignore */ }
    }

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = "en-US";

    this.isSpeaking = true;
    utterance.onend = () => {
      this.isSpeaking = false;
      // onend will trigger restarting recognition via onend handler above
    };

    this.speechSynthesis.speak(utterance);
  }

  // ==================== UTILITIES ====================
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  setupLogout() {
    // Create logout button if it doesn't exist
    const header = document.querySelector(".header");
    if (!header) return;

    let logoutBtn = header.querySelector(".logout-btn");
    if (!logoutBtn) {
      logoutBtn = document.createElement("button");
      logoutBtn.className = "logout-btn";
      logoutBtn.innerText = "Logout";
      logoutBtn.style.cssText = `
        padding: 10px 20px;
        background: linear-gradient(135deg, #4e73df, #6f42c1);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        transition: transform 0.3s;
      `;
      logoutBtn.addEventListener("mouseover", () => {
        logoutBtn.style.transform = "scale(1.05)";
      });
      logoutBtn.addEventListener("mouseout", () => {
        logoutBtn.style.transform = "scale(1)";
      });
      logoutBtn.onclick = () => this.logout();
      header.appendChild(logoutBtn);
    }
  }

  logout() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userPassword");
    this.speak("Logged out successfully");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.smartHomeApp = new SmartHomeApp();
});

// ==================== BACKWARD COMPATIBILITY ====================
// Keep some old references for compatibility
const statusText = document.getElementById('statusText');
const transcription = document.getElementById('transcription');
const connectionStatus = document.getElementById('connectionStatus');
const micBtn = document.getElementById('micBtn');
