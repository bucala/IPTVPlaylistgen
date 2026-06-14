"""
EPG & logo matching against the iptv-org channels database.
https://iptv-org.github.io/api/channels.json
"""
import threading
import time
from typing import Dict, List, Optional

import requests

CHANNELS_URL = 'https://iptv-org.github.io/api/channels.json'
CACHE_TTL = 3600  # 1 hour

_cache: List[Dict] = []
_cache_ts: float = 0
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
            resp = requests.get(CHANNELS_URL, timeout=30)
            resp.raise_for_status()
            _cache = resp.json()
            _cache_ts = now
        except Exception:
            pass
        return _cache


def _build_index(channels: List[Dict], country: Optional[str] = None) -> tuple:
    if country:
        subset = [
            c for c in channels
            if country.upper() in (c.get('country') or '').upper()
            or country.upper() in ' '.join(c.get('broadcast_area', []))
        ]
        if not subset:
            subset = channels
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
            score_cutoff=65
        )
        if result:
            match_name, score, idx = result
            return subset[idx]
    else:
        # Fallback: simple lowercase containment
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
    Given a list of dicts with keys id, name, tvg_country,
    return dicts with id + matched fields to update.
    """
    results = []
    for item in channel_list:
        match = find_channel(item.get('name', ''), item.get('tvg_country'))
        if match:
            results.append({
                'id': item['id'],
                'tvg_id': match.get('id', ''),
                'tvg_name': match.get('name', ''),
                'tvg_logo': match.get('logo', ''),
                'tvg_country': match.get('country', ''),
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
            limit=limit
        )
        return [subset[m[2]] for m in matches]
    else:
        query_lower = query.lower()
        return [c for c in subset if query_lower in c.get('name', '').lower()][:limit]
