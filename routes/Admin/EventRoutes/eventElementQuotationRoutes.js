const express = require("express");
const router = express.Router();
const { createQuotation,listQuotation} = require("../../../controllers/Admin/EventController/eventElementsQuotationController");
const protect = require("../../../middleware/authMiddleware");

router.post("/event-quotationItems-save",protect,createQuotation);
router.post("/event-quotationItems-list",protect,listQuotation);
router.get("/profile", protect, (req, res) => {
  res.json({
    success: true,
    message: "Protected profile data",
    userId: req.user
    
  });
});
module.exports = router;