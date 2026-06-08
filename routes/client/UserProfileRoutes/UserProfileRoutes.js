const express = require("express");
const router = express.Router();
const protect = require("../../../middleware/authMiddleware");
// const upload = require("../../../middleware/orderNoteFileUpload");
const { createUploader } = require("../../../middleware/dynamicFileUpload");
const { upload, processFile } = createUploader("userProfiles"); // 👈 folder name
const {
  saveOrUpdateUserProfile,
  getUserProfile,
  getAllProfiles,
  checkProfileStatus,
} = require("../../../controllers/client/UserProfileController/UserProfileController");

// Create Profile (First Time Only)
router.post(
  "/profile-save",
  protect,
  upload.fields([{ name: "logoDocument", maxCount: 10 }]),
  (req, res, next) => {
    req.processFile = processFile; // 👈 pass to controller
    next();
  },
  saveOrUpdateUserProfile,
);

// Get Single Profile
router.get("/profile", protect, getUserProfile);

// Get All Profiles
router.post("/profile-list", protect, getAllProfiles);

// Check Profile Completed
router.get("/status/:userId", protect, checkProfileStatus);

module.exports = router;
