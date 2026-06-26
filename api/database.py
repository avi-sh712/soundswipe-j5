import boto3
import os
from botocore.exceptions import ClientError

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE_NAME", "FoleySwipeTable")

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
table = dynamodb.Table(DYNAMODB_TABLE)

def get_assets_by_category(category: str, limit: int = 20):
    try:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('GSI1_PK').eq(f"CATEGORY#{category}"),
            ScanIndexForward=False,
            Limit=limit
        )
        return response.get('Items', [])
    except ClientError:
        return []

def save_like(user_id: str, asset_id: str, asset_data: dict):
    item = {
        'PK': f"USER#{user_id}",
        'SK': f"LIKE#{asset_id}",
        **asset_data
    }
    try:
        table.put_item(Item=item)
        return True
    except ClientError:
        return False

def get_all_assets():
    try:
        response = table.scan()
        return response.get('Items', [])
    except ClientError:
        return []