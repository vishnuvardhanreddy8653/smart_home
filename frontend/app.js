const statusText = document.getElementById('statusText');
const transcription = document.getElementById('transcription');
const connectionStatus = document.getElementById('connectionStatus');
const micBtn = document.getElementById('micBtn');

// WebSocket Connection
let ws;
const RECONNECT_DELAY = 3000;


function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If hostname is empty (e.g. file://), default to localhost
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:8000/ws/client`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket Connected");
        connectionStatus.textContent = 'Connected';
        connectionStatus.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 flex items-center';
    };

    ws.onclose = () => {
        console.log("WebSocket Disconnected. Reconnecting...");
        connectionStatus.textContent = 'Reconnecting...';
        connectionStatus.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center';

        // Try to reconnect
        setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onmessage = (event) => {
        console.log("Message from server:", event.data);
        const parts = event.data.split(':');
        if (parts[0] === 'ACTION') {
            const action = parts[1];
            const deviceType = parts[2];
            updateUI(action, deviceType);
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
            // Fetch local IP from backend
            const host = window.location.hostname || 'localhost';
            const apiUrl = `http://${host}:8000/connection-info`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            const url = data.url || window.location.href; // Fallback

            document.getElementById('localUrl').textContent = url;

            // Generate QR
            qrCodeObj = new QRCode(document.getElementById("qrcode"), {
                text: url,
                width: 200,
                height: 200
            });
        } catch (e) {
            console.error("Could not fetch connection info", e);
            document.getElementById('localUrl').textContent = "Error fetching IP. Ensure server is running.";
        }
    }
}

function hideQRCode() {
    document.getElementById('qrModal').classList.add('hidden');
}




