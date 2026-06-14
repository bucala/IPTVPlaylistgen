from typing import Sequence
from app.models import Channel


def _esc(value: str) -> str:
    """Escape double-quotes in attribute values to prevent broken M3U attributes."""
    return value.replace('"', '&quot;')


def _safe_opt(value: str) -> str:
    """Strip newlines from EXTVLCOPT values to prevent header injection."""
    return value.replace('\n', '').replace('\r', '')


def export_m3u(channels: Sequence[Channel]) -> str:
    lines = ['#EXTM3U']

    for ch in channels:
        attrs = []
        if ch.tvg_id:
            attrs.append(f'tvg-id="{_esc(ch.tvg_id)}"')
        attrs.append(f'tvg-name="{_esc(ch.tvg_name or ch.name)}"')
        if ch.tvg_logo:
            attrs.append(f'tvg-logo="{_esc(ch.tvg_logo)}"')
        if ch.tvg_country:
            attrs.append(f'tvg-country="{_esc(ch.tvg_country)}"')
        if ch.tvg_language:
            attrs.append(f'tvg-language="{_esc(ch.tvg_language)}"')
        if ch.group_title:
            attrs.append(f'group-title="{_esc(ch.group_title)}"')
        if ch.catchup:
            attrs.append(f'catchup="{_esc(ch.catchup)}"')
        if ch.catchup_source:
            attrs.append(f'catchup-source="{_esc(ch.catchup_source)}"')

        lines.append(f'#EXTINF:-1 {" ".join(attrs)},{ch.name}')

        if ch.user_agent:
            lines.append(f'#EXTVLCOPT:http-user-agent={_safe_opt(ch.user_agent)}')
        if ch.referer:
            lines.append(f'#EXTVLCOPT:http-referrer={_safe_opt(ch.referer)}')

        lines.append(ch.url)

    return '\n'.join(lines) + '\n'
