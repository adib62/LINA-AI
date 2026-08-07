const uiIdle = document.getElementById('ui-idle') as HTMLDivElement;
const uiActive = document.getElementById('ui-active') as HTMLDivElement;
const laserScanner = document.getElementById('laser-scanner') as HTMLDivElement;
const ringUngu = document.getElementById('ring-ungu') as HTMLDivElement;
const ringUnguWrapper = document.getElementById('ring-ungu-wrapper') as HTMLDivElement; 
const jarvisSpeech = document.getElementById('jarvis-speech') as HTMLParagraphElement;
const userCommand = document.getElementById('user-command') as HTMLParagraphElement;
const listeningBorder = document.getElementById('listening-border') as HTMLDivElement; 
const ringVisualizerCore = document.getElementById('ring-visualizer-core') as HTMLDivElement;

let currentVoiceId = "46"; 
let isCameraOn = false;
let isLinaMuted = false;
let globalLinaAudioObj: HTMLAudioElement | null = null; 
let cameraStream: MediaStream | null = null;

const linaControlBar = document.getElementById('lina-control-bar') as HTMLDivElement;
const btnVideo = document.getElementById('btn-video') as HTMLButtonElement;
const btnVolume = document.getElementById('btn-volume') as HTMLButtonElement;
const btnMic = document.getElementById('btn-mic') as HTMLButtonElement;
const btnSettings = document.getElementById('btn-settings') as HTMLButtonElement;
const settingsSidebar = document.getElementById('settings-sidebar') as HTMLDivElement;
const btnCloseSettings = document.getElementById('btn-close-settings') as HTMLButtonElement;
const voiceSelector = document.getElementById('voice-selector') as HTMLSelectElement;
const cameraContainer = document.getElementById('camera-container') as HTMLDivElement;
const userVideo = document.getElementById('user-video') as HTMLVideoElement;

// 🔥 FIX ERROR TYPESCRIPT: Ganti SVGElement jadi HTMLElement
const iconCamOn = document.getElementById('icon-cam-on') as HTMLElement;
const iconCamOff = document.getElementById('icon-cam-off') as HTMLElement;
const iconVolOn = document.getElementById('icon-vol-on') as HTMLElement;
const iconVolOff = document.getElementById('icon-vol-off') as HTMLElement;
const iconMicOn = document.getElementById('icon-mic-on') as HTMLElement;
const iconMicOff = document.getElementById('icon-mic-off') as HTMLElement;

const canvas3d = document.getElementById('jarvis-orb-3d') as HTMLCanvasElement;
const ctx3d = canvas3d.getContext('2d') as CanvasRenderingContext2D;
canvas3d.width = 400;
canvas3d.height = 400;

let currentSystemState = "IDLE"; 
let resetToIdleTimer: any = null;

let audioCtx: AudioContext | null = null; 
let globalAnalyser: AnalyserNode | null = null;

function initAudioEngine() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        globalAnalyser = audioCtx.createAnalyser();
        globalAnalyser.fftSize = 256;
        globalAnalyser.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

btnVideo.addEventListener('click', async (e) => {
    e.stopPropagation();
    isCameraOn = !isCameraOn;
    
    if (isCameraOn) {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            userVideo.srcObject = cameraStream;
            cameraContainer.classList.remove('hidden');
            
            btnVideo.classList.replace('bg-[#18181b]/90', 'bg-white');
            btnVideo.classList.replace('border-[#3f3f46]', 'border-gray-200');
            iconCamOff.classList.replace('block', 'hidden');
            iconCamOn.classList.replace('hidden', 'block');
        } catch (err) {
            console.error("Kamera gagal diakses:", err);
            isCameraOn = false;
            alert("Gagal mengakses kamera. Cek izin browser.");
        }
    } else {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        cameraContainer.classList.add('hidden');
        userVideo.srcObject = null;
        
        btnVideo.classList.replace('bg-white', 'bg-[#18181b]/90');
        btnVideo.classList.replace('border-gray-200', 'border-[#3f3f46]');
        iconCamOn.classList.replace('block', 'hidden');
        iconCamOff.classList.replace('hidden', 'block');
    }
});

