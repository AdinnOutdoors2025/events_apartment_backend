require('dotenv').config();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/orderNotes/");
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});


const allowedMimeTypes = [
  // Images
  "image/jpeg", 
  "image/png", 
  "image/gif", 
  "image/webp", 
  "image/svg+xml",
  
  // Audio - MP3 and other formats
  "audio/mpeg",      // for .mp3 files
  "audio/mp3",       // alternative MIME type for .mp3
  "audio/wav",       // for .wav files
  "audio/ogg",       // for .ogg files
  "audio/aac",       // for .aac files
  "audio/m4a",       // for .m4a files
  
  // PDF
  "application/pdf",
  
  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  
  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Store the original fields method
const originalFields = upload.fields.bind(upload);

// Override fields method to transform paths to URLs
upload.fields = function(fieldsConfig) {
  return (req, res, next) => {
    originalFields(fieldsConfig)(req, res, (err) => {
      if (err) return next(err);
      
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      
      if (req.files) {
        Object.keys(req.files).forEach(fieldName => {
          req.files[fieldName] = req.files[fieldName].map(file => {
            // THIS IS THE KEY - Override the path with URL
            file.path = `${baseUrl}/uploads/orderNotes/${file.filename}`;
            return file;
          });
        });
      }
      
      next();
    });
  };
};

module.exports = upload;