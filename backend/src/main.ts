import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// 🔥 IMPORT UNTUK SEMANTIC EMBEDDING LOKAL
import { pipeline, cos_sim } from '@xenova/transformers';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const VOICEVOX_URL = 'http://127.0.0.1:50021'; 

const groq = new Groq({ apiKey: GROQ_API_KEY });

// =====================================================================
// 🧠 1. L.I.N.A LONG-TERM MEMORY (RAG via memory.json)
// =====================================================================
let extractor: any = null;
let memoryVectors: { text: string, embedding: any }[] = [];
const memoryFilePath = path.join(process.cwd(), 'memory.json');

async function initMemory() {
    console.log("⏳ Memuat model Semantic Embedding L.I.N.A (Xenova/all-MiniLM-L6-v2)...");
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
    
    // Cek apakah file memory.json sudah ada, kalau belum, buatkan defaultnya
    if (!fs.existsSync(memoryFilePath)) {
        const defaultMemory = [
            "Nama lengkap Adib adalah Muhammad Adib Sholahuddin. Adib adalah mahasiswa aktif jenjang sarjana di Universitas AMIKOM Yogyakarta (periode studi 2024-2026), dan sering mengambil mata kuliah dengan kode spesifik seperti TK093, TK082, dan TK108.",
            "Adib menetap di kos yang berlokasi di belakang kampus AMIKOM Yogyakarta. Dihitung sejak Agustus 2025, Adib sudah genap tinggal lebih dari satu tahun di kos tersebut.",
            "Anggaran uang saku harian Adib ditetapkan secara spesifik sebesar Rp3.300.000 per bulan.",
            "Di bidang infrastruktur jaringan, Adib adalah teknisi yang handal. Adib mahir melakukan crimping kabel RJ45 pass-through, mengkonfigurasi switch/router Cisco, serta piawai dalam pengaturan Mikrotik tingkat lanjut, termasuk setup bridge, VLAN, hingga membangun sistem monitoring jaringan kos berbasis voucher pengguna.",
            "Adib adalah penggemar berat (Wota) JKT48 yang sangat berdedikasi. Adib rajin menonton live stream eksklusif via web resmi, mengikuti event kelulusan oshi, dan mengoleksi banyak merchandise resmi seperti photocard member, sticker pack, box snack promosi edisi terbatas, pin button, acrylic stand, hingga photocard spesial dari event Senbatsu.",
            "Sebagai seorang software developer, Adib memiliki akun engineering GitHub aktif (lengkap dengan Copilot dan Codespaces). Adib mahir menggunakan bahasa pemrograman Python dan library seperti Streamlit, Flask, serta Tkinter. Proyek yang pernah dibuat Adib meliputi GUI kriptografi, dashboard dokumentasi.",
            "Adib memiliki ketertarikan mendalam pada Cybersecurity (keamanan siber). Praktik yang sering dilakukan meliputi pembedahan mekanisme ransomware (khususnya varian Akira), mengerjakan tantangan Capture The Flag (CTF) di platform TryHackMe, serta menaklukkan level keamanan 10-12 pada tantangan Bandit OverTheWire menggunakan sistem operasi Kali Linux.",
            "Untuk urusan makanan, Adib adalah pelanggan setia kuliner kaki lima khas Indonesia, terutama sajian Nasi Padang dan Ayam Geprek. Tempat langganan Adib mencakup Sinar Minang, Preksu Chicken, Nasi Goreng BTS, Mr Pok Pakuwon Mall, Dapoerku Nagih, serta jajaran warung seperti Warmindo, Maguo, Burjo Borneo.",
            "Dalam hal konten kreatif, Adib rutin membuat karya multimedia dan aktif memelihara langganan bulanan untuk aplikasi mobile video editing premium seperti CapCut dan Alight Motion, serta berlangganan fitur konten eksklusif (premium tier) di platform Instagram."
        ];
        fs.writeFileSync(memoryFilePath, JSON.stringify(defaultMemory, null, 4));
        console.log("📁 File memory.json baru saja dibuat otomatis!");
    }

    // Baca data ingatan dari file external memory.json
    const rawData = fs.readFileSync(memoryFilePath, 'utf-8');
    const catatanMemori = JSON.parse(rawData);
    
    for (const teks of catatanMemori) {
        const output = await extractor(teks, { pooling: 'mean', normalize: true });
        memoryVectors.push({ text: teks, embedding: output.data });
    }
    console.log(`✅ Memori lokal L.I.N.A berhasil di-index! (${catatanMemori.length} ingatan dimuat)`);
}

// =====================================================================
// 🧠 2. L.I.N.A SHORT-TERM MEMORY (Histori Obrolan / RAM)
// =====================================================================
let historiObrolan: { role: "user" | "assistant" | "system", content: string }[] = [];


const server = app.listen(PORT, async () => {
    console.log("==================================================");
    console.log("🤖 L.I.N.A. CORE BACKEND v36.0 (FULL MEMORY ENABLED)");
    console.log(`🚀 API Route & Secure Socket aktif di port ${PORT}`);
    console.log(`JALANKAN : chmod +x /home/dibee/.voicevox/VOICEVOX.AppImage`);
    console.log("==================================================");
    await initMemory(); 
});

const wss = new WebSocketServer({ server });
let clientSocket: WebSocket | null = null;
let linaLagiSibuk = false;

wss.on('connection', (ws) => { clientSocket = ws; });

