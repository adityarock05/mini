# Migrating from Local Storage to AWS S3

This guide explains how to migrate the AEGIS platform from local file storage to AWS S3 for production deployment.

## Current Setup (Local Storage)

The application currently uses local file storage with the following configuration:

- **Storage Location**: `/home/apsingh/Documents/krkhc_2/backend/uploads/`
- **Subdirectories**:
  - `uploads/grievances/` - Grievance photos
  - `uploads/courses/` - Course resources
  - `uploads/opportunities/` - Application resumes
  - `uploads/avatars/` - User avatars
- **File Serving**: Static files served via FastAPI's `StaticFiles`
- **Access**: Files accessible at `http://localhost:8000/uploads/{path}`

## Prerequisites for S3 Migration

1. **AWS Account** with S3 access
2. **IAM User** with appropriate permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::your-bucket-name",
           "arn:aws:s3:::your-bucket-name/*"
         ]
       }
     ]
   }
   ```
3. **boto3** library installed: `pip install boto3`

## Step-by-Step Migration

### Step 1: Create S3 Bucket

```bash
# Using AWS CLI
aws s3 mb s3://your-aegis-bucket-name --region your-region

# Enable versioning (optional but recommended)
aws s3api put-bucket-versioning \
  --bucket your-aegis-bucket-name \
  --versioning-configuration Status=Enabled

# Configure CORS for web access
aws s3api put-bucket-cors \
  --bucket your-aegis-bucket-name \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST"],
        "AllowedOrigins": ["https://your-domain.com"],
        "MaxAgeSeconds": 3000
      }
    ]
  }'
```

### Step 2: Update Environment Variables

Add to `backend/.env`:

```env
# Storage Configuration
STORAGE_TYPE=s3

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=your-region (e.g., us-east-1)
S3_BUCKET_NAME=your-aegis-bucket-name

# Optional: CloudFront CDN
CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
```

### Step 3: Install boto3

```bash
cd /home/apsingh/Documents/krkhc_2/backend
source .venv/bin/activate
pip install boto3
```

### Step 4: Create S3 Storage Module

Create `backend/app/core/s3_storage.py`:

```python
"""
AWS S3 Storage configuration.
This module replaces local storage for production deployments.
"""
import os
import uuid
import boto3
from botocore.exceptions import ClientError
from typing import Optional, BinaryIO
from pathlib import Path

# S3 Configuration
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
CLOUDFRONT_DOMAIN = os.getenv("CLOUDFRONT_DOMAIN")

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.zip'}
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB


def get_s3_key(file_type: str, filename: str) -> str:
    """Generate S3 key for file storage."""
    directories = {
        'grievance_photo': 'grievances/',
        'course_resource': 'courses/',
        'opportunity_application': 'opportunities/',
        'user_avatar': 'avatars/',
    }
    
    prefix = directories.get(file_type, 'misc/')
    return f"{prefix}{filename}"


def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def validate_file_size(file_size: int) -> bool:
    """Check if file size is within limits."""
    return file_size <= MAX_FILE_SIZE


def upload_file(
    file_content: BinaryIO,
    file_type: str,
    filename: str,
    content_type: Optional[str] = None
) -> str:
    """
    Upload file to S3.
    
    Args:
        file_content: File content as bytes or BinaryIO
        file_type: Type of file (grievance_photo, course_resource, etc.)
        filename: Original filename
        content_type: MIME type of the file
    
    Returns:
        URL of the uploaded file
    """
    # Generate unique filename
    ext = Path(filename).suffix
    unique_filename = f"{uuid.uuid4()}{ext}"
    s3_key = get_s3_key(file_type, unique_filename)
    
    # Upload to S3
    try:
        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type
        
        s3_client.upload_fileobj(
            file_content,
            S3_BUCKET_NAME,
            s3_key,
            ExtraArgs=extra_args
        )
        
        # Generate URL
        if CLOUDFRONT_DOMAIN:
            return f"https://{CLOUDFRONT_DOMAIN}/{s3_key}"
        else:
            return f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
    
    except ClientError as e:
        raise Exception(f"Failed to upload file to S3: {str(e)}")


