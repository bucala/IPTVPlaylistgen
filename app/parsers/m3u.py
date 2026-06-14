import re
from typing import List, Dict

_QUALITY_PATTERNS = [
    (r'\b4[Kk]\b|UHD|2160[Pp]', '4K'),
    (r'\bFHD\b|Full\s*HD|FULLHD|1080[Pp]', 'FHD'),
    (r'\bHD\b|720[Pp]', 'HD'),
    (r'\bSD\b|576[Pp]|480[Pp]|360[Pp]', 'SD'),
]

_QUALITY_STRIP = re.compile(
    r'\s*[\(\[](4K|UHD|FHD|HD|SD|Full\s*HD|\d+[Pp])[\)\]]'
    r'|\s+(4K|UHD|FHD|HD|SD|\d+[Pp])\s*$',
    re.IGNORECASE
)

_EXTINF_ATTRS = {
    'tvg_id': re.compile(r'tvg-id="([^"]*)"'),
    'tvg_name': re.compile(r'tvg-name="([^"]*)"'),
    'tvg_logo': re.compile(r'tvg-logo="([^"]*)"'),
    'tvg_country': re.compile(r'tvg-country="([^"]*)"'),
    'tvg_language': re.compile(r'tvg-language="([^"]*)"'),
    'group_title': re.compile(r'group-title="([^"]*)"'),
    'catchup': re.compile(r'catchup="([^"]*)"'),
    'catchup_source': re.compile(r'catchup-source="([^"]*)"'),
}


def detect_quality(name: str) -> str:
    for pattern, quality in _QUALITY_PATTERNS:
        if re.search(pattern, name, re.IGNORECASE):
            return quality
    return ''


def clean_name(name: str) -> str:
    return _QUALITY_STRIP.sub('', name).strip()


def parse_m3u(content: str) -> List[Dict]:
    channels = []
    lines = content.splitlines()
    i = 0

    while i < len(lines):
        line = lines[i].strip()
        i += 1

        if not line or line.startswith('#EXTM3U') or line.startswith('#EXT-X-'):
            continue

        if not line.startswith('#EXTINF:'):
            continue

        ch = _parse_extinf(line)

        while i < len(lines):
            next_line = lines[i].strip()
            i += 1

            if not next_line:
                continue
            if next_line.startswith('#EXTVLCOPT:'):
                opt = next_line[11:]
                if opt.startswith('http-user-agent='):
                    ch['user_agent'] = opt[16:]
                elif opt.startswith('http-referrer='):
                    ch['referer'] = opt[14:]
                continue
            if next_line.startswith('#'):
                # Unexpected directive – keep parsing
                continue
            # It's a URL
            ch['url'] = next_line
            break

        if 'url' in ch and ch['url']:
            channels.append(ch)

    return channels


def _parse_extinf(line: str) -> Dict:
    ch: Dict = {
        'tvg_id': '',
        'tvg_name': '',
        'tvg_logo': '',
        'tvg_country': '',
        'tvg_language': '',
        'group_title': '',
        'quality': '',
        'catchup': '',
        'catchup_source': '',
        'user_agent': '',
        'referer': '',
    }

    for key, pattern in _EXTINF_ATTRS.items():
        m = pattern.search(line)
        if m:
            ch[key] = m.group(1)

    comma = line.rfind(',')
    if comma != -1:
        name = line[comma + 1:].strip()
    else:
        name = ch.get('tvg_name', '') or 'Unknown'

    ch['quality'] = ch['quality'] or detect_quality(name)
    ch['name'] = name

    return ch
