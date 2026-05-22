from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from .models import Priority


class TagBase(BaseModel):
    name: str
    color: str = "#6B7280"


class TagCreate(TagBase):
    pass


class TagOut(TagBase):
    id: int

    class Config:
        from_attributes = True


class ProjectBase(BaseModel):
    name: str
    color: str = "#4F46E5"
    icon: str = "list"
    sort_order: int = 0


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None


class ProjectOut(ProjectBase):
    id: int
    task_count: int = 0

    class Config:
        from_attributes = True


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Priority = Priority.NONE
    due_date: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    sort_order: int = 0
    project_id: Optional[int] = None
    parent_id: Optional[int] = None


class TaskCreate(TaskBase):
    tag_ids: List[int] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[Priority] = None
    due_date: Optional[datetime] = None
    reminder_at: Optional[datetime] = None
    sort_order: Optional[int] = None
    project_id: Optional[int] = None
    parent_id: Optional[int] = None
    is_archived: Optional[bool] = None
    tag_ids: Optional[List[int]] = None


class TaskOut(TaskBase):
    id: int
    completed: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    tags: List[TagOut] = Field(default_factory=list)
    subtasks: List["TaskOut"] = Field(default_factory=list)

    class Config:
        from_attributes = True


TaskOut.model_rebuild()


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=64)
    email: Optional[EmailStr] = None
    password: str = Field(min_length=4, max_length=128)


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
