# BRO AI Multi-AI v0.4.0 — paket implementasi

Paket ini mempertahankan `index.html` hasil upgrade Claude dan melengkapinya dengan Cloudflare Worker router.

## Isi paket
- `index.html` — frontend BRO AI v0.4.0 (dari file yang diberikan).
- `worker.js` — backend untuk OpenAI, Claude, Gemini, DeepSeek.
- `wrangler.toml` — konfigurasi dasar Cloudflare Worker.
- `manifest.webmanifest`, `sw.js` — PWA dan cache statis.
- `SETUP_ID.md` — langkah instalasi Bahasa Indonesia.

## Gambaran arsitektur
Browser/GitHub Pages → Cloudflare Worker → API provider yang dipilih.

Kunci API provider hanya disimpan di Cloudflare Worker Secrets. Token akses frontend harus sama dengan `BRO_ACCESS_TOKEN`, dan Worker memvalidasinya pada `/health` serta `/chat`.

## Penting
- Paket ini belum dideploy ke akun Cloudflare/GitHub milik pengguna.
- Pemeriksaan lokal/sintaks tidak membuktikan API provider hidup. Setelah deployment, gunakan tombol **Tes**, lalu kirim satu pesan uji.
- API key/usage provider bisa berbayar. Langganan ChatGPT/Claude/Gemini di aplikasi konsumen tidak otomatis mencakup API.
- `SpeechRecognition` dan suara TTS tergantung dukungan Chrome/Android serta bahasa/voice yang terpasang.
- Catatan, riwayat, URL Worker, dan token di frontend disimpan di localStorage perangkat/browser. Jangan gunakan token ini sebagai satu-satunya pengamanan untuk data yang sangat sensitif.
- CORS bukan pengganti autentikasi. Gunakan `BRO_ALLOWED_ORIGIN` untuk membatasi origin frontend.
- Worker tidak memberikan rate-limit global persisten. Untuk produksi publik, aktifkan rate limiting/WAF di Cloudflare dan rotasi token bila bocor.