btnVolume.addEventListener('click', (e) => {
    e.stopPropagation();
    isLinaMuted = !isLinaMuted;
    
    if (globalLinaAudioObj) {
        globalLinaAudioObj.muted = isLinaMuted;
    }
    
    if (isLinaMuted) {
        btnVolume.classList.replace('bg-white', 'bg-[#18181b]/90');
        btnVolume.classList.replace('border-gray-200', 'border-[#3f3f46]');
        iconVolOn.classList.replace('block', 'hidden');
        iconVolOff.classList.replace('hidden', 'block');
    } else {
        btnVolume.classList.replace('bg-[#18181b]/90', 'bg-white');
        btnVolume.classList.replace('border-[#3f3f46]', 'border-gray-200');
        iconVolOff.classList.replace('block', 'hidden');
        iconVolOn.classList.replace('hidden', 'block');
    }
});

btnSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsSidebar.classList.remove('translate-x-full');
    settingsSidebar.classList.add('translate-x-0');
});

btnCloseSettings.addEventListener('click', () => {
    settingsSidebar.classList.remove('translate-x-0');
    settingsSidebar.classList.add('translate-x-full');
});

voiceSelector.addEventListener('change', (e) => {
    currentVoiceId = (e.target as HTMLSelectElement).value;
    console.log("Output Suara L.I.N.A diganti ke ID:", currentVoiceId);
});

interface Particle3D { x3d: number; y3d: number; z3d: number; x2d: number; y2d: number; color: string; }
const particles: Particle3D[] = [];
const totalPartikel = 450; 
const radiusBola3D = 130;  
let speedRotasiX = 0.003;  
let speedRotasiY = 0.005;  

for (let i = 0; i < totalPartikel; i++) {
    const theta = Math.acos(Math.random() * 2 - 1);
    const phi = Math.random() * Math.PI * 2;
    particles.push({
        x3d: radiusBola3D * Math.sin(theta) * Math.cos(phi),
        y3d: radiusBola3D * Math.sin(theta) * Math.sin(phi),
        z3d: radiusBola3D * Math.cos(theta),
        x2d: 0, y2d: 0,
        color: `rgba(34, 211, 238, ${0.4 + Math.random() * 0.5})` 
    });
}

function renderBola3D(): void {
    if (uiIdle.classList.contains('hidden')) {
        requestAnimationFrame(renderBola3D);
        return;
    }
    ctx3d.clearRect(0, 0, canvas3d.width, canvas3d.height);
    const centerX = canvas3d.width / 2;
    const centerY = canvas3d.height / 2;
    const fov = 300; 

    particles.forEach(p => {
        let x1 = p.x3d * Math.cos(speedRotasiY) - p.z3d * Math.sin(speedRotasiY);
        let z1 = p.x3d * Math.sin(speedRotasiY) + p.z3d * Math.cos(speedRotasiY);
        let y2 = p.y3d * Math.cos(speedRotasiX) - z1 * Math.sin(speedRotasiX);
        let z2 = p.y3d * Math.sin(speedRotasiX) + z1 * Math.cos(speedRotasiX);
        
        p.x3d = x1; p.y3d = y2; p.z3d = z2;

        let scaleFactor = fov / (fov + p.z3d);
        p.x2d = centerX + (p.x3d * scaleFactor);
        p.y2d = centerY + (p.y3d * scaleFactor);

        if (z2 + fov > 0) {
            ctx3d.beginPath();
            ctx3d.arc(p.x2d, p.y2d, Math.max(0.6, scaleFactor * 1.8), 0, Math.PI * 2);
            ctx3d.fillStyle = p.color;
            ctx3d.fill();
        }
    });
    requestAnimationFrame(renderBola3D);
}
renderBola3D();

window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        clearTimeout(resetToIdleTimer);
        if (currentSystemState === "IDLE") {
            triggerHoloScanTransition(() => {
                jarvisSpeech.innerText = '"Bypass sistem berhasil. Multi-ring engine aktif, Bos Adib."';
                userCommand.innerText = 'Memicu matriks via konsol keyboard...';
                resetToIdleTimer = setTimeout(() => { returnToIdleState(); }, 300000);
            });
        }
    }
});

const ws = new WebSocket('ws://localhost:5000');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.userVoice) userCommand.innerText = `"${data.userVoice}"`;
    
    if (data.status === "PROCESSING" || data.status === "SPEAKING") {
        clearTimeout(resetToIdleTimer);
        if (currentSystemState === "IDLE") {
            triggerHoloScanTransition(() => { eksekusiAudioDanTeks(data); });
        } else if (currentSystemState === "ACTIVE") {
            eksekusiAudioDanTeks(data);
        }
    }
};

