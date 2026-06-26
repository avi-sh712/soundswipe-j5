from fastapi import APIRouter
from pydantic import BaseModel
from boto3.dynamodb.conditions import Key
from .database import table, save_like
from .recommender import get_recommendations

router = APIRouter()

class LikeRequest(BaseModel):
    user_id: str
    asset_data: dict

class RecommendationRequest(BaseModel):
    liked_asset_ids: list

@router.get("/{category}")
def fetch_feed(category: str, limit: int = 20):
    try:
        if category.upper() == "ALL":
            # Scan the table for all assets (ignoring user 'like' records)
            response = table.scan()
            items = response.get('Items', [])
            assets = [item for item in items if item.get('PK', '').startswith('ASSET#')]
            # Apply basic manual limit for the scan
            return {"assets": assets[:limit]}
        else:
            # Query the exact category using the Global Secondary Index
            response = table.query(
                IndexName='GSI1',
                KeyConditionExpression=Key('GSI1_PK').eq(f"CATEGORY#{category}"),
                Limit=limit
            )
            return {"assets": response.get('Items', [])}
    except Exception as e:
        print(f"DynamoDB Error: {str(e)}")
        return {"assets": []}

@router.post("/recommendations")
def fetch_recommendations(req: RecommendationRequest, limit: int = 5):
    assets = get_recommendations(req.liked_asset_ids, limit)
    return {"assets": assets}

@router.post("/like/{asset_id}")
def like_asset(asset_id: str, req: LikeRequest):
    success = save_like(req.user_id, asset_id, req.asset_data)
    return {"success": success}