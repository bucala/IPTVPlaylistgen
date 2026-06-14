import os

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.routers import channels, io

Base.metadata.create_all(bind=engine)

app = FastAPI(title='IPTV Playlist Generator', version='1.0.0')

# CORS – allow frontend origins from env var (comma-separated)
_cors_raw = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173,http://localhost:8000')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_raw.split(',') if o.strip()],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(channels.router, prefix='/api')
app.include_router(io.router, prefix='/api')

app.mount('/static', StaticFiles(directory='static'), name='static')


@app.get('/{full_path:path}', include_in_schema=False)
async def spa(full_path: str):
    # Let FastAPI handle /api/* properly – do not intercept
    if full_path.startswith('api/'):
        raise HTTPException(status_code=404, detail='Not found')
    return FileResponse('static/index.html')


if __name__ == '__main__':
    is_prod = os.getenv('ENV', 'development').lower() == 'production'
    uvicorn.run(
        'main:app',
        host='0.0.0.0',
        port=int(os.getenv('PORT', '8000')),
        reload=not is_prod,
    )
