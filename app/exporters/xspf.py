from typing import Sequence
from app.models import Channel

try:
    from lxml import etree as ET
    _HAS_LXML = True
except ImportError:
    import xml.etree.ElementTree as ET  # type: ignore
    _HAS_LXML = False

XSPF_NS = 'http://xspf.org/ns/0/'
VLC_NS = 'http://www.videolan.org/vlc/playlist/ns/0/'


def _sub(parent, tag: str, ns: str = XSPF_NS):
    return ET.SubElement(parent, f'{{{ns}}}{tag}')


def export_xspf(channels: Sequence[Channel]) -> str:
    nsmap = {None: XSPF_NS, 'vlc': VLC_NS} if _HAS_LXML else {}

    if _HAS_LXML:
        root = ET.Element(f'{{{XSPF_NS}}}playlist', nsmap=nsmap)
    else:
        ET.register_namespace('', XSPF_NS)
        ET.register_namespace('vlc', VLC_NS)
        root = ET.Element(f'{{{XSPF_NS}}}playlist')

    root.set('version', '1')

    title_el = _sub(root, 'title')
    title_el.text = 'IPTV Playlist'

    track_list = _sub(root, 'trackList')

    for i, ch in enumerate(channels):
        track = _sub(track_list, 'track')

        title_t = _sub(track, 'title')
        title_t.text = ch.name

        loc = _sub(track, 'location')
        loc.text = ch.url

        if ch.tvg_logo:
            img = _sub(track, 'image')
            img.text = ch.tvg_logo

        ext = ET.SubElement(track, f'{{{XSPF_NS}}}extension')
        ext.set('application', 'http://www.videolan.org/vlc/playlist/0')
        vlc_id = ET.SubElement(ext, f'{{{VLC_NS}}}id')
        vlc_id.text = str(i)

    if _HAS_LXML:
        return ET.tostring(
            root, pretty_print=True, xml_declaration=True, encoding='UTF-8'
        ).decode()
    else:
        return ('<?xml version="1.0" encoding="UTF-8"?>\n'
                + ET.tostring(root, encoding='unicode'))


def export_csv(channels: Sequence[Channel]) -> str:
    import csv
    import io

    fields = ['name', 'url', 'tvg_id', 'tvg_name', 'tvg_logo',
              'group_title', 'quality', 'tvg_country', 'tvg_language',
              'user_agent', 'referer', 'catchup', 'is_active']

    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=fields)
    writer.writeheader()
    for ch in channels:
        writer.writerow({f: getattr(ch, f, '') for f in fields})

    return out.getvalue()
