// routes/dashboardRoutes.js

const express = require("express");
const router = express.Router();
const protect = require("../../../middleware/authMiddleware");
const {
  getDashboard,
} = require("../../../controllers/Admin/DashboardController/DashboardController");

router.post("/getDashboard",protect, getDashboard);

module.exports = router;
