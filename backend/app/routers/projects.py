from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[schemas.ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    rows = (
        db.query(
            models.Project,
            func.count(models.Task.id).filter(
                models.Task.completed == False,  # noqa: E712
                models.Task.is_archived == False,  # noqa: E712
            ).label("task_count"),
        )
        .outerjoin(models.Task, models.Task.project_id == models.Project.id)
        .filter(models.Project.owner_id == user.id)
        .group_by(models.Project.id)
        .order_by(models.Project.sort_order, models.Project.id)
        .all()
    )
    result = []
    for project, task_count in rows:
        out = schemas.ProjectOut.model_validate(project)
        out.task_count = task_count or 0
        result.append(out)
    return result


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    project = models.Project(**payload.model_dump(), owner_id=user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return schemas.ProjectOut.model_validate(project)


@router.patch("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: int,
    payload: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id, models.Project.owner_id == user.id)
        .first()
    )
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(project, k, v)
    db.commit()
    db.refresh(project)
    return schemas.ProjectOut.model_validate(project)


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id, models.Project.owner_id == user.id)
        .first()
    )
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    db.delete(project)
    db.commit()
