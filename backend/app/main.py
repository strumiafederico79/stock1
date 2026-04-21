from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, catalogs, dashboard, items, movements, rentals, users
from app.services.seed import seed_reference_data

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_reference_data(db)
    finally:
        db.close()
    yield


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/health')
def health():
    return {'ok': True, 'app': settings.app_name}


app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(users.router, prefix=settings.api_prefix)
app.include_router(dashboard.router, prefix=settings.api_prefix)
app.include_router(catalogs.router, prefix=settings.api_prefix)
app.include_router(items.router, prefix=settings.api_prefix)
app.include_router(movements.router, prefix=settings.api_prefix)
app.include_router(rentals.router, prefix=settings.api_prefix)