function updateUI(action, deviceType) {
    const isTurnOn = action === 'turn_on';
    const isAll = deviceType === 'all';

    // Strict helper: Only update if deviceType matches EXACTLY or if it's "all"
    const setToggle = (id, targetType) => {
        if (isAll || deviceType === targetType) {
            // Essential appliance protection: Don't turn off fridge in batch
            if (isAll && action === 'turn_off' && (targetType === 'refrigerator' || targetType === 'fridge')) {
                return;
            }

            const el = document.getElementById(id);
            if (el && el.checked !== isTurnOn) {
                el.checked = isTurnOn;
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

// Manual Control Event Listeners
document.getElementById('toggle-light').addEventListener('change', (e) => sendManualCommand(e.target.checked ? 'turn_on' : 'turn_off', 'light'));
document.getElementById('toggle-fan').addEventListener('change', (e) => sendManualCommand(e.target.checked ? 'turn_on' : 'turn_off', 'fan'));
document.getElementById('toggle-kitchen-light').addEventListener('change', (e) => sendManualCommand(e.target.checked ? 'turn_on' : 'turn_off', 'kitchen light'));
document.getElementById('toggle-fridge').addEventListener('change', (e) => sendManualCommand(e.target.checked ? 'turn_on' : 'turn_off', 'refrigerator'));
document.getElementById('toggle-tv').addEventListener('change', (e) => sendManualCommand(e.target.checked ? 'turn_on' : 'turn_off', 'tv'));
document.getElementById('toggle-hometheater').addEventListener('change', (e) => sendManualCommand(e.target.checked ? 'turn_on' : 'turn_off', 'hometheater'));

function sendManualCommand(action, deviceType) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(`ACTION:${action}:${deviceType}`);
        console.log(`Sent: ACTION:${action}:${deviceType}`);
    } else {
        console.error("WebSocket not connected");
    }
}

// Voice Recognition (Web Speech API)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isListenLoopActive = false;
let isActiveCommandMode = false;
let commandTimeout = null;

if (!SpeechRecognition) {
    statusText.textContent = "Browser doesn't support Voice capability.";
} else {
    recognition = new SpeechRecognition();
    recognition.continuous = true; // KEEP LISTENING
    recognition.lang = 'en-US';
    recognition.interimResults = true; // FASTER REACTION

    // --- OPTIMIZED SPEECH RECOGNITION ---
    // Aggressive Auto-Start & Always-On Logic
    const startAudioContext = () => {
        if (!isListenLoopActive) {
            console.log("🚀 ACTIVATING MICROPHONE...");
            startListening();
        }
    };

    // 1. Try immediately (Works if user has interacted with domain before)
    setTimeout(startAudioContext, 500);

    // 2. Attach to ALL common interaction events to ensure we catch the first click/touch
    ['click', 'touchstart', 'keydown', 'scroll'].forEach(event => {
        document.addEventListener(event, startAudioContext, { once: true });
    });

    micBtn.addEventListener('click', () => {
        if (isListenLoopActive) {
            stopListening();
        } else {
            startListening();
        }
    });

    function startListening() {
        if (isListenLoopActive) return;
        isListenLoopActive = true;
        isActiveCommandMode = false;

        try {
            recognition.start();
            micBtn.classList.add('mic-active'); // Pulse animation
        } catch (e) {
            console.log("Start error (likely already started):", e);
        }

        updateStatus("Listening...", "red");
    }

    function stopListening() {
        isListenLoopActive = false;
        isActiveCommandMode = false;
        recognition.stop();
        micBtn.classList.remove('mic-active');
        if (commandTimeout) clearTimeout(commandTimeout);
        updateStatus("Tap microphone to start...", "none");
    }

    function updateStatus(text, color) {
        statusText.textContent = text;

        // Reset classes
        micBtn.className = "w-24 h-24 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center transition-all duration-300 group";

        if (color === 'red') {
            // Listening Mode
            micBtn.classList.add('mic-active');
            micBtn.style.borderColor = "#ea4335";
        }
        if (color === 'green') {
            // Wake Word Detected
            micBtn.classList.add('mic-listening');
            micBtn.classList.add('scale-110');
            micBtn.style.borderColor = "#34a853";
        }
        if (color === 'blue') {
            // Active Command Mode
            micBtn.classList.add('mic-processing');
            micBtn.classList.add('animate-bounce');
            micBtn.style.borderColor = "#4285f4";
        }
    }

    function activateCommandMode() {
        isActiveCommandMode = true;
        speakResponse("Yes?", 0.8);
        updateStatus("Jerry is listening...", "blue");
        if (commandTimeout) clearTimeout(commandTimeout);
        commandTimeout = setTimeout(() => {
            if (isActiveCommandMode) {
                isActiveCommandMode = false;
                // speakResponse("Timeout.", 0.5); // REMOVED: Too intrusive
                updateStatus("Listening...", "red");
            }
        }, 8000);
    }

    recognition.onresult = (event) => {
        // OPTIMIZATION: Ignore input while Agent is talking (Prevent Self-Loop)
        if (window.isAgentSpeaking) return;

        // Debounce / Optimization: Process loop efficiently
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript.toLowerCase().trim();
            const isFinal = event.results[i].isFinal;

            if (!transcript) continue;

            transcription.textContent = `Heard: "${transcript}"`;

            // --- FUZZY WAKE WORD DETECTION ---
            const wakeWordAliases = ['jerry', 'gerry', 'cherry', 'jury', 'sherry', 'gary', 'terry'];
            const detectedAlias = wakeWordAliases.find(alias => transcript.includes(alias));

            // VISUAL FEEDBACK (Interim - Fast)
            if (detectedAlias && !isActiveCommandMode) {
                micBtn.classList.add('bg-green-100'); // Subtle hint
            }

            if (isFinal) {
                micBtn.classList.remove('bg-green-100');

                if (detectedAlias) {
                    const parts = transcript.split(detectedAlias);
                    const command = parts[parts.length - 1].trim();

                    if (!command) {
                        activateCommandMode();
                    } else {
                        // console.log(`🚀 EXEC: ${command}`); // Removed excessive logging
                        processCommand(command);
                        isActiveCommandMode = false;
                        updateStatus("Listening...", "red");
                    }
                } else if (isActiveCommandMode) {
                    // console.log(`🚀 ACTIVE EXEC: ${transcript}`); // Removed excessive logging
                    processCommand(transcript);
                    isActiveCommandMode = false;
                    updateStatus("Listening...", "red");
                }
            }
        }
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech') return;
        // console.log("Speech Error:", event.error); // Silent error handling
    };

    recognition.onend = () => {
        // ROBUST AUTO-RESTART
        if (isListenLoopActive) {
            // calculated backoff or immediate
            setTimeout(() => {
                try { recognition.start(); } catch (e) { }
            }, 100);
        } else {
            updateStatus("Tap mic to start", "none");
        }
    };
}

function processCommand(text) {
    statusText.textContent = "Processing: " + text;

    // --- CLIENT-SIDE FAST PATH ---
    const fastMatch = text.match(/(turn|switch)\s+(on|off)\s+(?:the\s+)?(?:(\w+)\s+)?(light|fan|relay|tv|fridge|refrigerator|home theater|hometheater|all|everything|number \d+|\d+)/);

    if (fastMatch) {
        const actionWord = fastMatch[2]; // on/off
        let deviceRaw = fastMatch[4];    // light/fan

        const action = actionWord === "on" ? "turn_on" : "turn_off";

        // Handle ALL
        if (deviceRaw === 'all' || deviceRaw === 'everything') {
            console.log("⚡ Fast Path: ALL DEVICES", action);
            // Update UI visually immediately for ALL devices
            updateUI(action, 'all');

            speakResponse(`Okay, turning ${actionWord} everything.`, action === 'turn_off' ? 0.5 : 1.0);
            sendVoiceCommand(text, true);
            return;
        }

        // Handle Numbers
        const numberMap = { '1': 'light', '2': 'fan', '3': 'kitchen light', '4': 'refrigerator', '5': 'tv', '6': 'hometheater' };
        const numberMatch = deviceRaw.match(/\d+/);
        if (numberMatch && numberMap[numberMatch[0]]) {
            deviceRaw = numberMap[numberMatch[0]];
        }

        // Normalize
        if (deviceRaw === "refrigerator") deviceRaw = "fridge"; // match updateUI check
        if (deviceRaw === "home theater") deviceRaw = "hometheater";

        console.log("⚡ Client-Side Fast Path:", action, deviceRaw);

        // 1. Optimistic UI Update
        updateUI(action, deviceRaw);

        // 2. Instant Voice Feedback with Contextual Volume
        const volume = action === 'turn_off' ? 0.5 : 1.0;
        speakResponse(`Okay, turning ${actionWord} the ${deviceRaw}`, volume);

        // 3. Send to Backend
        sendVoiceCommand(text, true);
    } else {
        // --- SLOW PATH (Server AI) ---
        sendVoiceCommand(text, false);
    }
}

// Error Throttling
let lastErrorTime = 0;
const ERROR_COOLDOWN = 60000; // 1 minute

async function sendVoiceCommand(text, handledLocally = false) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        if (!handledLocally) {
            const now = Date.now();
            if (now - lastErrorTime > ERROR_COOLDOWN) {
                speakResponse("Server disconnected.");
                lastErrorTime = now;
            }
        }
        return;
    }

    // We send via HTTP for parsing, or we could use WS. Existing backend uses HTTP POST /command
    try {
        const host = window.location.hostname || 'localhost';
        const apiUrl = `http://${host}:8000/command/`;
        // Don't wait for fetch if handled locally to improve perceived speed
        if (handledLocally) {
            fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            }).catch(e => console.error(e));
        } else {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });
            const result = await response.json();

            if (result.response_text) {
                speakResponse(result.response_text);
            }
        }
    } catch (error) {
        console.error("Error sending command:", error);
        if (!handledLocally) {
            const now = Date.now();
            if (now - lastErrorTime > ERROR_COOLDOWN) {
                speakResponse("I cannot reach the server.");
                lastErrorTime = now;
            }
        }
    }
}

