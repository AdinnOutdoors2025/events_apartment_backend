// const multer = require("multer");
// const fs = require("fs");
// const path = require("path");

// // Use absolute path
// const uploadPath = path.join(__dirname, "../uploads"); // Adjust based on your folder structure

// // Ensure upload directory exists
// if (!fs.existsSync(uploadPath)) {
//   fs.mkdirSync(uploadPath, { recursive: true });
//   console.log(`Created upload directory: ${uploadPath}`);
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadPath);
//   },

//   filename: (req, file, cb) => {
//     // Sanitize filename and add timestamp
//     const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
//     const uniqueFilename = `${Date.now()}-${sanitizedName}`;
//     cb(null, uniqueFilename);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = [".xlsx", ".xls"];
//   const ext = path.extname(file.originalname).toLowerCase();

//   if (!allowedTypes.includes(ext)) {
//     return cb(new Error("Only Excel files (.xlsx, .xls) are allowed"), false);
//   }

//   cb(null, true);
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB limit
//   },
// });

// module.exports = upload;







// const multer = require("multer");
// const multerS3 = require("multer-s3");
// const path = require("path");
// const fs = require("fs");
// const spacesClient = require("../config/spaces");

// const STORAGE_TYPE = process.env.STORAGE_TYPE || "local";
// const BUCKET_NAME = process.env.DO_SPACES_BUCKET || "adinn-space";
// const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL || "http://localhost:5000";
// const EXCEL_FOLDER = "excel-uploads";

// // ─── Ensure Local Directory Exists ────────────────────────────────────────────
// if (STORAGE_TYPE === "local") {
//   const uploadPath = path.join(process.cwd(), "uploads", EXCEL_FOLDER);
//   if (!fs.existsSync(uploadPath)) {
//     fs.mkdirSync(uploadPath, { recursive: true });
//     console.log(`Created local upload directory: ${uploadPath}`);
//   }
// }

// // ─── File Filter ───────────────────────────────────────────────────────────────
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = [".xlsx", ".xls"];
//   const ext = path.extname(file.originalname).toLowerCase();

//   if (!allowedTypes.includes(ext)) {
//     return cb(new Error("Only Excel files (.xlsx, .xls) are allowed"), false);
//   }
//   cb(null, true);
// };

// // ─── Local Storage ─────────────────────────────────────────────────────────────
// const localStorageEngine = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadPath = path.join(process.cwd(), "uploads", EXCEL_FOLDER);
//     cb(null, uploadPath);
//   },
//   filename: (req, file, cb) => {
//     const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
//     cb(null, `${Date.now()}-${sanitizedName}`);
//   },
// });

// // ─── Spaces Storage ────────────────────────────────────────────────────────────
// const spacesStorageEngine = multerS3({
//   s3: spacesClient,
//   bucket: BUCKET_NAME,
//   acl: "public-read",
//   contentType: multerS3.AUTO_CONTENT_TYPE,
//   metadata: (req, file, cb) => {
//     cb(null, { fieldname: file.fieldname });
//   },
//   key: (req, file, cb) => {
//     const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
//     cb(null, `${EXCEL_FOLDER}/${Date.now()}-${sanitizedName}`);
//   },
// });

// // ─── Multer Instance ───────────────────────────────────────────────────────────
// const upload = multer({
//   storage: STORAGE_TYPE === "space" ? spacesStorageEngine : localStorageEngine,
//   fileFilter,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB
//   },
// });

// // ─── Helper: Get File URL ──────────────────────────────────────────────────────
// const getExcelFileUrl = (req, file) => {
//   if (STORAGE_TYPE === "space") {
//     return file.location; // multer-s3 attaches full CDN URL automatically
//   }
//   return `${LOCAL_BASE_URL}/uploads/${EXCEL_FOLDER}/${file.filename}`;
// };
// // ─── Helper: Get File Buffer (for Spaces) ──────────────────────────────────────
// const getFileBuffer = async (file) => {
//   if (STORAGE_TYPE === "space") {
//     // Download file from Spaces
//     const fetch = (await import('node-fetch')).default;
//     const response = await fetch(file.location);
//     return Buffer.from(await response.arrayBuffer());
//   } else {
//     // Read local file
//     return fs.readFileSync(file.path);
//   }
// };

// module.exports = upload;
// module.exports.getExcelFileUrl = getExcelFileUrl;
// module.exports.getFileBuffer = getFileBuffer;
// module.exports.STORAGE_TYPE = STORAGE_TYPE;







// const multer = require("multer");
// const multerS3 = require("multer-s3");
// const path = require("path");
// const fs = require("fs");
// const { GetObjectCommand } = require("@aws-sdk/client-s3");
// const spacesClient = require("../config/spaces");

// const BUCKET_NAME = process.env.DO_SPACES_BUCKET || "adinn-space";
// const CDN_BASE_URL =
//   process.env.DO_SPACES_CDN_BASE ||
//   "https://adinn-space.sgp1.digitaloceanspaces.com";
// const STORAGE_TYPE = process.env.STORAGE_TYPE || "local";
// const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL || "http://localhost:5000";

