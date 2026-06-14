from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)
    order_index = Column(Integer, default=0, index=True)

    name = Column(String, nullable=False)
    url = Column(Text, nullable=False)

    tvg_id = Column(String, default="", index=True)
    tvg_name = Column(String, default="")
    tvg_logo = Column(Text, default="")
    tvg_country = Column(String, default="", index=True)
    tvg_language = Column(String, default="")

    group_title = Column(String, default="", index=True)
    quality = Column(String, default="", index=True)

    user_agent = Column(String, default="")
    referer = Column(String, default="")
    catchup = Column(String, default="")
    catchup_source = Column(Text, default="")

    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
