from typing import List, Dict

try:
    from lxml import etree as ET
    _HAS_LXML = True
except ImportError:
    import xml.etree.ElementTree as ET  # type: ignore
    _HAS_LXML = False

XSPF_NS = 'http://xspf.org/ns/0/'
VLC_NS = 'http://www.videolan.org/vlc/playlist/ns/0/'


def parse_xspf(content: str) -> List[Dict]:
    channels = []
    try:
        root = ET.fromstring(content.encode('utf-8'))
        ns = {'x': XSPF_NS, 'vlc': VLC_NS}

        track_list = root.find(f'{{{XSPF_NS}}}trackList')
        if track_list is None:
            return channels

        for i, track in enumerate(track_list.findall(f'{{{XSPF_NS}}}track')):
            ch: Dict = {
                'tvg_id': '', 'tvg_name': '', 'tvg_logo': '',
                'tvg_country': '', 'tvg_language': '', 'group_title': '',
                'quality': '', 'catchup': '', 'catchup_source': '',
                'user_agent': '', 'referer': '',
            }

            def _text(tag: str) -> str:
                el = track.find(f'{{{XSPF_NS}}}{tag}')
                return (el.text or '').strip() if el is not None else ''

            title = _text('title')
            location = _text('location')
            image = _text('image')

            if not location:
                continue

            ch['name'] = title or f'Channel {i + 1}'
            ch['url'] = location
            ch['tvg_logo'] = image

            # VLC extension metadata
            ext = track.find(f'{{{XSPF_NS}}}extension')
            if ext is not None:
                vlc_id = ext.find(f'{{{VLC_NS}}}id')
                if vlc_id is not None:
                    ch['order_index'] = int(vlc_id.text or 0)

            channels.append(ch)
    except Exception:
        pass

    return channels