// // Folder structure: apartments/excel-uploads/
// const APARTMENT_FOLDER = "events";
// const EXCEL_FOLDER = "excel-uploads";
// const SPACES_KEY_PREFIX = `${APARTMENT_FOLDER}/${EXCEL_FOLDER}`;

// // ─── Ensure Local Directory Exists ────────────────────────────────────────────
// if (STORAGE_TYPE === "local") {
//   const uploadPath = path.join(
//     process.cwd(),
//     process.env.LOCAL_UPLOAD_PATH || "uploads",
//     EXCEL_FOLDER
//   );
//   if (!fs.existsSync(uploadPath)) {
//     fs.mkdirSync(uploadPath, { recursive: true });
//     console.log(`Created local upload directory: ${uploadPath}`);
//   }
// }

// // ─── File Filter (Excel only) ──────────────────────────────────────────────────
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = [".xlsx", ".xls"];
//   const ext = path.extname(file.originalname).toLowerCase();
//   if (!allowedTypes.includes(ext)) {
//     return cb(new Error("Only Excel files (.xlsx, .xls) are allowed"), false);
//   }
//   cb(null, true);
// };

// // ─── Local Storage ─────────────────────────────────────────────────────────────
// const localStorageEngine = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadPath = path.join(
//       process.cwd(),
//       process.env.LOCAL_UPLOAD_PATH || "uploads",
//       EXCEL_FOLDER
//     );
//     if (!fs.existsSync(uploadPath)) {
//       fs.mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: (req, file, cb) => {
//     const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
//     cb(null, `${Date.now()}-${sanitizedName}`);
//   },
// });

// // ─── Spaces Storage ────────────────────────────────────────────────────────────
// // NOTE: multer-s3 v3.x is required for AWS SDK v3 (@aws-sdk/client-s3).
// //       Install: npm install multer-s3@^3.0.0
// //       DO NOT use multer-s3 v2.x — it only works with AWS SDK v2.
// const spacesStorageEngine = multerS3({
//   s3: spacesClient,          // Pass the S3Client instance directly
//   bucket: BUCKET_NAME,
//   // acl: "public-read",     // ← REMOVE if your Space has ACLs disabled (default in new DO Spaces)
//   contentType: multerS3.AUTO_CONTENT_TYPE,
//   metadata: (req, file, cb) => {
//     cb(null, { fieldname: file.fieldname });
//   },
//   key: (req, file, cb) => {
//     // Stores as: apartments/excel-uploads/1234567890-filename.xlsx
//     const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
//     cb(null, `${SPACES_KEY_PREFIX}/${Date.now()}-${sanitizedName}`);
//   },
// });

// // ─── Multer Instance ───────────────────────────────────────────────────────────
// const upload = multer({
//   storage: STORAGE_TYPE === "space" ? spacesStorageEngine : localStorageEngine,
//   fileFilter,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB
//   },
// });

// // ─── Helper: Get File URL ──────────────────────────────────────────────────────
// // Works for both storage types. Always call AFTER multer processes the file.
// const getFileUrl = (req, file) => {
//   if (STORAGE_TYPE === "space") {
//     // multer-s3 v3 attaches `location` automatically (full CDN URL)
//     return file.location;
//   }
//   return `${LOCAL_BASE_URL}/uploads/${EXCEL_FOLDER}/${file.filename}`;
// };

// // ─── Helper: Get File Buffer ───────────────────────────────────────────────────
// // Use this to read the uploaded Excel file contents for parsing.
// const getFileBuffer = async (file) => {
//   if (STORAGE_TYPE === "space") {
//     // Extract the S3 key from the file object (set during upload via key callback)
//     const key = file.key; // multer-s3 attaches `key` to req.file

//     const command = new GetObjectCommand({
//       Bucket: BUCKET_NAME,
//       Key: key,
//     });

//     const response = await spacesClient.send(command);

//     // Stream → Buffer (works with AWS SDK v3)
//     const chunks = [];
//     for await (const chunk of response.Body) {
//       chunks.push(chunk);
//     }
//     return Buffer.concat(chunks);
//   } else {
//     // Local: read from disk path
//     return fs.readFileSync(file.path);
//   }
// };

// module.exports = upload;
// module.exports.getFileUrl = getFileUrl;
// module.exports.getFileBuffer = getFileBuffer;
// module.exports.STORAGE_TYPE = STORAGE_TYPE;
// module.exports.SPACES_KEY_PREFIX = SPACES_KEY_PREFIX;



















const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const fs = require("fs");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const spacesClient = require("../config/spaces");

const BUCKET_NAME = process.env.DO_SPACES_BUCKET || "adinn-space";
const CDN_BASE_URL =
  process.env.DO_SPACES_CDN_BASE ||
  "https://adinn-space.sgp1.digitaloceanspaces.com";
