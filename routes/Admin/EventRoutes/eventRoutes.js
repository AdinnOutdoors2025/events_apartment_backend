// ====================== ROUTE ======================

const express = require("express");
const router = express.Router();
const { saveEventRate,listEventRate} = require("../../../controllers/Admin/EventController/eventRateController");
const protect = require("../../../middleware/authMiddleware");

router.post("/event-save",protect,saveEventRate);
router.post("/event-list",protect,listEventRate);
router.get("/profile", protect, (req, res) => {
  res.json({
    success: true,
    message: "Protected profile data",
    userId: req.user
  });
});
module.exports = router;