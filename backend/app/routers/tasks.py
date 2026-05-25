from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _load_task(db: Session, task_id: int, user_id: int) -> models.Task:
    task = (
        db.query(models.Task)
        .options(selectinload(models.Task.tags), selectinload(models.Task.subtasks))
        .filter(models.Task.id == task_id, models.Task.owner_id == user_id)
        .first()
    )
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return task


def _attach_tags(db: Session, task: models.Task, tag_ids: List[int], user_id: int):
    if tag_ids is None:
        return
    tags = (
        db.query(models.Tag)
        .filter(models.Tag.id.in_(tag_ids), models.Tag.owner_id == user_id)
        .all()
    )
    task.tags = tags


@router.get("", response_model=List[schemas.TaskOut])
def list_tasks(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    project_id: Optional[int] = None,
    completed: Optional[bool] = None,
    archived: Optional[bool] = False,
    view: Optional[str] = Query(None, description="today | week | inbox | all"),
    search: Optional[str] = None,
    tag_id: Optional[int] = None,
):
    q = (
        db.query(models.Task)
        .options(selectinload(models.Task.tags), selectinload(models.Task.subtasks))
        .filter(models.Task.owner_id == user.id, models.Task.parent_id.is_(None))
    )

    if archived is not None:
        q = q.filter(models.Task.is_archived == archived)
    if completed is not None:
        q = q.filter(models.Task.completed == completed)
    if project_id is not None:
        q = q.filter(models.Task.project_id == project_id)
    if tag_id is not None:
        q = q.filter(models.Task.tags.any(models.Tag.id == tag_id))
    if search:
        like = f"%{search}%"
        q = q.filter(or_(models.Task.title.ilike(like), models.Task.description.ilike(like)))

    now = datetime.now()
    if view == "today":
        end = now.replace(hour=23, minute=59, second=59, microsecond=0)
        q = q.filter(
            and_(models.Task.due_date.isnot(None), models.Task.due_date <= end)
        )
    elif view == "week":
        end = (now + timedelta(days=7)).replace(hour=23, minute=59, second=59)
        q = q.filter(
            and_(models.Task.due_date.isnot(None), models.Task.due_date <= end)
        )
    elif view == "inbox":
        q = q.filter(models.Task.project_id.is_(None))

    q = q.order_by(
        models.Task.completed.asc(),
        models.Task.sort_order.asc(),
        models.Task.due_date.asc().nullslast(),
        models.Task.id.desc(),
    )
    return q.all()


@router.post("", response_model=schemas.TaskOut, status_code=201)
def create_task(
    payload: schemas.TaskCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    data = payload.model_dump(exclude={"tag_ids"})
    task = models.Task(**data, owner_id=user.id)
    _attach_tags(db, task, payload.tag_ids, user.id)
    db.add(task)
    db.commit()
    return _load_task(db, task.id, user.id)


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _load_task(db, task_id, user.id)


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    payload: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = _load_task(db, task_id, user.id)
    data = payload.model_dump(exclude_unset=True)
    tag_ids = data.pop("tag_ids", None)

    if "completed" in data:
        if data["completed"] and not task.completed:
            task.completed_at = datetime.now()
        elif not data["completed"]:
            task.completed_at = None

    for k, v in data.items():
        setattr(task, k, v)

    if tag_ids is not None:
        _attach_tags(db, task, tag_ids, user.id)

    db.commit()
    return _load_task(db, task.id, user.id)


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = _load_task(db, task_id, user.id)
    db.delete(task)
    db.commit()


@router.post("/{task_id}/toggle", response_model=schemas.TaskOut)
def toggle_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = _load_task(db, task_id, user.id)
    task.completed = not task.completed
    task.completed_at = datetime.now() if task.completed else None
    db.commit()
    return _load_task(db, task.id, user.id)
