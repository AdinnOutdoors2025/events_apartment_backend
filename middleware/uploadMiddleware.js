// const multer = require("multer");
// const fs = require("fs");

// if (!fs.existsSync("uploads")) {
//   fs.mkdirSync("uploads");
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "uploads/");
//   },

//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });

// const upload = multer({ storage });

// module.exports = upload;



// middleware/uploadMiddleware.js

const multer = require("multer");
const fs = require("fs");
const path = require("path");

const uploadPath = "uploads";

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [".xlsx", ".xls"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedTypes.includes(ext)) {
    return cb(new Error("Only Excel files are allowed"));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
});

module.exports = upload;