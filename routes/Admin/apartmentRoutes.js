const express = require("express");
const router = express.Router();
const upload = require("../../middleware/uploadMiddleware");
const { uploadExcel,getApartments,} = require("../../controllers/Admin/apartmentController");
const protect = require("../../middleware/authMiddleware");

router.post("/upload",protect,upload.single("file"),uploadExcel);
router.post("/list",protect, getApartments);

module.exports = router;