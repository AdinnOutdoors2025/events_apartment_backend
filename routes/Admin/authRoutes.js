const express = require("express");
const { register,login } = require("../../controllers/Admin/authController");
const protect = require("../../middleware/authMiddleware");
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", protect, (req, res) => {
  res.json({
    success: true,
    message: "Protected profile data",
    userId: req.user
  });
});

module.exports = router;