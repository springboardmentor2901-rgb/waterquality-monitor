// s3Upload.js
// Dedicated backend for S3 Image Upload (Sir Task)

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Create data folder if not exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// JSON file to store image URLs
const REVIEW_FILE = path.join(DATA_DIR, 'review_images.json');

if (!fs.existsSync(REVIEW_FILE)) {
    fs.writeFileSync(REVIEW_FILE, JSON.stringify({ reviews: [] }, null, 2));
}

// AWS S3 Configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// Multer setup (store file in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper functions
const readReviews = () => {
    const raw = fs.readFileSync(REVIEW_FILE, 'utf-8');
    return JSON.parse(raw).reviews || [];
};

const writeReviews = (reviews) => {
    fs.writeFileSync(REVIEW_FILE, JSON.stringify({ reviews }, null, 2));
};

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'S3 Upload Service Running' });
});

// 🔥 MAIN API — Upload Image to S3 (SIR TASK)
app.post('/api/upload-review-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const file = req.file;
        const fileName = `review-images/${Date.now()}-${file.originalname}`;

        const params = {
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            //ACL: 'public-read'
        };

        // Upload to S3
        const result = await s3.upload(params).promise();
        const imageUrl = result.Location;

        // Save URL in JSON (Required by your task)
        const reviews = readReviews();
        reviews.push({
            image_url: imageUrl,
            uploaded_at: new Date().toISOString()
        });
        writeReviews(reviews);

        res.status(200).json({
            message: 'Image uploaded successfully to S3',
            image_url: imageUrl
        });

    } catch (error) {
        console.error('S3 Upload Error:', error);
        res.status(500).json({
            error: 'Failed to upload image to S3',
            details: error.message
        });
    }
});

// 📥 GET all uploaded images (for frontend later)
app.get('/api/review-images', (req, res) => {
    const reviews = readReviews();
    res.json({ reviews });
});

app.listen(PORT, () => {
    console.log(` S3 Upload Server running on http://localhost:${PORT}`);
});