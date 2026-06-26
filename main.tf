provider "aws" {
  region = "us-east-1"
}

# S3 Bucket for Audio Assets
resource "aws_s3_bucket" "audio_assets" {
  bucket = "foleyswipe-audio-assets-unique-id" # Change unique-id to something random
}

resource "aws_s3_bucket_cors_configuration" "audio_cors" {
  bucket = aws_s3_bucket.audio_assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["POST", "PUT"]
    allowed_origins = ["*"]
    expose_headers  = []
  }
}

# DynamoDB Table
resource "aws_dynamodb_table" "foleyswipe_table" {
  name         = "FoleySwipeTable"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }
  attribute {
    name = "SK"
    type = "S"
  }
  attribute {
    name = "GSI1_PK"
    type = "S"
  }

  global_secondary_index {
    name               = "GSI1"
    hash_key           = "GSI1_PK"
    projection_type    = "ALL"
  }
}

# IAM User & Credentials
resource "aws_iam_user" "app_user" {
  name = "foleyswipe-backend-user"
}

resource "aws_iam_access_key" "app_keys" {
  user = aws_iam_user.app_user.name
}

resource "aws_iam_user_policy_attachment" "s3_access" {
  user       = aws_iam_user.app_user.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

resource "aws_iam_user_policy_attachment" "dynamo_access" {
  user       = aws_iam_user.app_user.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

# Output Keys to Terminal
output "AWS_ACCESS_KEY_ID" {
  value     = aws_iam_access_key.app_keys.id
  sensitive = true
}
output "AWS_SECRET_ACCESS_KEY" {
  value     = aws_iam_access_key.app_keys.secret
  sensitive = true
}