function eksekusiAudioDanTeks(data: any) {
    if (data.jarvisResponse) jarvisSpeech.innerText = data.jarvisResponse;
    if (data.status === "SPEAKING" && data.audioBase64) {
        const audioUrl = `data:audio/wav;base64,${data.audioBase64}`;
        const audio = new Audio(audioUrl);
        
        audio.muted = isLinaMuted; 
        globalLinaAudioObj = audio; 
        
        if (audioCtx && globalAnalyser) {
            const source = audioCtx.createMediaElementSource(audio);
            source.connect(globalAnalyser); 
            
            const dataArray = new Uint8Array(globalAnalyser.frequencyBinCount);
            
            const renderVisualizer = () => {
                if (audio.ended || audio.paused) {
                    if (ringVisualizerCore) ringVisualizerCore.style.transform = `scale(1)`;
                    return;
                }
                
                globalAnalyser!.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                const scaleValue = 1.0 + (average / 255) * 0.35; 
                
                if (ringVisualizerCore) {
                    ringVisualizerCore.style.transform = `scale(${scaleValue})`;
                }
                
                requestAnimationFrame(renderVisualizer);
            };

            audio.onplay = () => { renderVisualizer(); };
        }

        audio.play().catch(e => console.log("Gagal memutar audio:", e));
        
        audio.onended = () => {
            if (ringVisualizerCore) ringVisualizerCore.style.transform = `scale(1)`; 
            globalLinaAudioObj = null; 
            resetToIdleTimer = setTimeout(() => { returnToIdleState(); }, 300000);
        };
    }
}

function setRingNapas() {
    if (currentSystemState === "ACTIVE") ringUnguWrapper.classList.add('pulse-idle');
}

function stopRingNapas() {
    ringUnguWrapper.classList.remove('pulse-idle');
}

setInterval(() => {
    if (currentSystemState === "ACTIVE") {
        stopRingNapas(); 
        ringUngu.classList.add('spin-once'); 
        setTimeout(() => { 
            ringUngu.classList.remove('spin-once'); 
            setRingNapas(); 
        }, 1500);
    }
}, 10000);

function pemicuMuterRandom() {
    const waktuRandom = (Math.random() * 8 + 6) * 1000;
    setTimeout(() => {
        if (currentSystemState === "ACTIVE") {
            stopRingNapas(); 
            ringUngu.classList.add('spin-twice'); 
            setTimeout(() => { 
                ringUngu.classList.remove('spin-twice'); 
                setRingNapas(); 
            }, 1800);
        }
        pemicuMuterRandom();
    }, waktuRandom);
}
pemicuMuterRandom();

function triggerHoloScanTransition(callback: () => void) {
    currentSystemState = "SCANNING";
    laserScanner.classList.add('run-scan');
    uiIdle.classList.add('opacity-0', 'scale-95');

    setTimeout(() => {
        laserScanner.classList.remove('run-scan');
        uiIdle.classList.add('hidden');
        uiActive.classList.remove('hidden', 'pointer-events-none');
        setTimeout(() => {
            uiActive.classList.add('opacity-100');
            currentSystemState = "ACTIVE";

            linaControlBar.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-5');
            linaControlBar.classList.add('opacity-100', 'translate-y-0');
            
            setRingNapas(); 
            callback();
        }, 50);
    }, 1200); 
}

