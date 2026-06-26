import os
import uuid
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .database import table

router = APIRouter()

# Hardcoding ap-south-1 as the fallback just in case the .env doesn't load it
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1") 
S3_BUCKET = os.getenv("S3_BUCKET_NAME", "foleyswipe-audio-assets")

# Force Signature Version 4 and exact regional endpoint
s3_client = boto3.client(
    's3',
    region_name=AWS_REGION,
    endpoint_url=f"https://s3.{AWS_REGION}.amazonaws.com",
    config=Config(signature_version='s3v4'),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

class UploadRequest(BaseModel):
    file_name: str
    content_type: str
    category: str

class UploadConfirm(BaseModel):
    asset_id: str
    file_name: str
    category: str
    object_key: str

@router.post("/presigned-url")
def generate_presigned_url(request: UploadRequest):
    asset_id = str(uuid.uuid4())
    object_name = f"assets/{request.category}/{asset_id}_{request.file_name}"
    
    try:
        presigned_post = s3_client.generate_presigned_post(
            Bucket=S3_BUCKET,
            Key=object_name,
            Fields={"Content-Type": request.content_type},
            Conditions=[{"Content-Type": request.content_type}],
            ExpiresIn=3600
        )
        return {"presigned_url": presigned_post, "asset_id": asset_id, "object_key": object_name}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/confirm")
def confirm_upload(req: UploadConfirm):
    item = {
        'PK': f"ASSET#{req.asset_id}",
        'SK': f"ASSET#{req.asset_id}",
        'GSI1_PK': f"CATEGORY#{req.category}",
        'id': req.asset_id,
        'name': req.file_name,
        'category': req.category,
        'url': f"https://{S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{req.object_key}"
    }
    try:
        table.put_item(Item=item)
        return {"success": True}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))