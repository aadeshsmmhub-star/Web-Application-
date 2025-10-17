from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone
from PIL import Image
import io


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class CompressionStats(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_filename: str
    original_size: int
    compressed_size: int
    original_format: str
    compression_ratio: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Routes
@api_router.get("/")
async def root():
    return {"message": "Image Compression API"}

@api_router.post("/compress")
async def compress_image(file: UploadFile = File(...)):
    """
    Convert any image format to WebP with high quality
    """
    try:
        # Read the uploaded file
        contents = await file.read()
        original_size = len(contents)
        
        # Open image with PIL
        image = Image.open(io.BytesIO(contents))
        original_format = image.format or "UNKNOWN"
        
        # Convert RGBA to RGB if necessary
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Save as WebP with high quality (95 for excellent quality)
        output = io.BytesIO()
        image.save(output, format='WEBP', quality=95, method=6)
        output.seek(0)
        compressed_size = len(output.getvalue())
        
        # Calculate compression ratio
        compression_ratio = round((1 - compressed_size / original_size) * 100, 2) if original_size > 0 else 0
        
        # Save stats to MongoDB
        stats = CompressionStats(
            original_filename=file.filename,
            original_size=original_size,
            compressed_size=compressed_size,
            original_format=original_format,
            compression_ratio=compression_ratio
        )
        
        stats_doc = stats.model_dump()
        stats_doc['timestamp'] = stats_doc['timestamp'].isoformat()
        await db.compression_stats.insert_one(stats_doc)
        
        # Return the compressed image
        output.seek(0)
        filename_without_ext = Path(file.filename).stem
        
        return StreamingResponse(
            output,
            media_type="image/webp",
            headers={
                "Content-Disposition": f'attachment; filename="{filename_without_ext}.webp"',
                "X-Original-Size": str(original_size),
                "X-Compressed-Size": str(compressed_size),
                "X-Compression-Ratio": str(compression_ratio),
                "X-Original-Format": original_format
            }
        )
        
    except Exception as e:
        logger.error(f"Error compressing image: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")

@api_router.get("/stats", response_model=List[CompressionStats])
async def get_compression_stats():
    """Get compression statistics"""
    stats = await db.compression_stats.find({}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    
    for stat in stats:
        if isinstance(stat['timestamp'], str):
            stat['timestamp'] = datetime.fromisoformat(stat['timestamp'])
    
    return stats

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
```

---