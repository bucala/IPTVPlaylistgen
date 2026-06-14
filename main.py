import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.routers import channels, io

Base.metadata.create_all(bind=engine)

app = FastAPI(title='IPTV Playlist Generator', version='1.0.0')

app.include_router(channels.router, prefix='/api')
app.include_router(io.router, prefix='/api')

app.mount('/static', StaticFiles(directory='static'), name='static')


@app.get('/{full_path:path}', include_in_schema=False)
async def spa(full_path: str):
    return FileResponse('static/index.html')


if __name__ == '__main__':
    uvicorn.run('main:app', host='0.0.0.0', port=8000, reload=True)
