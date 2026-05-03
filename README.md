# Rumah Bersih — PWA

Sistem kontrol kebersihan rumah harian dengan insentif ART, approval foto, dan zone tracker.

---

## Deploy ke Netlify (5 menit)

### 1. Push ke GitHub
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/USERNAME/rumah-bersih.git
git push -u origin main
```

### 2. Connect ke Netlify
- Login ke [netlify.com](https://netlify.com)
- New site → Import from Git → pilih repo ini
- Build command: `npm run build`
- Publish directory: `dist`
- Klik **Deploy**

### 3. Generate VAPID Keys (untuk push notification)
```bash
npx web-push generate-vapid-keys
```
Simpan outputnya — kamu butuh VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY.

### 4. Set Environment Variables di Netlify
Pergi ke: Site Settings → Environment Variables → Add variable

| Key | Value | Keterangan |
|-----|-------|------------|
| `ADMIN_PIN` | `1234` | PIN untuk Kelvin & Istri |
| `ART1_PIN` | `1111` | PIN untuk ART 1 |
| `ART2_PIN` | `2222` | PIN untuk ART 2 |
| `ART1_NAME` | `(nama ART 1)` | Nama ART 1 |
| `ART2_NAME` | `(nama ART 2)` | Nama ART 2 |
| `VAPID_PUBLIC_KEY` | `(dari step 3)` | Untuk push notification |
| `VAPID_PRIVATE_KEY` | `(dari step 3)` | Untuk push notification |
| `VAPID_EMAIL` | `email@kamu.com` | Email untuk VAPID |
| `VITE_VAPID_PUBLIC_KEY` | `(sama dengan VAPID_PUBLIC_KEY)` | Dipakai di frontend |

### 5. Tambahkan Icon
Taruh file `icon-192.png` dan `icon-512.png` di folder `public/`.
Ukuran: 192×192 dan 512×512 px. Bisa buat di [realfavicongenerator.net](https://realfavicongenerator.net).

### 6. Redeploy
Setelah env vars diset, klik **Trigger deploy** di Netlify.

---

## Cara Pakai

### Install di HP (Android/iPhone)
1. Buka URL Netlify di Chrome/Safari
2. Tap menu → "Add to Home Screen" / "Install App"
3. Sekarang ada icon di homescreen

### Login
- **Admin** (Kelvin / Istri): PIN ADMIN_PIN
- **ART 1**: PIN ART1_PIN
- **ART 2**: PIN ART2_PIN

### Fitur Admin
- **Zona**: Set zona aktif, tandai selesai, lihat riwayat
- **Foto**: Approve foto dari ART, kategorikan ke Simpan/Jual/Buang/Donasi
- **Rekap**: Lihat summary insentif bulanan per ART

### Fitur ART
- **Tugas**: Checklist 2 tugas harian, aktifkan notifikasi
- **Upload**: Foto barang untuk di-approve admin
- **Poin**: Lihat progress bulanan dan total insentif

---

## Insentif
- ✅ Kedua tugas selesai = **Rp5.000 / hari**
- 🎉 Full bulan tanpa bolong = **+ Bonus Rp50.000**

---

## Notifikasi Harian
Dikirim otomatis jam **07:30 WIB** setiap hari melalui Netlify Scheduled Functions.
ART harus aktifkan notifikasi satu kali di tab Tugas.
