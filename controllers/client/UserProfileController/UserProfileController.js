// const asyncHandler = require("express-async-handler");
const UserProfile = require("../../../models/client/UserProfile/UserProfileSchema");

function getFileCategory(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType === "application/vnd.ms-excel" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
    return "excel";
  if (
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "word";
  return "other";
}
// Create Profile (Only First Time)
const saveOrUpdateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // 👈 from protect middleware

    const {
      id,
      brandOwnerName,
      companyBrandName,
      email,
      gstNumber,
      industryCategory,
      productServiceDescription,
      logoDocument,
      targetCustomer,
      averageProductPrice,
      campaignGoal,
      profileCompleted,
    } = req.body;

    let profile;

    const processLogoDocument = (uploadedFile) => {
      if (!uploadedFile) return null;

      const {
        getFileUrl,
        STORAGE_TYPE,
      } = require("../../../middleware/orderNoteFileUpload");

      return {
        originalName: uploadedFile.originalname,
        fileName: uploadedFile.filename || uploadedFile.key?.split("/").pop(),
        filePath: getFileUrl(req, uploadedFile),
        mimeType: uploadedFile.mimetype,
        size: uploadedFile.size,
        fileType: getFileCategory(uploadedFile.mimetype),
        uploadedAt: new Date(),
      };
    };

    // Process logo document from uploaded file
    let resolvedLogoDocument = null;
    const uploadedLogoFile = req.files?.logoDocument?.[0];

    if (uploadedLogoFile) {
      resolvedLogoDocument = processLogoDocument(uploadedLogoFile);
    }

    if (id) {
      // ── UPDATE ────────────────────────────────────────
      const updateData = {};
      if (brandOwnerName !== undefined)
        updateData.brandOwnerName = brandOwnerName;
      if (companyBrandName !== undefined)
        updateData.companyBrandName = companyBrandName;
      if (email !== undefined) updateData.email = email;
      if (gstNumber !== undefined) updateData.gstNumber = gstNumber;
      if (industryCategory !== undefined)
        updateData.industryCategory = industryCategory;
      if (productServiceDescription !== undefined)
        updateData.productServiceDescription = productServiceDescription;
      // if (logoDocument !== undefined) updateData.logoDocument = logoDocument;
      if (targetCustomer !== undefined)
        updateData.targetCustomer = targetCustomer;
      if (averageProductPrice !== undefined)
        updateData.averageProductPrice = averageProductPrice;
      if (campaignGoal !== undefined) updateData.campaignGoal = campaignGoal;
      if (profileCompleted !== undefined)
        updateData.profileCompleted = profileCompleted;

      // ✅ Match both _id AND userId to prevent updating another user's profile
      profile = await UserProfile.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true, runValidators: true },
      );

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Profile not found",
        });
      }
    } else {
      // ── CREATE ────────────────────────────────────────
      // ✅ Check if this user already has a profile
      const existingProfile = await UserProfile.findOne({ userId });
      if (existingProfile) {
        return res.status(400).json({
          success: false,
          message: "Profile already exists",
          data: existingProfile, // 👈 return existing so frontend can use the id
        });
      }

      profile = await UserProfile.create({
        userId, // 👈 store userId on the profile
        brandOwnerName,
        companyBrandName,
        email,
        gstNumber,
        industryCategory,
        productServiceDescription,
        logoDocument: resolvedLogoDocument,
        targetCustomer,
        averageProductPrice,
        campaignGoal,
        profileCompleted: profileCompleted ?? 1,
      });
    }

    res.status(200).json({
      success: true,
      message: id
        ? "Profile updated successfully"
        : "Profile created successfully",
      data: profile,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid profile ID format",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to save profile",
      error: error.message,
    });
  }
};
// Get All Profiles
const getAllProfiles = async (req, res) => {
  const profiles = await UserProfile.find()

    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: profiles.length,
    data: profiles,
  });
};
// Get Single Profile
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const profile = await UserProfile.findById(userId.trim()); // trim whitespace

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.log("Error:", error.message); // 👈 check actual error
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid userId format",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
};

// Check Profile Status After Login
const checkProfileStatus = async (req, res) => {
  const { userId } = req.params;

  const profile = await UserProfile.findOne({ userId });

  res.status(200).json({
    success: true,
    profileCompleted: profile?.profileCompleted || false,
  });
};

module.exports = {
  saveOrUpdateUserProfile,
  getUserProfile,
  getAllProfiles,
  checkProfileStatus,
};
