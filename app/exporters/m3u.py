from typing import Sequence
from app.models import Channel


def export_m3u(channels: Sequence[Channel]) -> str:
    lines = ['#EXTM3U']

    for ch in channels:
        attrs = []
        if ch.tvg_id:
            attrs.append(f'tvg-id="{ch.tvg_id}"')
        attrs.append(f'tvg-name="{ch.tvg_name or ch.name}"')
        if ch.tvg_logo:
            attrs.append(f'tvg-logo="{ch.tvg_logo}"')
        if ch.tvg_country:
            attrs.append(f'tvg-country="{ch.tvg_country}"')
        if ch.tvg_language:
            attrs.append(f'tvg-language="{ch.tvg_language}"')
        if ch.group_title:
            attrs.append(f'group-title="{ch.group_title}"')
        if ch.catchup:
            attrs.append(f'catchup="{ch.catchup}"')
        if ch.catchup_source:
            attrs.append(f'catchup-source="{ch.catchup_source}"')

        lines.append(f'#EXTINF:-1 {" ".join(attrs)},{ch.name}')

        if ch.user_agent:
            lines.append(f'#EXTVLCOPT:http-user-agent={ch.user_agent}')
        if ch.referer:
            lines.append(f'#EXTVLCOPT:http-referrer={ch.referer}')

        lines.append(ch.url)

    return '\n'.join(lines) + '\n'
