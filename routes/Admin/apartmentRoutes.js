const express = require("express");
const router = express.Router();
const upload = require("../../middleware/uploadMiddleware");
const { uploadExcel, listApartments, getUploadSessions, getApartmentsBySession } = require("../../controllers/Admin/apartmentController");
const protect = require("../../middleware/authMiddleware");


router.post("/upload", protect, upload.single("file"), uploadExcel);
router.post("/recent-upload", protect, getUploadSessions);       // list of all files uploaded
router.post("/get-list", protect, getApartmentsBySession); // pass { sessionId, pageNumber, count }
router.post("/list", protect, listApartments);            // all apartments (common)
module.exports = router;