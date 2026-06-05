// ====================== ROUTE ======================

const express = require("express");
const router = express.Router();
const upload = require("../../../middleware/orderNoteFileUpload");
const {
  createBooking,
  listAllBookings,
  apartmentEventGet,
  updateOrderStatusOnly,
  getOrderDetails,
  sendOrderMail,
  assignBookingUser,
} = require("../../../controllers/Admin/OrderController/eventOrderController");
const protect = require("../../../middleware/authMiddleware");

router.post(
  "/order-booking-save",
  protect,
  upload.fields([{ name: "orderNoteFiles", maxCount: 10 }]),
  createBooking,
);
router.post("/order-booking-list", protect, listAllBookings);
router.get("/apartmentEventGet", protect, apartmentEventGet);

// router.put("/order-status/:orderId", protect, updateOrderStatusOnly);
router.put(
  "/order-status",
  protect,
  upload.fields([
    { name: "poDocument", maxCount: 1 },
    { name: "statusDocument", maxCount: 10 },
    { name: "voiceDocument", maxCount: 10 },
  ]),
  updateOrderStatusOnly,
);
router.get("/order-details", protect, getOrderDetails);
router.get("/send-order-mail", protect, sendOrderMail);
router.post("/assign-booking-user", protect, assignBookingUser);

module.exports = router;
