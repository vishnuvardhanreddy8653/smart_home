const statusText = document.getElementById('statusText');
const transcription = document.getElementById('transcription');
const connectionStatus = document.getElementById('connectionStatus');
const micBtn = document.getElementById('micBtn');

// Debug logging helper
const log = (msg) => {
    console.log(`[Jerry-System] ${msg}`);
};

// --- MULTI-TAB PROTECTION ---
const TAB_ID = Date.now().toString();
window.addEventListener('storage', (e) => {
    if (e.key === 'jerry_active_tab' && e.newValue && e.newValue !== TAB_ID) {
        log("Another Jerry tab detected. Pausing this one.");
        if (isListenLoopActive) {
            stopListening();
            alert("⚠️ Conflict: Jerry is already open in another tab. This tab will sleep to prevent Mic errors.");
        }
    }
});

// WebSocket Connection
let ws;
const RECONNECT_DELAY = 3000;

function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:8000/ws/client`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        log("WebSocket Connected");
        connectionStatus.textContent = 'Connected';
    };

    ws.onclose = () => {
        log("WebSocket Disconnected. Reconnecting...");
        setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onmessage = (event) => {
        const parts = event.data.split(':');
        if (parts[0] === 'ACTION') {
            updateUI(parts[1], parts[2]);
        }
    };
}

// Initial connection
connect();

// QR Code Logic
let qrCodeObj = null;

async function showQRCode() {
    const modal = document.getElementById('qrModal');
    modal.classList.remove('hidden');

    if (!qrCodeObj) {
        try {
            const host = window.location.hostname || 'localhost';
            const protocol = window.location.protocol;
            const apiUrl = `${protocol}//${host}:8000/connection-info`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            const url = data.url || window.location.href;

            document.getElementById('localUrl').textContent = url;

            qrCodeObj = new QRCode(document.getElementById("qrcode"), {
                text: url,
                width: 200,
                height: 200
            });
        } catch (e) {
            console.error("Could not fetch connection info", e);
            document.getElementById('localUrl').textContent = "Error fetching IP. Is Backend Running?";
        }
    }
}

function hideQRCode() {
    document.getElementById('qrModal').classList.add('hidden');
}

function updateUI(action, deviceType) {
    const isTurnOn = action === 'turn_on';
    const isAll = deviceType === 'all';

    const setToggle = (id, targetType) => {
        if (isAll || deviceType === targetType) {
            if (isAll && action === 'turn_off' && (targetType === 'refrigerator' || targetType === 'fridge')) {
                return;
            }

            const el = document.getElementById(id);
            if (el && el.checked !== isTurnOn) {
                el.checked = isTurnOn;
            }

            const statusEl = document.getElementById(`status-${targetType.replace(' ', '-')}`);
            if (statusEl) {
                statusEl.textContent = isTurnOn ? 'On' : 'Off';
                statusEl.classList.toggle('text-green-600', isTurnOn);
                statusEl.classList.toggle('text-gray-500', !isTurnOn);
            }
        }
    };

    setToggle('toggle-light', 'light');
    setToggle('toggle-fan', 'fan');
    setToggle('toggle-kitchen-light', 'kitchen light');
    setToggle('toggle-fridge', 'refrigerator');
    setToggle('toggle-tv', 'tv');
    setToggle('toggle-hometheater', 'hometheater');
}

function toggleByCard(deviceType, checkboxId) {
    const checkbox = document.getElementById(checkboxId);
    if (!checkbox) return;

    const newState = !checkbox.checked;
    checkbox.checked = newState;
    sendManualCommand(newState ? 'turn_on' : 'turn_off', deviceType);
    updateUI(newState ? 'turn_on' : 'turn_off', deviceType);
}

// Event Listeners
document.getElementById('toggle-light').addEventListener('change', (e) => handleManualToggle(e, 'light'));
document.getElementById('toggle-fan').addEventListener('change', (e) => handleManualToggle(e, 'fan'));
document.getElementById('toggle-kitchen-light').addEventListener('change', (e) => handleManualToggle(e, 'kitchen light'));
document.getElementById('toggle-fridge').addEventListener('change', (e) => handleManualToggle(e, 'refrigerator'));
document.getElementById('toggle-tv').addEventListener('change', (e) => handleManualToggle(e, 'tv'));
document.getElementById('toggle-hometheater').addEventListener('change', (e) => handleManualToggle(e, 'hometheater'));

function handleManualToggle(e, type) {
    const action = e.target.checked ? 'turn_on' : 'turn_off';
    sendManualCommand(action, type);
    updateUI(action, type);
}

function sendManualCommand(action, deviceType) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(`ACTION:${action}:${deviceType}`);
    } else {
        log("WebSocket not connected. Command failed.");
    }
}

// --- CHROME-COMPATIBLE "CLEAN SLATE" SPEECH ENGINE ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListenLoopActive = false;
let isActiveCommandMode = false;
let isLocked = false;
let commandTimeout = null;

// Browser detection for specialized recovery
const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
const isEdge = /Edg/.test(navigator.userAgent);