def delete_file(s3_key: str) -> bool:
    """
    Delete file from S3.
    
    Args:
        s3_key: S3 key of the file to delete
    
    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        return True
    except ClientError:
        return False


def get_presigned_url(s3_key: str, expiration: int = 3600) -> str:
    """
    Generate presigned URL for temporary access.
    
    Args:
        s3_key: S3 key of the file
        expiration: URL expiration time in seconds (default: 1 hour)
    
    Returns:
        Presigned URL
    """
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=expiration
        )
        return url
    except ClientError as e:
        raise Exception(f"Failed to generate presigned URL: {str(e)}")


def extract_s3_key_from_url(url: str) -> Optional[str]:
    """Extract S3 key from URL."""
    if CLOUDFRONT_DOMAIN and CLOUDFRONT_DOMAIN in url:
        return url.split(f"https://{CLOUDFRONT_DOMAIN}/")[-1]
    elif f"{S3_BUCKET_NAME}.s3" in url:
        return url.split(f".amazonaws.com/")[-1]
    return None
```

### Step 5: Update Storage Configuration

Modify `backend/app/core/storage.py` to support both local and S3:

```python
"""
File storage configuration supporting both local and S3 storage.
"""
import os
from pathlib import Path

# Determine storage type
STORAGE_TYPE = os.getenv("STORAGE_TYPE", "local")  # Options: local, s3

if STORAGE_TYPE == "s3":
    # Import and use S3 storage
    from app.core.s3_storage import (
        upload_file,
        delete_file,
        is_allowed_file,
        validate_file_size,
        get_presigned_url,
    )
    USE_S3 = True
else:
    # Use local storage (default)
    USE_S3 = False
    from app.core.local_storage import (
        upload_file,
        delete_file,
        is_allowed_file,
        validate_file_size,
    )

__all__ = [
    'upload_file',
    'delete_file', 
    'is_allowed_file',
    'validate_file_size',
    'USE_S3',
]

if USE_S3:
    __all__.append('get_presigned_url')
```

### Step 6: Create Unified API Layer

Create `backend/app/core/file_storage.py`:

```python
"""
Unified file storage interface supporting both local and S3 storage.
"""
import os
from typing import BinaryIO, Optional
from pathlib import Path

STORAGE_TYPE = os.getenv("STORAGE_TYPE", "local")

if STORAGE_TYPE == "s3":
    from app.core.s3_storage import upload_file, delete_file
    STORAGE_BACKEND = "s3"
else:
    from app.core.local_storage import upload_file, delete_file
    STORAGE_BACKEND = "local"


async def save_uploaded_file(
    file_content: bytes,
    file_type: str,
    filename: str,
    content_type: Optional[str] = None
) -> dict:
    """
    Save uploaded file to configured storage backend.
    
    Args:
        file_content: File content as bytes
        file_type: Type/category of file
        filename: Original filename
        content_type: MIME type
    
    Returns:
        dict with filename and url
    """
    from io import BytesIO
    
    file_obj = BytesIO(file_content)
    
    if STORAGE_BACKEND == "s3":
        url = upload_file(file_obj, file_type, filename, content_type)
        return {
            "filename": Path(url).name,
            "url": url,
            "storage": "s3"
        }
    else:
        # Local storage
        from app.core.local_storage import get_file_path
        from pathlib import Path
        
        ext = Path(filename).suffix
        unique_filename = f"{uuid.uuid4()}{ext}"
        file_path = get_file_path(file_type, unique_filename)
        
        # Ensure directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Generate relative URL
        relative_path = file_path.relative_to(UPLOAD_DIR)
        return {
            "filename": unique_filename,
            "url": f"/uploads/{relative_path}",
            "storage": "local"
        }
```

### Step 7: Update File Upload Endpoints

Modify `backend/app/api/files.py` to use the unified storage interface:

```python
# Replace the manual file saving logic with:
from app.core.file_storage import save_uploaded_file, delete_uploaded_file

# In upload handlers:
result = await save_uploaded_file(
    content,
    file_type='grievance_photo',
    filename=file.filename,
    content_type=file.content_type
)

return {
    "message": "File uploaded successfully",
    "filename": result["filename"],
    "url": result["url"]
}
```

### Step 8: Migrate Existing Files (Optional)

If you have existing local files to migrate:

```bash
#!/bin/bash
# migrate_to_s3.sh

BUCKET_NAME="your-aegis-bucket-name"
LOCAL_UPLOAD_DIR="/home/apsingh/Documents/krkhc_2/backend/uploads"

# Upload grievances
aws s3 sync "$LOCAL_UPLOAD_DIR/grievances/" "s3://$BUCKET_NAME/grievances/"

# Upload courses
aws s3 sync "$LOCAL_UPLOAD_DIR/courses/" "s3://$BUCKET_NAME/courses/"

# Upload opportunities
aws s3 sync "$LOCAL_UPLOAD_DIR/opportunities/" "s3://$BUCKET_NAME/opportunities/"

# Upload avatars
aws s3 sync "$LOCAL_UPLOAD_DIR/avatars/" "s3://$BUCKET_NAME/avatars/"

echo "Migration complete!"
```

### Step 9: Update Frontend Configuration

Update `frontend/lib/api.ts` to handle both storage types:

```typescript
// File upload helper
export const uploadFile = async (
  endpoint: string,
  file: File,
  additionalData?: Record<string, any>
) => {
  const formData = new FormData();
  formData.append('file', file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  
  const response = await apiClient.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  
  return response.data;
};

// File URL helper - handles both local and S3 URLs
export const getFileUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // S3 or CloudFront URL
    return url;
  }
  // Local URL - prepend API base URL
  return `${API_BASE_URL}${url}`;
};
```

### Step 10: Update Environment Variables

Ensure all required variables are set:

```bash
# .env file
cat << 'EOF' > backend/.env
# Database
DATABASE_URL=postgresql+asyncpg://aegis_user:aegis_pass@localhost:5432/aegis_db

# Storage Configuration
STORAGE_TYPE=s3

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-aegis-bucket
CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net

# JWT
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
EOF
```

### Step 11: Test Migration

```bash
# Test S3 connection
python -c "
from app.core.s3_storage import s3_client
response = s3_client.list_buckets()
print('S3 Connection: OK')
print('Buckets:', [b['Name'] for b in response['Buckets']])
"

# Test file upload
python -c "
from app.core.s3_storage import upload_file
from io import BytesIO

content = BytesIO(b'Test content')
url = upload_file(content, 'test', 'test.txt', 'text/plain')
print('Upload URL:', url)
"
```

### Step 12: Deploy to Production

1. **Set environment variables** on production server
2. **Restart backend** to load new configuration
3. **Test all file operations**
4. **Monitor S3 costs** and set up billing alerts

## Cost Optimization Tips

1. **Use CloudFront CDN**: Reduces S3 data transfer costs
2. **Enable S3 Transfer Acceleration**: For global users
3. **Lifecycle Policies**: Move old files to Glacier for archiving
4. **Requester Pays**: For public datasets
5. **Monitor with CloudWatch**: Set up alerts for unexpected costs

## Security Best Practices

1. **Enable S3 Block Public Access** by default
2. **Use IAM roles** instead of access keys when possible
3. **Enable S3 versioning** for backup
4. **Use presigned URLs** for temporary access
5. **Enable server-side encryption** (SSE-S3 or SSE-KMS)
6. **Set up CloudTrail** for audit logging

## Rollback Plan

If you need to rollback to local storage:

```bash
# 1. Change environment variable
export STORAGE_TYPE=local

# 2. Restart backend
sudo systemctl restart aegis-backend

# 3. Files will automatically save locally again
```

## Troubleshooting

### Common Issues:

1. **"Access Denied" errors**: Check IAM permissions
2. **Slow uploads**: Enable S3 Transfer Acceleration
3. **CORS errors**: Verify bucket CORS configuration
4. **URL expiration**: Use CloudFront for permanent URLs

### Debug Commands:

```bash
# Check S3 bucket exists
aws s3 ls s3://your-bucket-name

# Test file upload via CLI
aws s3 cp test.txt s3://your-bucket-name/test.txt

# Check IAM permissions
aws sts get-caller-identity
```

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- [S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)

---

**Need Help?** Contact your AWS administrator or refer to AWS support resources.
