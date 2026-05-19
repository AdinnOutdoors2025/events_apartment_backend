const express = require("express");
const router = express.Router();
const { createUser } = require("../../../controllers/Admin/UserController/userManagementController");
const protect = require("../../../middleware/authMiddleware");
const adminOnly = require("../../../middleware/AdminOnlyAccess")
router.post("/save", protect,adminOnly, createUser);
router.get("/profile", protect, (req, res) => {
    res.json({
        success: true,
        message: "Protected profile data",
        userId: req.user
    });
});

module.exports = router;