function initRecognition() {
    // Chrome requires a NEW object for every single start sequence to be stable
    if (recognition) {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try { recognition.abort(); } catch (e) { }
    }

    recognition = new SpeechRecognition();

    // EDGE prefers continuous: true. 
    // CHROME (specifically on Windows) is more stable with continuous: false in short bursts.
    recognition.continuous = isEdge;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        log(`Mic Active (${isEdge ? 'Edge Link' : 'Chrome Burst'}) ✅`);
        updateStatus("Jerry is listening...", "red");
        localStorage.setItem('jerry_active_tab', TAB_ID);
    };

    recognition.onresult = (event) => {
        if (window.isAgentSpeaking) return;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            const isFinal = event.results[i].isFinal;

            if (!transcript) continue;
            transcription.textContent = `Heard: "${transcript}"`;

            const wakeWords = ['jerry', 'gerry', 'cherry', 'jury', 'sherry', 'gary', 'terry'];
            const heardWake = wakeWords.find(w => transcript.includes(w));

            if (heardWake && !isLocked) {
                const parts = transcript.split(heardWake);
                const cmd = parts[parts.length - 1].trim();

                if (cmd.length > 2) {
                    isLocked = true;
                    processCommand(cmd);
                    isActiveCommandMode = false;
                    setTimeout(() => { isLocked = false; }, 2000);
                } else if (!isActiveCommandMode) {
                    activateCommandMode();
                }
            } else if (isActiveCommandMode && isFinal) {
                isLocked = true;
                processCommand(transcript);
                isActiveCommandMode = false;
                setTimeout(() => { isLocked = false; }, 2000);
            }
            if (isFinal) isLocked = false;
        }
    };

    recognition.onerror = (event) => {
        log(`Mic Error: ${event.error}`);
        if (event.error === 'not-allowed') {
            isListenLoopActive = false;
            updateStatus("Microphone Blocked", "none");
            alert("Permissions required for Jerry to hear you.");
        }
    };

    recognition.onend = () => {
        if (isListenLoopActive) {
            // Chrome needs a small break or it won't let go of the mic driver
            const delay = isChrome ? 600 : 300;
            log(`Session ended. Refreshing in ${delay}ms...`);

            setTimeout(() => {
                if (isListenLoopActive) startListening();
            }, delay);
        } else {
            localStorage.removeItem('jerry_active_tab');
        }
    };
}

function startListening() {
    isListenLoopActive = true;
    initRecognition(); // Create fresh hardware object
    try {
        recognition.start();
    } catch (e) {
        log("Start Collision: " + e.message);
        // Force a hardware reset after 2s if collision happens
        setTimeout(startListening, 2000);
    }
}

function stopListening() {
    isListenLoopActive = false;
    isActiveCommandMode = false;
    if (recognition) {
        try { recognition.abort(); } catch (e) { }
    }
    if (commandTimeout) clearTimeout(commandTimeout);
    updateStatus("Tap mic to Activate", "none");
}

if (!SpeechRecognition) {
    statusText.textContent = "Voice control not supported.";
} else {
    micBtn.addEventListener('click', () => {
        if (!isListenLoopActive) {
            startListening();
        } else {
            stopListening();
        }
    });
}

function activateCommandMode() {
    if (isActiveCommandMode || isLocked) return;
    isActiveCommandMode = true;
    isLocked = true;

    speakResponse("Yes?");
    updateStatus("Speak command...", "blue");

    if (commandTimeout) clearTimeout(commandTimeout);
    commandTimeout = setTimeout(() => {
        if (isActiveCommandMode) {
            isActiveCommandMode = false;
            isLocked = false;
            updateStatus("Jerry is listening...", "red");
        }
    }, 5000);
}

function updateStatus(text, color) {
    statusText.textContent = text;
    micBtn.className = "w-24 h-24 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center transition-all duration-300 group";

    if (color === 'red') {
        micBtn.classList.add('mic-active');
        micBtn.style.borderColor = "#ea4335";
    } else if (color === 'blue') {
        micBtn.classList.add('mic-processing', 'animate-pulse');
        micBtn.style.borderColor = "#4285f4";
    } else {
        micBtn.style.borderColor = "#e5e7eb";
    }
}

function processCommand(text) {
    log(`Executing: ${text}`);
    const normalized = text.replace('switch', 'turn');
    const match = normalized.match(/turn\s+(on|off)\s+(?:the\s+)?(?:(\w+)\s+)?(light|fan|relay|tv|fridge|refrigerator|home theater|hometheater|all|everything)/);

    if (match) {
        const actionWord = match[1];
        let device = match[3];
        const action = actionWord === "on" ? "turn_on" : "turn_off";

        if (device === 'all' || device === 'everything') device = 'all';
        if (device === "refrigerator") device = "fridge";
        if (device === "home theater") device = "hometheater";

        updateUI(action, device);
        speakResponse(`Okay, turning ${actionWord} ${device}.`);

        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(`ACTION:${action}:${device}`);
        }
    } else {
        sendToHub(text);
    }
}

async function sendToHub(text) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        speakResponse("Hub connection lost.");
        return;
    }
    try {
        const host = window.location.hostname || 'localhost';
        const protocol = window.location.protocol;
        const apiUrl = `${protocol}//${host}:8000/command/`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        const result = await response.json();
        if (result.response_text) speakResponse(result.response_text);
    } catch (e) {
        log("Hub error: " + e.message);
    }
}

// Text to Speech
let voices = [];
window.isAgentSpeaking = false;

function loadVoices() {
    voices = window.speechSynthesis.getVoices();
}
if (window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

function speakResponse(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.volume = 1.0;
    utter.rate = 1.0;

    const pref = voices.find(v => (v.name.includes('Google US English') || v.name.includes('Female')) && v.lang.startsWith('en'));
    utter.voice = pref || voices.find(v => v.lang.startsWith('en')) || voices[0];

    utter.onstart = () => { window.isAgentSpeaking = true; };
    utter.onend = () => { setTimeout(() => { window.isAgentSpeaking = false; }, 100); };
    utter.onerror = () => { window.isAgentSpeaking = false; };

    window.speechSynthesis.speak(utter);
}
