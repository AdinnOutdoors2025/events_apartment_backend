const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = require("../../../middleware/excelUploadMiddleware");
const {
  uploadExcel,
  listApartments,
  getUploadSessions,
  getApartmentById,
  createOrUpdateParticularApartment,
  updateApartmentStatus,
} = require("../../../controllers/Admin/ApartmentController/apartmentController");
const protect = require("../../../middleware/authMiddleware");
const { successResponse, errorResponse } = require("../../../utils/response");
const uploadExcelMiddleware = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    console.log("req.file =>", req.file);
    console.log("req.body =>", req.body);

    if (err) {
      console.log("Upload Error =>", err);
      return errorResponse(res, err.message, null, 400);
    }

    next();
  });
};
router.post("/apartment-save", protect, createOrUpdateParticularApartment);
router.post("/excel-upload", protect, uploadExcelMiddleware, uploadExcel);
router.post("/excel-recent-upload", protect, getUploadSessions); // list of all files uploaded
router.post("/apartment-list", protect, listApartments); // all apartments (common)
router.get("/apartment-get", protect, getApartmentById);
router.post("/active-inactive-apartment", protect, updateApartmentStatus);
module.exports = router;
