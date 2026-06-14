from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix='/channels', tags=['channels'])


@router.get('/', response_model=schemas.ChannelListResponse)
def list_channels(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    group: Optional[str] = None,
    quality: Optional[str] = None,
    country: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort_by: str = 'order_index',
    sort_dir: str = 'asc',
):
    q = db.query(models.Channel)

    if search:
        term = f'%{search}%'
        q = q.filter(
            models.Channel.name.ilike(term) |
            models.Channel.tvg_id.ilike(term) |
            models.Channel.group_title.ilike(term)
        )
    if group is not None:
        q = q.filter(models.Channel.group_title == group)
    if quality:
        q = q.filter(models.Channel.quality == quality)
    if country:
        q = q.filter(models.Channel.tvg_country.ilike(f'%{country}%'))
    if is_active is not None:
        q = q.filter(models.Channel.is_active == is_active)

    total = q.count()

    col = getattr(models.Channel, sort_by, models.Channel.order_index)
    q = q.order_by(col.desc() if sort_dir == 'desc' else col)

    items = q.offset(skip).limit(limit).all()
    return {'total': total, 'items': items, 'skip': skip, 'limit': limit}


@router.post('/', response_model=schemas.Channel, status_code=201)
def create_channel(body: schemas.ChannelCreate, db: Session = Depends(get_db)):
    max_order = db.query(func.max(models.Channel.order_index)).scalar() or 0
    ch = models.Channel(**body.model_dump(), order_index=max_order + 1)
    db.add(ch)
    db.commit()
    db.refresh(ch)
    return ch


@router.get('/groups', response_model=List[dict])
def list_groups(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Channel.group_title, func.count(models.Channel.id))
        .group_by(models.Channel.group_title)
        .order_by(models.Channel.group_title)
        .all()
    )
    return [{'name': r[0], 'count': r[1]} for r in rows]


@router.get('/stats')
def get_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(models.Channel.id)).scalar()
    active = db.query(func.count(models.Channel.id)).filter(models.Channel.is_active == True).scalar()
    groups = db.query(func.count(func.distinct(models.Channel.group_title))).scalar()
    qualities = (
        db.query(models.Channel.quality, func.count(models.Channel.id))
        .group_by(models.Channel.quality)
        .all()
    )
    return {
        'total': total,
        'active': active,
        'inactive': total - active,
        'groups': groups,
        'qualities': {q: c for q, c in qualities},
    }


@router.get('/{channel_id}', response_model=schemas.Channel)
def get_channel(channel_id: int, db: Session = Depends(get_db)):
    ch = db.get(models.Channel, channel_id)
    if not ch:
        raise HTTPException(status_code=404, detail='Channel not found')
    return ch


@router.put('/{channel_id}', response_model=schemas.Channel)
def update_channel(
    channel_id: int,
    body: schemas.ChannelUpdate,
    db: Session = Depends(get_db),
):
    ch = db.get(models.Channel, channel_id)
    if not ch:
        raise HTTPException(status_code=404, detail='Channel not found')
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(ch, k, v)
    db.commit()
    db.refresh(ch)
    return ch


@router.delete('/{channel_id}', status_code=204)
def delete_channel(channel_id: int, db: Session = Depends(get_db)):
    ch = db.get(models.Channel, channel_id)
    if not ch:
        raise HTTPException(status_code=404, detail='Channel not found')
    db.delete(ch)
    db.commit()


@router.post('/bulk/delete', status_code=200)
def bulk_delete(body: schemas.BulkDeleteRequest, db: Session = Depends(get_db)):
    deleted = (
        db.query(models.Channel)
        .filter(models.Channel.id.in_(body.ids))
        .delete(synchronize_session=False)
    )
    db.commit()
    return {'deleted': deleted}


@router.post('/bulk/update', status_code=200)
def bulk_update(body: schemas.BulkUpdateRequest, db: Session = Depends(get_db)):
    update_data = body.updates.model_dump(exclude_unset=True)
    if not update_data:
        return {'updated': 0}
    updated = (
        db.query(models.Channel)
        .filter(models.Channel.id.in_(body.ids))
        .update(update_data, synchronize_session=False)
    )
    db.commit()
    return {'updated': updated}


@router.post('/reorder', status_code=200)
def reorder_channels(items: List[schemas.ReorderItem], db: Session = Depends(get_db)):
    for item in items:
        db.query(models.Channel).filter(models.Channel.id == item.id).update(
            {'order_index': item.order_index}
        )
    db.commit()
    return {'reordered': len(items)}


@router.delete('/', status_code=200)
def clear_all(db: Session = Depends(get_db)):
    count = db.query(models.Channel).count()
    db.query(models.Channel).delete()
    db.commit()
    return {'deleted': count}
