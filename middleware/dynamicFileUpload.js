const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const fs = require("fs");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const spacesClient = require("../config/spaces");

// ─────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────
const BUCKET_NAME   = process.env.DO_SPACES_BUCKET    || "adinn-space";
const CDN_BASE_URL =  process.env.DO_SPACES_CDN_BASE || "https://adinn-space.sgp1.cdn..digitaloceanspaces.com";
const STORAGE_TYPE  = process.env.STORAGE_TYPE        || "local";
const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL     || "http://localhost:5000";
const LOCAL_UPLOAD_PATH = process.env.LOCAL_UPLOAD_PATH || "uploads";
const APARTMENT_FOLDER = "events";  // base folder for spaces

// ─────────────────────────────────────────────────────────────
// MIME TYPE
// ─────────────────────────────────────────────────────────────
const getMimeType = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    ".jpg"  : "image/jpeg",
    ".jpeg" : "image/jpeg",
    ".png"  : "image/png",
    ".gif"  : "image/gif",
    ".webp" : "image/webp",
    ".svg"  : "image/svg+xml",
    ".mp3"  : "audio/mpeg",
    ".wav"  : "audio/wav",
    ".ogg"  : "audio/ogg",
    ".aac"  : "audio/aac",
    ".m4a"  : "audio/mp4",
    ".pdf"  : "application/pdf",
    ".xls"  : "application/vnd.ms-excel",
    ".xlsx" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".doc"  : "application/msword",
    ".docx" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt"  : "text/plain",
  };
  return mimeTypes[ext] || "application/octet-stream";
};

// ─────────────────────────────────────────────────────────────
// FILE CATEGORY
// ─────────────────────────────────────────────────────────────
const getFileCategory = (mimeType) => {
  if (mimeType.startsWith("image/"))  return "image";
  if (mimeType.startsWith("audio/"))  return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "excel";
  if (mimeType.includes("word")  || mimeType.includes("document"))    return "word";
  return "other";
};

// ─────────────────────────────────────────────────────────────
// FACTORY — createUploader("folderName")
// ─────────────────────────────────────────────────────────────
const createUploader = (folderName) => {

  const SPACES_KEY_PREFIX = `${APARTMENT_FOLDER}/${folderName}`;  // 👈 dynamic spaces path
  const LOCAL_FOLDER_PATH = path.join(process.cwd(), LOCAL_UPLOAD_PATH, folderName); // 👈 dynamic local path

  // ── Ensure local folder exists ──────────────────────────
  if (STORAGE_TYPE === "local") {
    if (!fs.existsSync(LOCAL_FOLDER_PATH)) {
      fs.mkdirSync(LOCAL_FOLDER_PATH, { recursive: true });
      console.log(`Created upload folder: ${LOCAL_FOLDER_PATH}`);
    }
  }

  // ── File filter (allow all) ──────────────────────────────
  const fileFilter = (req, file, cb) => {
    cb(null, true);
  };

  // ── Local storage engine ─────────────────────────────────
  const localStorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(LOCAL_FOLDER_PATH)) {
        fs.mkdirSync(LOCAL_FOLDER_PATH, { recursive: true });
      }
      cb(null, LOCAL_FOLDER_PATH);    // 👈 saves to uploads/folderName/
    },
    filename: (req, file, cb) => {
      const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      cb(null, `${Date.now()}-${sanitized}`);
    },
  });

  // ── Spaces storage engine ────────────────────────────────
  const spacesStorageEngine = multerS3({
    s3: spacesClient,
    bucket: BUCKET_NAME,
    acl: "public-read",
    contentDisposition: "inline",
    contentType: (req, file, cb) => {
      cb(null, getMimeType(file.originalname));
    },
    metadata: (req, file, cb) => {
      cb(null, { fieldname: file.fieldname });
    },
    key: (req, file, cb) => {
      const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      cb(null, `${SPACES_KEY_PREFIX}/${Date.now()}-${sanitized}`);  // 👈 events/folderName/file
    },
  });

  // ── Multer instance ──────────────────────────────────────
  const upload = multer({
    storage: STORAGE_TYPE === "space" ? spacesStorageEngine : localStorageEngine,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  });

  // ── Get file URL ─────────────────────────────────────────
  const getFileUrl = (file) => {
    if (STORAGE_TYPE === "space") {
       return `${CDN_BASE_URL}/${file.key}`; // spaces returns full URL
    }
    return `${LOCAL_BASE_URL}/public/${folderName}/${file.filename}`;  // 👈 dynamic URL
  };

  // ── Get file buffer ──────────────────────────────────────
  const getFileBuffer = async (file) => {
    if (STORAGE_TYPE === "space") {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: file.key,
      });
      const response = await spacesClient.send(command);
      const chunks = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }
    return fs.readFileSync(file.path);
  };

  // ── Process file → schema shape ──────────────────────────
  const processFile = (file) => {
    if (!file) return null;
    return {
      originalName : file.originalname,
      fileName     : file.filename || file.key?.split("/").pop(),
      filePath     : getFileUrl(file),              // 👈 correct folder URL
      mimeType     : file.mimetype,
      size         : file.size,
      fileType     : getFileCategory(file.mimetype),
      uploadedAt   : new Date(),
    };
  };

  return {
    upload,         // multer middleware
    getFileUrl,     // get URL of file
    getFileBuffer,  // get buffer of file
    processFile,    // convert file → schema object
    SPACES_KEY_PREFIX,
    STORAGE_TYPE,
  };
};

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────
module.exports = {
  createUploader,
  getFileCategory,
  getMimeType,
  CDN_BASE_URL,
};