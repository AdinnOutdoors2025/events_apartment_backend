// require('dotenv').config();
// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadPath = path.join(__dirname, "../uploads/orderNotes/");
    
//     if (!fs.existsSync(uploadPath)) {
//       fs.mkdirSync(uploadPath, { recursive: true });
//     }
    
//     cb(null, uploadPath);
//   },

//   filename: (req, file, cb) => {
//     const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, unique + path.extname(file.originalname));
//   },
// });


// const allowedMimeTypes = [
//   // Images
//   "image/jpeg", 
//   "image/png", 
//   "image/gif", 
//   "image/webp", 
//   "image/svg+xml",
  
//   // Audio - MP3 and other formats
//   "audio/mpeg",      // for .mp3 files
//   "audio/mp3",       // alternative MIME type for .mp3
//   "audio/wav",       // for .wav files
//   "audio/ogg",       // for .ogg files
//   "audio/aac",       // for .aac files
//   "audio/m4a",       // for .m4a files
  
//   // PDF
//   "application/pdf",
  
//   // Excel
//   "application/vnd.ms-excel",
//   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  
//   // Word
//   "application/msword",
//   "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
// ];
// const fileFilter = (req, file, cb) => {
//   if (allowedMimeTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error(`File type not allowed: ${file.mimetype}`), false);
//   }
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: 20 * 1024 * 1024 },
// });

// // Store the original fields method
// const originalFields = upload.fields.bind(upload);

// // Override fields method to transform paths to URLs
// upload.fields = function(fieldsConfig) {
//   return (req, res, next) => {
//     originalFields(fieldsConfig)(req, res, (err) => {
//       if (err) return next(err);
      
//       const baseUrl = process.env.LOCAL_BASE_URL || 'http://localhost:5000';
      
//       if (req.files) {
//         Object.keys(req.files).forEach(fieldName => {
//           req.files[fieldName] = req.files[fieldName].map(file => {
//             // THIS IS THE KEY - Override the path with URL
//             file.path = `${baseUrl}/uploads/orderNotes/${file.filename}`;
//             return file;
//           });
//         });
//       }
      
//       next();
//     });
//   };
// };

// module.exports = upload;



const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const fs = require("fs");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const spacesClient = require("../config/spaces");

const BUCKET_NAME =
  process.env.DO_SPACES_BUCKET || "adinn-space";

const CDN_BASE_URL =
  process.env.DO_SPACES_CDN_BASE ||
  "https://adinn-space.sgp1.digitaloceanspaces.com";

const STORAGE_TYPE =
  process.env.STORAGE_TYPE || "local";

const LOCAL_BASE_URL =
  process.env.LOCAL_BASE_URL ||
  "http://localhost:5000";

// Folder structure
const APARTMENT_FOLDER = "events";
const UPLOAD_FOLDER = "order-notes";

const SPACES_KEY_PREFIX =
  `${APARTMENT_FOLDER}/${UPLOAD_FOLDER}`;

// ─────────────────────────────────────────────────────────────
// ENSURE LOCAL DIRECTORY EXISTS
// ─────────────────────────────────────────────────────────────
if (STORAGE_TYPE === "local") {
  const uploadPath = path.join(
    process.cwd(),
    process.env.LOCAL_UPLOAD_PATH || "uploads",
    UPLOAD_FOLDER
  );

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, {
      recursive: true,
    });

    console.log(
      `Created local upload directory: ${uploadPath}`
    );
  }
}

// ─────────────────────────────────────────────────────────────
// FILE FILTER (ALLOW ALL FILE TYPES)
// ─────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  cb(null, true);
};

// ─────────────────────────────────────────────────────────────
// LOCAL STORAGE
// ─────────────────────────────────────────────────────────────
const localStorageEngine =
  multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(
        process.cwd(),
        process.env.LOCAL_UPLOAD_PATH ||
          "uploads",
        UPLOAD_FOLDER
      );

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, {
          recursive: true,
        });
      }

      cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
      const sanitizedName =
        file.originalname.replace(
          /[^a-zA-Z0-9.-]/g,
          "_"
        );

      cb(
        null,
        `${Date.now()}-${sanitizedName}`
      );
    },
  });

// ─────────────────────────────────────────────────────────────
// MIME TYPE FUNCTION
// ─────────────────────────────────────────────────────────────
const getMimeType = (fileName) => {
  const ext = path
    .extname(fileName)
    .toLowerCase();

  const mimeTypes = {
    // Images
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",

    // Audio
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".aac": "audio/aac",
    ".m4a": "audio/mp4",

    // Video
    // ".mp4": "video/mp4",
    // ".mov": "video/quicktime",
    // ".avi": "video/x-msvideo",
    // ".mkv": "video/x-matroska",

    // PDF
    ".pdf": "application/pdf",

    // Excel
    ".xls":
      "application/vnd.ms-excel",

    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    // Word
    ".doc": "application/msword",

    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    

    // Text
    ".txt": "text/plain",
    
  };

  return (
    mimeTypes[ext] ||
    "application/octet-stream"
  );
};

// ─────────────────────────────────────────────────────────────
// DIGITALOCEAN SPACES STORAGE
// ─────────────────────────────────────────────────────────────
const spacesStorageEngine = multerS3({
  s3: spacesClient,

  bucket: BUCKET_NAME,

  // REMOVE THIS IF ACL DISABLED
  acl: "public-read",

  contentDisposition: "inline",

  contentType: (req, file, cb) => {
    const mimeType = getMimeType(
      file.originalname
    );

    cb(null, mimeType);
  },

  metadata: (req, file, cb) => {
    cb(null, {
      fieldname: file.fieldname,
    });
  },

  key: (req, file, cb) => {
    const sanitizedName =
      file.originalname.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      );

    cb(
      null,
      `${SPACES_KEY_PREFIX}/${Date.now()}-${sanitizedName}`
    );
  },
});

// ─────────────────────────────────────────────────────────────
// MULTER INSTANCE
// ─────────────────────────────────────────────────────────────
const upload = multer({
  storage:
    STORAGE_TYPE === "space"
      ? spacesStorageEngine
      : localStorageEngine,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// ─────────────────────────────────────────────────────────────
// GET FILE URL
// ─────────────────────────────────────────────────────────────
const getFileUrl = (req, file) => {
  if (STORAGE_TYPE === "space") {
    return file.location;
  }

  return `${LOCAL_BASE_URL}/public/uploads/${UPLOAD_FOLDER}/${file.filename}`;
};

// ─────────────────────────────────────────────────────────────
// GET FILE BUFFER
// ─────────────────────────────────────────────────────────────
const getFileBuffer = async (file) => {
  if (STORAGE_TYPE === "space") {
    const key = file.key;

    const command =
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

    const response =
      await spacesClient.send(command);

    const chunks = [];

    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  return fs.readFileSync(file.path);
};

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────
module.exports = upload;

module.exports.getFileUrl =
  getFileUrl;

module.exports.getFileBuffer =
  getFileBuffer;

module.exports.STORAGE_TYPE =
  STORAGE_TYPE;

module.exports.SPACES_KEY_PREFIX =
  SPACES_KEY_PREFIX;