function kirimKeFrontend(status: string, userVoice: string, jarvisResponse: string, amp: number, audioBase64: string = "") {
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify({ status, userVoice, jarvisResponse, amp, audioBase64 }));
    }
}

app.post('/api/tanya', async (req, res) => {
    const { pesan, voice_id } = req.body;
    if (!pesan || linaLagiSibuk) return res.status(400).json({ error: "Matriks sibuk." });

    const speakerId = voice_id ? parseInt(voice_id) : 46;
    linaLagiSibuk = true;

    try {
        // 🔥 0. AMBIL WAKTU LOKAL (WIB)
        const waktuSekarang = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        }).format(new Date());

        // 🔥 1. PROSES RETRIEVAL LONG-TERM MEMORY (RAG)
        let konteksRelevan = "";
        if (extractor && memoryVectors.length > 0) {
            const queryEmbedding = await extractor(pesan, { pooling: 'mean', normalize: true });
            
            const hasilPencarian = memoryVectors.map(mem => {
                const score = cos_sim(queryEmbedding.data, mem.embedding);
                return { text: mem.text, score };
            });

            hasilPencarian.sort((a, b) => b.score - a.score);
            
            if (hasilPencarian[0].score > 0.3) {
                konteksRelevan = hasilPencarian[0].text;
                console.log(`🔍 [RAG MEMORI TERPANGGIL]: ${konteksRelevan} (Skor: ${hasilPencarian[0].score.toFixed(2)})`);
            }
        }

        // 🔥 2. SETUP SYSTEM PROMPT (DIPERBAIKI)
        const sifatLina = `Kamu adalah LINA, asisten pribadi Adib.
        
        INFORMASI SISTEM SAAT INI:
        - Waktu & Tanggal: ${waktuSekarang} (Gunakan info ini secara natural jika ditanya jam/hari/tanggal).
        
        ATURAN MUTLAK:
        1. Kamu WAJIB merespons HANYA dengan format JSON yang valid tanpa awalan atau akhiran teks apapun.
        2. Kunci "indo": Berisi jawaban natural, santai, dan membantu dalam bahasa Indonesia.
        3. Kunci "jepang": WAJIB berisi TERJEMAHAN AKURAT dari teks "indo" ke dalam bahasa Jepang (Kanji/Hiragana/Katakana).
        4. DILARANG KERAS mengulang-ulang teks Jepang yang sama. Terjemahan harus selalu menyesuaikan konteks teks bahasa Indonesianya!
        
        CONTOH OUTPUT:
        {"indo": "Halo Adib, ada yang bisa aku bantu?", "jepang": "アディブさん、こんにちは。何かお手伝いしましょうか？"}
        
        ${konteksRelevan ? `\nINFO ADIB: ${konteksRelevan}` : ""}`;

        // 🔥 3. SUSUN PESAN (Gabung System + Short-Term Memory + Pesan Baru)
        const messagesForGroq = [
            { role: "system", content: sifatLina },
            ...historiObrolan,
            { role: "user", content: pesan }
        ] as any;

        // 🔥 4. PAKSA GROQ MENGGUNAKAN JSON MODE DENGAN MODEL LEBIH BESAR
        const chatCompletion = await groq.chat.completions.create({
            messages: messagesForGroq,
            model: "llama-3.3-70b-versatile", // 🔥 MODEL DIUPGRADE BIAR GAK HALUSINASI TRANSLATE
            temperature: 0.3,
            response_format: { type: "json_object" } 
        });

        const raw = chatCompletion.choices[0]?.message?.content || "{}";
        
        // 🔥 5. SIMPAN KE SHORT-TERM MEMORY (Histori)
        historiObrolan.push({ role: "user", content: pesan });
        historiObrolan.push({ role: "assistant", content: raw }); // Simpan format JSON-nya biar model tetep konsisten

        // Jaga agar histori tidak meledak (Maksimal 40 pesan terakhir / 20 pasang percakapan)
        if (historiObrolan.length > 40) {
            historiObrolan = historiObrolan.slice(-40);
        }

        console.log("\n=========================================");
        console.log(`⏱️ WAKTU SISTEM : ${waktuSekarang}`);
        console.log("🤖 RAW JAWABAN GROQ (JSON) :", raw);
        console.log("=========================================\n");

        let teksIndo = "Maaf, sistem memproses.";
        let teksJepang = "こんにちは"; 

        // 🔥 6. PARSING JSON
        try {
            const parsedData = JSON.parse(raw);
            if (parsedData.indo) teksIndo = parsedData.indo;
            if (parsedData.jepang) {
                teksJepang = parsedData.jepang.replace(/[a-zA-Z0-9:]/g, "").trim(); 
                if (teksJepang === "") teksJepang = "こんにちは";
            }
        } catch (error) {
            console.error("Gagal nge-parse JSON dari Groq!", error);
        }

        // Ke Voicevox
        const params = new URLSearchParams({ text: teksJepang, speaker: speakerId.toString() });
        const queryResponse = await fetch(`${VOICEVOX_URL}/audio_query?${params.toString()}`, { method: 'POST' });
        const queryJson = await queryResponse.json();
        
        const synthResponse = await fetch(`${VOICEVOX_URL}/synthesis?speaker=${speakerId}`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(queryJson) 
        });
        
        const audioBase64 = Buffer.from(await synthResponse.arrayBuffer()).toString('base64');
        
        kirimKeFrontend("SPEAKING", pesan, teksIndo, 1.4, audioBase64);

    } catch (error) {
        console.error(error);
    } finally {
        linaLagiSibuk = false;
        res.json({ success: true });
    }
});