// ====================== ROUTE ======================

const express = require("express");
const router = express.Router();
const upload = require("../../../middleware/orderNoteFileUpload");
const { createBooking,listAllBookings,apartmentEventGet} = require("../../../controllers/Admin/EventController/eventOrderController");
const protect = require("../../../middleware/authMiddleware");


router.post("/order-booking-save",protect,upload.fields([{ name: "orderNoteFiles", maxCount: 10 }]),createBooking);
router.post("/order-booking-list",protect,listAllBookings);
router.get("/apartmentEventGet",protect,apartmentEventGet);
router.get("/profile", protect, (req, res) => {
  res.json({
    success: true,
    message: "Protected profile data",
    userId: req.user
  });
});

module.exports = router;