"""
EPG & logo matching against the iptv-org channels database.
https://iptv-org.github.io/api/channels.json
"""
import json
import threading
import time
from typing import Dict, List, Optional

import requests

CHANNELS_URL     = 'https://iptv-org.github.io/api/channels.json'
CACHE_TTL        = 3600          # 1 hour
MAX_DOWNLOAD     = 30 * 1024 * 1024  # 30 MB hard cap

_cache:    List[Dict] = []
_cache_ts: float      = 0.0
_lock = threading.Lock()

try:
    from rapidfuzz import fuzz, process as rfprocess
    _HAS_RAPIDFUZZ = True
except ImportError:
    _HAS_RAPIDFUZZ = False


def _load_channels() -> List[Dict]:
    global _cache, _cache_ts
    now = time.time()
    with _lock:
        if _cache and (now - _cache_ts) < CACHE_TTL:
            return _cache
        try:
            resp = requests.get(CHANNELS_URL, timeout=30, stream=True)
            resp.raise_for_status()

            # Reject oversized responses before reading body
            cl = int(resp.headers.get('content-length', 0))
            if cl and cl > MAX_DOWNLOAD:
                raise ValueError(f'EPG response too large: {cl} bytes')

            buf = bytearray()
            for chunk in resp.iter_content(chunk_size=65_536):
                buf.extend(chunk)
                if len(buf) > MAX_DOWNLOAD:
                    raise ValueError('EPG response exceeded size limit during download')

            _cache    = json.loads(buf)
            _cache_ts = now
        except Exception:
            pass  # Return stale cache or empty list on error
        return _cache


def _build_index(channels: List[Dict], country: Optional[str] = None) -> tuple:
    if country:
        cu = country.strip().upper()
        # Use exact country code match (not substring) to avoid false positives
        subset = [
            c for c in channels
            if (c.get('country') or '').upper() == cu
            or cu in [a.upper() for a in c.get('broadcast_area', [])]
        ]
        if not subset:
            subset = channels  # fall back to global if no country match
    else:
        subset = channels

    names = [c.get('name', '') for c in subset]
    return subset, names


def find_channel(name: str, country: Optional[str] = None) -> Optional[Dict]:
    channels = _load_channels()
    if not channels:
        return None

    subset, names = _build_index(channels, country)

    if _HAS_RAPIDFUZZ:
        result = rfprocess.extractOne(
            name, names,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=65,
        )
        if result:
            _, _score, idx = result
            return subset[idx]
    else:
        name_lower = name.lower()
        for c in subset:
            if c.get('name', '').lower() == name_lower:
                return c
        for c in subset:
            if name_lower in c.get('name', '').lower():
                return c

    return None


def auto_match(channel_list: List[Dict]) -> List[Dict]:
    """
    Given [{id, name, tvg_country}, …] return [{id, tvg_id, tvg_name, tvg_logo, …}, …]
    only for channels that found a match.
    """
    results = []
    for item in channel_list:
        match = find_channel(item.get('name', ''), item.get('tvg_country'))
        if match:
            results.append({
                'id':           item['id'],
                'tvg_id':       match.get('id', ''),
                'tvg_name':     match.get('name', ''),
                'tvg_logo':     match.get('logo', ''),
                'tvg_country':  match.get('country', ''),
                'tvg_language': ', '.join(match.get('languages', [])),
            })
    return results


def search_channels(query: str, country: Optional[str] = None, limit: int = 20) -> List[Dict]:
    channels = _load_channels()
    if not channels:
        return []

    subset, names = _build_index(channels, country)

    if _HAS_RAPIDFUZZ:
        matches = rfprocess.extract(
            query, names,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=50,
            limit=limit,
        )
        return [subset[m[2]] for m in matches]
    else:
        q = query.lower()
        return [c for c in subset if q in c.get('name', '').lower()][:limit]
