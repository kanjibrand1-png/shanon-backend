const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload single image
const uploadImage = upload.single('image');

// Handle image upload
const handleImageUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the file information
    res.json({
      message: 'Image uploaded successfully',
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

// Delete image by filename
const deleteImage = async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const filePath = path.join('uploads', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'Image deleted successfully' });
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};

// Helper function to delete image by URL (for use in other controllers)
const deleteImageByUrl = async (imageUrl) => {
  try {
    // Handle null, undefined, or empty strings
    if (!imageUrl || imageUrl === '' || imageUrl === null || imageUrl === undefined) {
      console.log('Skipping image deletion - no valid image URL provided');
      return;
    }
    
    const filename = imageUrl.split('/').pop();
    if (!filename || filename === '') {
      console.log('Skipping image deletion - invalid filename from URL:', imageUrl);
      return;
    }
    
    const filePath = path.join('uploads', filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Deleted image: ${filename}`);
    } else {
      console.log(`⚠️ Image file not found: ${filename} (from URL: ${imageUrl})`);
    }
  } catch (err) {
    console.error('❌ Error deleting image:', err);
  }
};

module.exports = {
  uploadImage,
  handleImageUpload,
  deleteImage,
  deleteImageByUrl
};

