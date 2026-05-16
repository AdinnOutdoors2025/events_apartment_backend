// ====================== ROUTE ======================

const express = require("express");
const router = express.Router();
const { createBooking,getAllBookings,apartmentEventGet} = require("../../../controllers/Admin/EventController/eventOrderController");
const protect = require("../../../middleware/authMiddleware");

router.post("/order-booking-save",protect,createBooking);
router.post("/order-booking-list",protect,getAllBookings);
router.get("/apartmentEventGet",protect,apartmentEventGet);
router.get("/profile", protect, (req, res) => {
  res.json({
    success: true,
    message: "Protected profile data",
    userId: req.user
  });
});

module.exports = router;