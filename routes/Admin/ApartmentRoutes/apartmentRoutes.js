const express = require("express");
const router = express.Router();
const upload = require("../../../middleware/excelUploadMiddleware");
const { uploadExcel, listApartments, getUploadSessions,getApartmentById,createOrUpdateParticularApartment,updateApartmentStatus } = require("../../../controllers/Admin/ApartmentController/apartmentController");
const protect = require("../../../middleware/authMiddleware");


router.post("/apartment-save", protect, createOrUpdateParticularApartment);
router.post("/excel-upload", protect, upload.single("file"), uploadExcel);
router.post("/excel-recent-upload", protect, getUploadSessions);       // list of all files uploaded
router.post("/apartment-list", protect, listApartments);            // all apartments (common)
router.get("/apartment-get", protect, getApartmentById);      
router.post("/update-apartment-status", protect, updateApartmentStatus);      
module.exports = router;