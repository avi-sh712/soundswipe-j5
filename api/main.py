from fastapi import FastAPI
from dotenv import load_dotenv
import os
from mangum import Mangum
# Load the environment variables from the .env file
load_dotenv()

from .routes_feed import router as feed_router
from .routes_upload import router as upload_router

app = FastAPI()

app.include_router(feed_router, prefix="/api/feed")
app.include_router(upload_router, prefix="/api/upload")
# This is the entrypoint AWS Lambda will use
handler = Mangum(app)