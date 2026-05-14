const express = require("express");
const router = express.Router();
const upload = require("../../middleware/uploadMiddleware");
const { uploadExcel, getApartments,getUploadSessions,getApartmentsBySession } = require("../../controllers/Admin/apartmentController");
const protect = require("../../middleware/authMiddleware");

// router.post("/upload",protect,upload.single("file"),uploadExcel);
// router.post("/list",protect, getApartments);

router.post("/upload",protect, upload.single("file"), uploadExcel);
router.post("/recent-upload",protect, getUploadSessions);       // list of all files uploaded
router.get("/get",protect, getApartmentsBySession); // pass { sessionId, pageNumber, count }
router.post("/list",protect, getApartments);            // all apartments (common)
module.exports = router;