// Text to Speech with Robust Voice Loading
let voices = [];
window.isAgentSpeaking = false; // Global flag

function loadVoices() {
    voices = window.speechSynthesis.getVoices();
}
if (window.speechSynthesis) {
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
}

function speakResponse(text, volume = 1.0) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop previous

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume;
    utterance.rate = 1.1; // Slightly faster for optimized feel
    utterance.pitch = 1.0;

    // Strictly prefer Female Voice
    const femaleVoice = voices.find(v =>
        v.name.includes('Zira') ||
        v.name.includes('Google US English') ||
        v.name.includes('Samantha') ||
        v.name.includes('Female')
    );

    if (femaleVoice) {
        utterance.voice = femaleVoice;
    } else {
        // Fallback to any English if no female found, but try to find one with 'en-US'
        const enVoice = voices.find(v => v.lang === 'en-US');
        if (enVoice) utterance.voice = enVoice;
    }

    // --- SMART MUTE (Prevents Self-Triggering) ---
    utterance.onstart = () => { window.isAgentSpeaking = true; };
    utterance.onend = () => {
        // Small buffer to let echo die down
        setTimeout(() => { window.isAgentSpeaking = false; }, 300);
    };
    utterance.onerror = () => { window.isAgentSpeaking = false; };

    window.speechSynthesis.speak(utterance);
}
