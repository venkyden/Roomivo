#!/bin/bash
echo "🚀 Starting Roomivo Image Upload Setup..."
echo ""

# Install dependencies
echo "📦 Installing backend dependencies..."
cd server
npm install cloudinary multer dotenv
cd ..
echo "✅ Backend dependencies installed"
echo ""

# Create directories
echo "📁 Creating routes directory..."
mkdir -p server/routes
echo "✅ Routes directory ready"
echo ""

# Get credentials
echo "🔑 Environment Variables Setup"
echo "================================"
echo ""
echo "Visit https://cloudinary.com/users/register/free"
echo ""
read -p "Enter your Cloudinary Cloud Name: " CLOUD_NAME
read -p "Enter your Cloudinary API Key: " API_KEY
read -sp "Enter your Cloudinary API Secret (hidden): " API_SECRET
echo ""
echo ""

# Update env file
echo "📝 Updating backend environment variables..."
if [ -f "server/.env.railway" ]; then
  cp server/.env.railway server/.env.railway.backup
  echo "   (Backup created: .env.railway.backup)"
fi

cat >> server/.env.railway << ENVEOF

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=$CLOUD_NAME
CLOUDINARY_API_KEY=$API_KEY
CLOUDINARY_API_SECRET=$API_SECRET
ENVEOF

echo "✅ Environment variables saved"
echo ""

# Create image routes
echo "📝 Creating backend image routes..."

cat > server/routes/images.js << 'JSEOF'
import express from 'express';
import cloudinary from 'cloudinary';
import multer from 'multer';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

router.post('/upload', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.v2.uploader.upload_stream(
        {
          folder: 'roomivo/properties',
          resource_type: 'auto',
          quality: 'auto',
          fetch_format: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.json({
      success: true,
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.delete('/delete/:publicId', verifyToken, async (req, res) => {
  try {
    const { publicId } = req.params;
    await cloudinary.v2.uploader.destroy(publicId);
    res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;
JSEOF

echo "✅ Backend image routes created"
echo ""

# Create env file
echo "📝 Setting up frontend environment..."
mkdir -p client

cat > client/.env.local << ENVEOF2
VITE_API_URL=http://localhost:5000
VITE_CLOUDINARY_CLOUD_NAME=$CLOUD_NAME
ENVEOF2

echo "✅ Frontend environment created"
echo ""

echo "================================"
echo "✅ SETUP COMPLETE!"
echo "================================"
echo ""
echo "Next step: Run copy-components.sh"
echo ""