const STORAGE_TYPE = process.env.STORAGE_TYPE || "local";
const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL || "http://localhost:5000";

// Folder structure: apartments/excel-uploads/
const APARTMENT_FOLDER = "events";
const EXCEL_FOLDER = "excel-uploads";
const SPACES_KEY_PREFIX = `${APARTMENT_FOLDER}/${EXCEL_FOLDER}`;

// ─── Ensure Local Directory Exists ────────────────────────────────────────────
if (STORAGE_TYPE === "local") {
  const uploadPath = path.join(
    process.cwd(),
    process.env.LOCAL_UPLOAD_PATH || "uploads",
    EXCEL_FOLDER
  );
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`Created local upload directory: ${uploadPath}`);
  }
}

// ─── File Filter (Excel only) ──────────────────────────────────────────────────
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = [".xlsx", ".xls"];
//   const ext = path.extname(file.originalname).toLowerCase();
//   if (!allowedTypes.includes(ext)) {
//     return cb(new Error("Only Excel files (.xlsx, .xls) are allowed"), false);
//   }
//   cb(null, true);
// };
const fileFilter = (req, file, cb) => {
  cb(null, true);
};
// ─── Local Storage ─────────────────────────────────────────────────────────────
const localStorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(
      process.cwd(),
      process.env.LOCAL_UPLOAD_PATH || "uploads",
      EXCEL_FOLDER
    );
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${Date.now()}-${sanitizedName}`);
  },
});

// ─── Excel MIME Type Map ───────────────────────────────────────────────────────
// AUTO_CONTENT_TYPE sniffs the file bytes and sees a ZIP/XML signature inside
// .xlsx files, returning "application/xml" or "application/zip" instead of the
// correct Excel MIME type. This causes the browser to show the XML tree error.
// We force the correct type based on file extension instead.
// const EXCEL_MIME_TYPES = {
//   ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//   ".xls": "application/vnd.ms-excel",
// };

// const excelContentType = (req, file, cb) => {
//   const ext = path.extname(file.originalname).toLowerCase();
//   const mimeType = EXCEL_MIME_TYPES[ext] ||
//     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
//   cb(null, mimeType);
// };
const getMimeType = (fileName) => {
  const ext = path
    .extname(fileName)
    .toLowerCase();

  const mimeTypes = {


    // Excel
    ".xls":
      "application/vnd.ms-excel",

    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    
  };

  return (
    mimeTypes[ext] ||
    "application/octet-stream"
  );
};
// ─── Spaces Storage ────────────────────────────────────────────────────────────
// NOTE: multer-s3 v3.x is required for AWS SDK v3 (@aws-sdk/client-s3).
//       Install: npm install multer-s3@^3.0.0
//       DO NOT use multer-s3 v2.x — it only works with AWS SDK v2.
const spacesStorageEngine = multerS3({
  s3: spacesClient,
  bucket: BUCKET_NAME,
  acl: "public-read",  // ← Remove if your Space has ACLs disabled (new DO Spaces default)
  contentType: "inline",  // ← Force correct MIME; never use AUTO_CONTENT_TYPE for Excel
   contentType: (req, file, cb) => {
    const mimeType = getMimeType(
      file.originalname
    );

    cb(null, mimeType);
  },
  metadata: (req, file, cb) => {
    cb(null, { fieldname: file.fieldname });
  },
  key: (req, file, cb) => {
    // Stores as: apartments/excel-uploads/1234567890-filename.xlsx
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${SPACES_KEY_PREFIX}/${Date.now()}-${sanitizedName}`);
  },
});

// ─── Multer Instance ───────────────────────────────────────────────────────────
const upload = multer({
  storage: STORAGE_TYPE === "space" ? spacesStorageEngine : localStorageEngine,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 5MB
  },
});

// ─── Helper: Get File URL ──────────────────────────────────────────────────────
// Works for both storage types. Always call AFTER multer processes the file.
const getFileUrl = (req, file) => {
  if (STORAGE_TYPE === "space") {
    // multer-s3 v3 attaches `location` automatically (full CDN URL)
    return file.location;
  }
  return `${LOCAL_BASE_URL}/uploads/${EXCEL_FOLDER}/${file.filename}`;
};

// ─── Helper: Get File Buffer ───────────────────────────────────────────────────
// Use this to read the uploaded Excel file contents for parsing.
const getFileBuffer = async (file) => {
  if (STORAGE_TYPE === "space") {
    // Extract the S3 key from the file object (set during upload via key callback)
    const key = file.key; // multer-s3 attaches `key` to req.file

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await spacesClient.send(command);

    // Stream → Buffer (works with AWS SDK v3)
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } else {
    // Local: read from disk path
    return fs.readFileSync(file.path);
  }
};

module.exports = upload;
module.exports.getFileUrl = getFileUrl;
module.exports.getFileBuffer = getFileBuffer;
module.exports.STORAGE_TYPE = STORAGE_TYPE;
module.exports.SPACES_KEY_PREFIX = SPACES_KEY_PREFIX;
