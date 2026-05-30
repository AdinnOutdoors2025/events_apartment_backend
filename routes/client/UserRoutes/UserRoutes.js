const express = require("express");
const router = express.Router();
const {
  registerSendOtp,
  sendOtp,
  loginSendOtp,
  verifyRegisterOtp,
  resendRegisterOtp,
  loginVerifyOtp,
  resendLoginOtp,
  checkUser,
} = require("../../../controllers/client/UserController/UserController");
const protect = require("../../../middleware/authMiddleware");

// Public routes
router.post("/register", registerSendOtp);       // Step 1: Create account
// router.post("/send-otp", sendOtp);        // Step 2: Send OTP to email or phone
router.post("/verify-otp", verifyRegisterOtp);    // Verify OTP only (no token issued)
router.post("/login", loginSendOtp);             // Step 3: Verify OTP → returns JWT token
router.post("/login-verify", loginVerifyOtp);             // Step 3: Verify OTP → returns JWT token

router.post("/resend-otp", resendRegisterOtp);    // Resend a fresh OTP
router.post("/resend-login-otp", resendLoginOtp);    // Resend a fresh login OTP
// router.post("/check-user", checkUser);    // Check if email/phone is registered

module.exports = router;