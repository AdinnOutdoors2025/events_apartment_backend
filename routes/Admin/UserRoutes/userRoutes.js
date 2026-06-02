const express = require("express");
const router = express.Router();
const {  registerSendOtp,
   verifyRegisterOtp,
  resendRegisterOtp,
  loginSendOtp,
  loginVerifyOtp,
  resendLoginOtp, } = require("../../../controllers/Admin/UserController/userManagementController");
const protect = require("../../../middleware/authMiddleware");
const adminOnly = require("../../../middleware/AdminOnlyAccess")

router.post("/staff-register",protect,adminOnly, registerSendOtp);       // Step 1: Create account
router.post("/staff-verify-otp",protect,adminOnly, verifyRegisterOtp);    // Verify OTP only (no token issued)
router.post("/staff-resend-otp",protect,adminOnly, resendRegisterOtp);    // Resend a fresh OTP
router.post("/staff-login", loginSendOtp);             // Step 3: Verify OTP → returns JWT token
router.post("/staff-login-verify", loginVerifyOtp);             // Step 3: Verify OTP → returns JWT token
router.post("/staff-resend-login-otp", resendLoginOtp); 




module.exports = router;