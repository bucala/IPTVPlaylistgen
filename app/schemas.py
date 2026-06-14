from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ChannelBase(BaseModel):
    name: str
    url: str
    tvg_id: Optional[str] = ""
    tvg_name: Optional[str] = ""
    tvg_logo: Optional[str] = ""
    tvg_country: Optional[str] = ""
    tvg_language: Optional[str] = ""
    group_title: Optional[str] = ""
    quality: Optional[str] = ""
    user_agent: Optional[str] = ""
    referer: Optional[str] = ""
    catchup: Optional[str] = ""
    catchup_source: Optional[str] = ""
    is_active: Optional[bool] = True
    order_index: Optional[int] = 0


class ChannelCreate(ChannelBase):
    pass


class ChannelUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    tvg_id: Optional[str] = None
    tvg_name: Optional[str] = None
    tvg_logo: Optional[str] = None
    tvg_country: Optional[str] = None
    tvg_language: Optional[str] = None
    group_title: Optional[str] = None
    quality: Optional[str] = None
    user_agent: Optional[str] = None
    referer: Optional[str] = None
    catchup: Optional[str] = None
    catchup_source: Optional[str] = None
    is_active: Optional[bool] = None
    order_index: Optional[int] = None


class Channel(ChannelBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ChannelListResponse(BaseModel):
    total: int
    items: list[Channel]
    skip: int
    limit: int


class BulkDeleteRequest(BaseModel):
    ids: list[int]


class BulkUpdateRequest(BaseModel):
    ids: list[int]
    updates: ChannelUpdate


class ReorderItem(BaseModel):
    id: int
    order_index: int
