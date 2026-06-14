from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.exporters.m3u import export_m3u
from app.exporters.xspf import export_csv, export_xspf
from app.parsers.m3u import parse_m3u
from app.parsers.xspf import parse_xspf
from app.services import epg as epg_svc

router = APIRouter(tags=['io'])


# ── Import ────────────────────────────────────────────────────────────────────

@router.post('/import')
async def import_playlist(
    file: UploadFile = File(...),
    replace: bool = False,
    auto_quality: bool = True,
    db: Session = Depends(get_db),
):
    raw = await file.read()
    text = raw.decode('utf-8', errors='replace')
    name = (file.filename or '').lower()

    if name.endswith('.xspf'):
        channels = parse_xspf(text)
    elif name.endswith(('.m3u', '.m3u8', '.txt')):
        if name.endswith('.txt') and not text.startswith('#EXTM3U'):
            # Plain URL list or "name|url" lines
            channels = _parse_txt(text)
        else:
            channels = parse_m3u(text)
    else:
        # Try M3U by default
        channels = parse_m3u(text)

    if replace:
        db.query(models.Channel).delete()
        db.commit()

    base_order = db.query(func.max(models.Channel.order_index)).scalar() or 0

    _FIELDS = {
        'name', 'url', 'tvg_id', 'tvg_name', 'tvg_logo',
        'tvg_country', 'tvg_language', 'group_title', 'quality',
        'user_agent', 'referer', 'catchup', 'catchup_source',
    }

    to_insert = []
    for i, ch in enumerate(channels):
        data = {k: ch.get(k, '') for k in _FIELDS}
        data['order_index'] = base_order + i + 1
        data['is_active'] = True
        to_insert.append(data)

    db.bulk_insert_mappings(models.Channel, to_insert)  # type: ignore[arg-type]
    db.commit()

    return {'imported': len(to_insert)}


def _parse_txt(text: str) -> list:
    channels = []
    for i, line in enumerate(text.splitlines()):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '|' in line:
            parts = line.split('|', 1)
            name, url = parts[0].strip(), parts[1].strip()
        elif '\t' in line:
            parts = line.split('\t', 1)
            name, url = parts[0].strip(), parts[1].strip()
        else:
            name = f'Channel {i + 1}'
            url = line
        if url:
            channels.append({
                'name': name, 'url': url,
                'tvg_id': '', 'tvg_name': '', 'tvg_logo': '',
                'tvg_country': '', 'tvg_language': '', 'group_title': '',
                'quality': '', 'catchup': '', 'catchup_source': '',
                'user_agent': '', 'referer': '',
            })
    return channels


# ── Export ────────────────────────────────────────────────────────────────────

@router.get('/export/{fmt}')
def export_playlist(
    fmt: str,
    db: Session = Depends(get_db),
    active_only: bool = True,
    group: Optional[str] = None,
    quality: Optional[str] = None,
):
    q = db.query(models.Channel)
    if active_only:
        q = q.filter(models.Channel.is_active == True)
    if group:
        q = q.filter(models.Channel.group_title == group)
    if quality:
        q = q.filter(models.Channel.quality == quality)

    channels = q.order_by(models.Channel.order_index).all()

    fmt = fmt.lower()
    if fmt in ('m3u', 'm3u8'):
        content = export_m3u(channels)
        media_type = 'audio/x-mpegurl'
        ext = fmt
    elif fmt == 'xspf':
        content = export_xspf(channels)
        media_type = 'application/xspf+xml'
        ext = 'xspf'
    elif fmt == 'csv':
        content = export_csv(channels)
        media_type = 'text/csv'
        ext = 'csv'
    else:
        raise HTTPException(status_code=400, detail=f'Unsupported format: {fmt}')

    return Response(
        content=content.encode('utf-8') if isinstance(content, str) else content,
        media_type=media_type,
        headers={'Content-Disposition': f'attachment; filename="playlist.{ext}"'},
    )


# ── EPG / Logo auto-match ─────────────────────────────────────────────────────

@router.get('/epg/search')
def epg_search(
    q: str = Query(..., min_length=2),
    country: Optional[str] = None,
    limit: int = 20,
):
    results = epg_svc.search_channels(q, country, limit)
    return results


@router.post('/epg/match')
def epg_match(
    ids: Optional[List[int]] = None,
    overwrite: bool = False,
    db: Session = Depends(get_db),
):
    """Auto-match EPG IDs and logos from iptv-org channel database."""
    q = db.query(models.Channel)
    if ids:
        q = q.filter(models.Channel.id.in_(ids))

    channels = q.all()
    payload = [
        {'id': ch.id, 'name': ch.name, 'tvg_country': ch.tvg_country}
        for ch in channels
    ]

    matches = epg_svc.auto_match(payload)

    updated = 0
    match_map = {m['id']: m for m in matches}
    for ch in channels:
        m = match_map.get(ch.id)
        if not m:
            continue
        if overwrite or not ch.tvg_id:
            ch.tvg_id = m.get('tvg_id', ch.tvg_id)
            ch.tvg_name = m.get('tvg_name', ch.tvg_name)
        if overwrite or not ch.tvg_logo:
            ch.tvg_logo = m.get('tvg_logo', ch.tvg_logo)
        if overwrite or not ch.tvg_country:
            ch.tvg_country = m.get('tvg_country', ch.tvg_country)
        if overwrite or not ch.tvg_language:
            ch.tvg_language = m.get('tvg_language', ch.tvg_language)
        updated += 1

    db.commit()
    return {'matched': updated, 'total': len(channels)}
