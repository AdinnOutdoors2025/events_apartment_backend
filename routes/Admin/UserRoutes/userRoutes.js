const express = require("express");
const router = express.Router();
const { createUser } = require("../../../controllers/Admin/UserController/userManagementController");
const protect = require("../../../middleware/authMiddleware");
const adminOnly = require("../../../middleware/AdminOnlyAccess")
router.post("/staff-admin", protect,adminOnly, createUser);


module.exports = router;