function returnToIdleState() {
    currentSystemState = "IDLE";
    stopRingNapas(); 
    uiActive.classList.remove('opacity-100');
    uiActive.classList.add('opacity-0', 'pointer-events-none');

    linaControlBar.classList.remove('opacity-100', 'translate-y-0');
    linaControlBar.classList.add('opacity-0', 'pointer-events-none', 'translate-y-5');

    settingsSidebar.classList.remove('translate-x-0');
    settingsSidebar.classList.add('translate-x-full');

    setTimeout(() => {
        uiActive.classList.add('hidden');
        uiIdle.classList.remove('hidden');
        setTimeout(() => {
            uiIdle.classList.remove('opacity-0', 'scale-95');
            renderBola3D();
        }, 50);
    }, 1000);
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = true;
    recognition.interimResults = true; 

    let micHarusAktif = false;
    let recognitionBerjalan = false;
    let timerDiam: any = null;

    recognition.onstart = () => {
        recognitionBerjalan = true;
        console.log("🎙️ [STT] Engine Aktif & Mendengarkan...");
    };

    recognition.onresult = async (event: any) => {
        let kalimatFinal = '';
        let kalimatSementara = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                kalimatFinal += event.results[i][0].transcript.trim();
            } else {
                kalimatSementara += event.results[i][0].transcript;
            }
        }
        
        if (kalimatSementara || kalimatFinal) {
            listeningBorder.classList.add('active');
            clearTimeout(timerDiam);
            timerDiam = setTimeout(() => {
                listeningBorder.classList.remove('active'); 
            }, 1000); 
        }

        if (kalimatSementara) {
            userCommand.innerText = `Mendengarkan: "${kalimatSementara}..."`;
        }
        
        if (kalimatFinal) {
            console.log("🎤 Kedengaran Final:", kalimatFinal);
            userCommand.innerText = `"${kalimatFinal}"`;
            
            listeningBorder.classList.remove('active');
            clearTimeout(timerDiam);
            
            try {
                await fetch('http://localhost:5000/api/tanya', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        pesan: kalimatFinal,
                        voice_id: currentVoiceId 
                    })
                });
            } catch (err) {
                console.error("Gagal ngirim suara ke otak:", err);
            }
        }
    };

    recognition.onerror = (event: any) => {
        console.error("❌ Mic Error:", event.error);
        listeningBorder.classList.remove('active'); 
        if (event.error === 'not-allowed') {
            userCommand.innerText = "Akses mic diblokir! Cek gembok di URL bar.";
            micHarusAktif = false;
            btnMic.classList.replace('bg-white', 'bg-[#18181b]/90');
            btnMic.classList.replace('border-gray-200', 'border-[#3f3f46]');
            iconMicOn.classList.replace('block', 'hidden');
            iconMicOff.classList.replace('hidden', 'block');
        }
    };

    recognition.onend = () => {
        recognitionBerjalan = false;
        listeningBorder.classList.remove('active'); 
        console.log("🎙️ [STT] Engine Mati sementara.");
        
        if (micHarusAktif) {
            setTimeout(() => { 
                if (!recognitionBerjalan) {
                    try { recognition.start(); } catch(e){}
                }
            }, 300);
        }
    };

    function startTelingaLina() {
        initAudioEngine(); 
        micHarusAktif = true;
        
        btnMic.classList.replace('bg-[#18181b]/90', 'bg-white');
        btnMic.classList.replace('border-[#3f3f46]', 'border-gray-200');
        iconMicOff.classList.replace('block', 'hidden');
        iconMicOn.classList.replace('hidden', 'block');

        if (!recognitionBerjalan) {
            try {
                recognition.start();
                userCommand.innerText = "Sistem Audio Terkoneksi. Silakan bicara...";
            } catch (e) {
                console.log("Mic udah jalan, aman.");
            }
        }
    }
    
    function stopTelingaLina() {
        micHarusAktif = false;
        recognition.stop();
        userCommand.innerText = "Mikrofon Dimatikan.";
        
        btnMic.classList.replace('bg-white', 'bg-[#18181b]/90');
        btnMic.classList.replace('border-gray-200', 'border-[#3f3f46]');
        iconMicOn.classList.replace('block', 'hidden');
        iconMicOff.classList.replace('hidden', 'block');
    }

    window.addEventListener('click', () => {
        // Hapus auto-start mic
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !micHarusAktif) {
            startTelingaLina();
        }
    });

    btnMic.addEventListener('click', (e) => {
        e.stopPropagation();
        if (micHarusAktif) {
            stopTelingaLina();
        } else {
            startTelingaLina();
        }
    });

} else {
    console.error("❌ Browser ini gak support Web Speech API.");
    userCommand.innerText = "Browser tidak mendukung sensor suara.";
}

function startJarvisClock(): void {
    const clockEl = document.getElementById('jarvis-clock');
    const dateEl = document.getElementById('jarvis-date');

    if (!clockEl || !dateEl) return;

    const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const namaBulan = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    setInterval(() => {
        const sekarang = new Date();
        const jam = String(sekarang.getHours()).padStart(2, '0');
        const menit = String(sekarang.getMinutes()).padStart(2, '0');
        clockEl.innerText = `${jam}:${menit}`;

        const hari = namaHari[sekarang.getDay()];
        const tanggal = String(sekarang.getDate()).padStart(2, '0');
        const bulan = namaBulan[sekarang.getMonth()];
        const tahun = sekarang.getFullYear();
        
        dateEl.innerText = `${hari}, ${tanggal} ${bulan} ${tahun}`;
    }, 1000); 
}

startJarvisClock();