from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=List[schemas.TagOut])
def list_tags(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Tag)
        .filter(models.Tag.owner_id == user.id)
        .order_by(models.Tag.name)
        .all()
    )


@router.post("", response_model=schemas.TagOut, status_code=201)
def create_tag(
    payload: schemas.TagCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    tag = models.Tag(**payload.model_dump(), owner_id=user.id)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
def delete_tag(
    tag_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    tag = (
        db.query(models.Tag)
        .filter(models.Tag.id == tag_id, models.Tag.owner_id == user.id)
        .first()
    )
    if not tag:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tag not found")
    db.delete(tag)
    db.commit()
