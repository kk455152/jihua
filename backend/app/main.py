from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from .routers import auth, projects, tags, tasks


Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME, version="0.1.0")

is_wildcard = settings.CORS_ORIGINS.strip() == "*"
origins = ["*"] if is_wildcard else [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tags.router)
app.include_router(tasks.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}
