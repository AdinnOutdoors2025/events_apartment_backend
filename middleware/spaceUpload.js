// const multer = require("multer");
// const multerS3 = require("multer-s3");
// const path = require("path");
// const fs = require("fs");
// const spacesClient = require("../config/spaces");

// const BUCKET_NAME = process.env.DO_SPACES_BUCKET || "adinn-space";
// const CDN_BASE_URL = process.env.DO_SPACES_CDN_BASE || "https://adinn-space.sgp1.digitaloceanspaces.com";
// const STORAGE_TYPE = process.env.STORAGE_TYPE || "local";
// const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL || "http://localhost:5000";
// const EXCEL_FOLDER = "excel-uploads";

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
//     if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
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
// const getFileUrl = (req, file) => {
//   if (STORAGE_TYPE === "space") {
//     return file.location; // multer-s3 attaches full CDN URL automatically
//   }
//   return `${LOCAL_BASE_URL}/uploads/${EXCEL_FOLDER}/${file.filename}`;
// };

// module.exports = upload;
// module.exports.getFileUrl = getFileUrl;
// module.exports.STORAGE_TYPE = STORAGE_TYPE;







const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const fs = require("fs");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const spacesClient = require("../config/spaces");

// ─────────────────────────────────────────────────────────────
// ENV CONFIG
// ─────────────────────────────────────────────────────────────
const BUCKET_NAME =
  process.env.DO_SPACES_BUCKET || "adinn-space";

const CDN_BASE_URL =
  process.env.DO_SPACES_CDN_BASE ||
  "https://adinn-space.sgp1.digitaloceanspaces.com";

const STORAGE_TYPE =
  process.env.STORAGE_TYPE || "local";

const LOCAL_BASE_URL =
  process.env.LOCAL_BASE_URL || "http://localhost:5000";

const LOCAL_UPLOAD_PATH =
  process.env.LOCAL_UPLOAD_PATH || "uploads";

const EXCEL_FOLDER = "excel-uploads";

// ─────────────────────────────────────────────────────────────
// ENSURE LOCAL DIRECTORY EXISTS
// ─────────────────────────────────────────────────────────────
if (STORAGE_TYPE === "local") {
  const uploadPath = path.join(
    process.cwd(),
    LOCAL_UPLOAD_PATH,
    EXCEL_FOLDER
  );

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });

    console.log(
      `Created local upload directory: ${uploadPath}`
    );
  }
}

// ─────────────────────────────────────────────────────────────
// FILE FILTER (ONLY EXCEL FILES)
// ─────────────────────────────────────────────────────────────
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = [".xlsx", ".xls"];

//   const ext = path
//     .extname(file.originalname)
//     .toLowerCase();

//   if (!allowedTypes.includes(ext)) {
//     return cb(
//       new Error(
//         "Only Excel files (.xlsx, .xls) are allowed"
//       ),
//       false
//     );
//   }

//   cb(null, true);
// };
const fileFilter = (req, file, cb) => {
  cb(null, true);
};
// ─────────────────────────────────────────────────────────────
// LOCAL STORAGE ENGINE
// ─────────────────────────────────────────────────────────────
const localStorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(
      process.cwd(),
      LOCAL_UPLOAD_PATH,
      EXCEL_FOLDER
    );

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, {
        recursive: true,
      });
    }

    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(
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
// GET MIME TYPE
// ─────────────────────────────────────────────────────────────
const getMimeType = (fileName) => {
  const ext = path
    .extname(fileName)
    .toLowerCase();

  const mimeTypes = {
   

    // Excel
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  };

  return (
    mimeTypes[ext] ||
    "application/octet-stream"
  );
};

// ─────────────────────────────────────────────────────────────
// DIGITALOCEAN SPACES STORAGE ENGINE
// ─────────────────────────────────────────────────────────────
const spacesStorageEngine = multerS3({
  s3: spacesClient,

  bucket: BUCKET_NAME,

  // REMOVE THIS IF ACL IS DISABLED
  acl: "public-read",
contentDisposition: "inline",
  // IMPORTANT FIX
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
    const sanitizedName = file.originalname.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    );

    cb(
      null,
      `${EXCEL_FOLDER}/${Date.now()}-${sanitizedName}`
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
    fileSize: 5 * 1024 * 1024,
  },
});

// ─────────────────────────────────────────────────────────────
// GET FILE URL
// ─────────────────────────────────────────────────────────────
const getFileUrl = (file) => {
  if (STORAGE_TYPE === "space") {
    return file.location;
  }

  return `${LOCAL_BASE_URL}/${LOCAL_UPLOAD_PATH}/${EXCEL_FOLDER}/${file.filename}`;
};

// ─────────────────────────────────────────────────────────────
// GET FILE BUFFER
// ─────────────────────────────────────────────────────────────
const getFileBuffer = async (file) => {
  if (STORAGE_TYPE === "space") {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: file.key,
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
module.exports = {
  upload,
  getFileUrl,
  getFileBuffer,
  STORAGE_TYPE,
  BUCKET_NAME,
  CDN_BASE_URL,
};