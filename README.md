# IPTV Playlist Generator

A modern web application for creating, editing, and exporting IPTV playlists in multiple formats with EPG matching and logo auto-detection.

## Features

- **Import**: M3U, M3U8, XSPF, TXT (URL list or `name|url` format)
- **Export**: M3U, M3U8, XSPF, CSV
- **Channel management**: Full CRUD with inline editing, sorting, filtering, pagination
- **Auto-quality detection**: Detects 4K / FHD / HD / SD from channel names
- **EPG auto-matching**: Matches TVG-IDs and logos against the [iptv-org](https://github.com/iptv-org/iptv) database (~11 000 channels)
- **Bulk operations**: Edit group/quality/status/country for multiple channels at once
- **Catchup / User-Agent / Referer** support per channel

## Quick Start

```bash
pip install -r requirements.txt
python main.py
```

Open **http://localhost:8000** in your browser.

## Usage

1. **Import** your existing playlist via ⬆ Import (drag & drop or file browser)
2. **Edit** channels by double-clicking a row or clicking ✎
3. **Auto-match** EPG/logos with ⚡ Auto-Match EPG (connects to iptv-org)
4. **Filter** by group, quality, country, or active status
5. **Export** in your desired format via ⬇ Export

## Tech Stack

- **Backend**: Python / FastAPI / SQLAlchemy (SQLite)
- **Frontend**: Vue 3 (CDN) + Tailwind CSS (CDN) — no build step required
- **EPG/logo source**: [iptv-org/iptv](https://github.com/iptv-org/iptv)
- **Fuzzy matching**: [rapidfuzz](https://github.com/rapidfuzz/RapidFuzz)