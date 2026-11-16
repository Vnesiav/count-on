# Count On

PWA pelacak pengeluaran dan tabungan bersama (2–3 orang per ruang).

## Siapkan

1. Buat proyek [Supabase](https://supabase.com).
2. Auth: Email, enable confirmations, and password reset.
3. Jalankan `supabase/schema.sql` di SQL editor.
4. Storage: bucket privat `receipts` (foto struk, P1 lampiran lama belum).
5. Salin `.env.example` ke `.env.local` dan isi URL + anon key.

```bash
npm install
npm test
npm run dev
```

Pasang dari browser HP (Add to Home Screen).
