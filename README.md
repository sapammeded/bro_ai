# BRO AI Personal Command Center — v0.1.0

Versi awal yang bisa di-host di GitHub Pages, dibuat untuk Android dan berorientasi biaya Rp0.

## Fitur
- UI mobile-first berbahasa Indonesia.
- Pintasan webapp bisa ditambah, diedit, dan disimpan lokal di browser.
- Pengenalan ucapan Indonesia melalui Web Speech API jika didukung browser.
- Perintah suara dasar untuk membuka webapp, menyiapkan prompt, dan membuka Gemini.
- Text-to-speech untuk respons singkat jika tersedia.
- Pembuat prompt audit/debug/QA dan tombol salin.
- Riwayat aktivitas tersimpan di localStorage.
- Service worker untuk cache dasar setelah kunjungan pertama.

## Batasan penting
- Tidak ada API key atau backend AI yang disertakan.
- Gemini dibuka sebagai layanan eksternal; halaman ini tidak dapat membaca percakapan Gemini atau mengirim prompt otomatis ke akun pengguna. Prompt disiapkan/disalin, lalu tempel ke Gemini bila diperlukan.
- Pengenalan suara memerlukan browser yang mendukung Web Speech API, izin mikrofon, dan biasanya koneksi internet. Uji di Chrome Android. Sesi dapat berhenti otomatis.
- "Wake word" hands-free selalu aktif tidak dijanjikan: browser mobile membatasi mikrofon latar belakang dan pengenalan suara.
- Menambahkan URL hanya membuat pintasan. Aplikasi eksternal belum dikendalikan atau diaudit otomatis.
- `localStorage` hanya tersedia pada browser/perangkat/origin yang sama. Hapus data browser dapat menghapus konfigurasi dan riwayat.
- Untuk privasi, jangan simpan password, token, API key, atau data sensitif.

## Pasang ke GitHub Pages
1. Ekstrak ZIP.
2. Buat repository GitHub baru, misalnya `bro-ai-command-center`.
3. Upload `index.html`, `manifest.webmanifest`, `sw.js`, dan `README.md` ke root repository.
4. Buka **Settings → Pages**.
5. Pilih **Deploy from a branch**, branch `main`, folder `/(root)`, lalu Save.
6. Tunggu deployment selesai, kemudian buka URL Pages lewat Chrome Android.
7. Gunakan menu Chrome **Add to Home screen** atau **Install app** jika tersedia.
8. Izinkan mikrofon saat diminta untuk menguji fitur suara.

## Checklist pengujian
- [ ] Halaman tampil pada lebar layar Android.
- [ ] Tambah/edit/hapus tidak tersedia untuk aplikasi bawaan; tambah dan edit harus tersimpan setelah refresh.
- [ ] Tombol Buka membuka URL yang sudah diisi.
- [ ] Buat prompt, salin prompt, dan buka Gemini berfungsi.
- [ ] Uji mikrofon setelah memberikan izin; jika tidak didukung, gunakan Ketik perintah.
- [ ] Uji offline setelah kunjungan pertama untuk memastikan cache dasar tersedia.
- [ ] Verifikasi URL setiap webapp sebelum dipakai.

## Status verifikasi
Paket dibuat dan diperiksa secara statis untuk struktur file serta JavaScript dasar. Belum diuji langsung di perangkat Android nyata atau melalui deployment GitHub Pages; jangan anggap fitur suara atau instalasi PWA sudah terverifikasi sampai checklist di atas dilakukan.
