# PANDUAN INSTALASI BRO AI v0.4.0 (Android-friendly)

## 1. Siapkan backend Cloudflare Worker
1. Masuk ke dashboard Cloudflare.
2. Buka **Workers & Pages** lalu buat Worker baru bernama misalnya `bro-ai-multi-ai`.
3. Buka editor Worker, ganti kode contoh dengan seluruh isi `worker.js`, lalu Deploy.
4. Catat URL Worker, misalnya `https://bro-ai-multi-ai.NAMA-AKUN.workers.dev`.

Alternatif: deploy melalui Wrangler dari komputer/lingkungan pengembangan yang mendukung Node.js. File `wrangler.toml` sudah disertakan.

## 2. Tambahkan Secrets (jangan taruh di HTML)
Di pengaturan Worker, cari **Settings → Variables and Secrets**. Tambahkan sebagai **Secret**:
- `BRO_ACCESS_TOKEN` — buat token panjang acak, minimal 32 karakter.
- `OPENAI_API_KEY` — opsional, untuk Chantika.
- `ANTHROPIC_API_KEY` — opsional, untuk Clara.
- `GEMINI_API_KEY` — opsional, untuk Gendis.
- `DEEPSEEK_API_KEY` — opsional, untuk Denada.

Jangan kirim token/API key ke chat publik, jangan masukkan ke `index.html`, dan jangan commit ke GitHub.

Opsional, tambahkan variable biasa:
- `BRO_ALLOWED_ORIGIN` — origin frontend persis, tanpa path. Contoh GitHub Pages: `https://NAMA-USER.github.io`. Jika pakai repo project pages, origin tetap `https://NAMA-USER.github.io`, bukan ditambah `/nama-repo`.
- `OPENAI_MODEL` — default `gpt-4o-mini`.
- `ANTHROPIC_MODEL` — default `claude-3-5-haiku-latest`.
- `GEMINI_MODEL` — default `gemini-2.5-flash`.
- `DEEPSEEK_MODEL` — default `deepseek-chat`.

Model yang tersedia dapat berubah sesuai akun/provider; bila model default tidak tersedia, atur variable model sesuai akses API lo.

**Setelah menambahkan/mengubah secrets, pastikan perubahan disimpan dan Worker ter-deploy.**

## 3. Host frontend
### Cara sederhana: GitHub Pages
1. Buat repo GitHub baru atau gunakan repo privat/publik yang lo pilih.
2. Upload `index.html`, `manifest.webmanifest`, dan `sw.js` ke root repo.
3. Aktifkan **Settings → Pages** sesuai branch/folder repo.
4. Buka URL GitHub Pages lewat Chrome Android.

Jangan upload file berisi secret. `worker.js` boleh berada di repo hanya jika file itu tidak mengandung token atau API key (paket ini tidak menanamkannya).

## 4. Hubungkan frontend ke Worker
1. Buka BRO AI di URL GitHub Pages.
2. Isi URL backend dengan URL Worker lengkap tanpa akhiran `/chat`, contoh `https://bro-ai-multi-ai.NAMA-AKUN.workers.dev`.
3. Isi token akses yang nilainya sama persis dengan Secret `BRO_ACCESS_TOKEN`.
4. Tekan **Simpan koneksi**, lalu **Tes**.
5. Jika tes sukses, pilih persona dan kirim pertanyaan singkat.

## 5. Arti error umum
- `Token akses tidak valid`: token frontend tidak sama dengan `BRO_ACCESS_TOKEN`, atau Secret belum dibuat.
- `Origin tidak diizinkan`: isi `BRO_ALLOWED_ORIGIN` dengan origin frontend yang tepat. Jika situs punya origin berbeda, sesuaikan daftar dengan koma.
- `Secret ... belum dikonfigurasi`: API key provider itu belum ditambahkan.
- `Provider ... HTTP 401/403`: API key salah, tidak punya akses, atau provider menolak autentikasi.
- `Provider ... HTTP 429`: limit/rate limit/kuota provider tercapai.
- `Provider ... HTTP 400`: model atau format request tidak diterima provider; cek model variable.
- `Failed to fetch`: sering terkait URL Worker salah, Worker belum ter-deploy, CORS, jaringan, atau pemblokiran browser.

## 6. Batasan dan keamanan
- Tombol Bandingkan dapat menjalankan hingga empat panggilan API dan berpotensi menimbulkan biaya empat kali.
- Mode Percakapan terus-menerus dapat memanggil API berkali-kali; hentikan dengan tombol ■.
- Browser menyimpan riwayat/catatan/token di localStorage pada perangkat. Kunci layar dan jangan berbagi profil browser.
- CORS membatasi pemanggilan browser dari origin lain, tetapi tidak menggantikan token. Token yang tertanam di browser dapat dilihat pemilik perangkat atau pengguna yang mendapat akses ke browser. Jika app digunakan publik, gunakan autentikasi pengguna yang lebih kuat dan rate limiting server-side.
- Jangan memasukkan password, nomor identitas, atau data rahasia ke chat.
- Paket ini belum diuji live pada akun Cloudflare/provider atau perangkat Android pengguna.
