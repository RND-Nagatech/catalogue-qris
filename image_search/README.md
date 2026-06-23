# Image Search Engine

Visual similarity search untuk katalog perhiasan. Gunakan DINOv2 ViT-B/14 untuk embedding + Qdrant vector database.

## Prasyarat

- Python 3.10+
- Docker (untuk Qdrant)
- RAM 4GB+ (model DINOv2 ~330MB)

## Quick Start

### 1. Jalankan Qdrant

```bash
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -v qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

### 2. Install dependencies

```bash
cd image_search
pip install -r requirements.txt
```

### 3. Konfigurasi

Copy `.env` dan sesuaikan:

```bash
# Default values (sudah ada di .env)
PORT=3751
QDRANT_PATH=./qdrant_data
# atau pakai Qdrant server:
# QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=products
VECTOR_SIZE=768
MODEL_NAME=dinov2_vitb14
TOP_K=20
SYNC_IMAGES_DIR=../server/sync_images
```

### 4. Build Index

Jalankan setelah `sync_images/` sudah ada isinya (hasil sync gambar Firebase):

```bash
python3 index_builder.py
```

Proses:
- Baca semua `*.jpg` dari `sync_images/`
- Ekstrak embedding via DINOv2 (768-d)
- Insert ke Qdrant

```bash
# Reset & rebuild dari awal
python index_builder.py --reset
```

### 5. Jalankan API

```bash
python app.py
# → http://localhost:3751
```

Cek health:

```bash
curl http://localhost:3751/health
# → {"status":"ok","model":"dinov2_vitb14","device":"cpu","vector_size":768}
```

### 6. Test Search

```bash
curl -X POST http://localhost:3751/search \
  -F "file=@cincin.jpg" \
  -F "top_k=5"
```

## Integrasi dengan Backend

Backend Node.js (port 3750) akan proxy request ke service ini:

```
POST /api/search/image (multipart: file)
  → Backend forward ke http://localhost:3751/search
  → Dapat list barcode + score
  → Enrich dari Master Catalog DB
  → Return Product[] lengkap
```

Pastikan `IMAGE_SEARCH_URL=http://localhost:3751` di `backend/.env`.

## Deploy di Server

### Systemd Service

Buat service file:

```bash
sudo tee /etc/systemd/system/image-search.service << 'EOF'
[Unit]
Description=Image Search Engine
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/nodeapp/international/international_catalogue/image_search
ExecStart=/usr/bin/python3 app.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Enable & start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now image-search
sudo systemctl status image-search
```

### Logs & Restart

```bash
# Cek log realtime
sudo journalctl -u image-search -f

# Restart
sudo systemctl restart image-search

# Cek status
sudo systemctl status image-search
```

### Qdrant di Server

```bash
docker run -d \
  --name qdrant \
  --restart always \
  -p 6333:6333 \
  -v /data/qdrant:/qdrant/storage \
  qdrant/qdrant
```

## Troubleshooting

### SSL Error saat download model

```bash
# macOS
/Applications/Python\ 3.13/Install\ Certificates.command
```

### Qdrant connection refused

```bash
docker ps | grep qdrant
docker start qdrant
```

### ModuleNotFoundError: qdrant_client

File lokal `qdrant_client.py` bentrok dengan library. Sudah di-rename ke `qdrant_store.py`.

### Index builder lambat

Proses batch 100 gambar. Bisa dihentikan kapan saja, jalankan ulang untuk melanjutkan (skip yang sudah ada di Qdrant).
