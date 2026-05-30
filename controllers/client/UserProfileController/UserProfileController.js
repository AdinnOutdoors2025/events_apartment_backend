// const asyncHandler = require("express-async-handler");
const UserProfile = require("../../../models/client/UserProfile/UserProfileSchema");


// Create Profile (Only First Time)
const saveOrUpdateUserProfile = async (req, res) => {
  try {
    const {
      id,                        // if _id is sent → UPDATE, else → CREATE
      brandOwnerName,
      companyBrandName,
      email,
      gstNumber,
      industryCategory,
      productServiceDescription,
      logo,
      targetCustomer,
      averageProductPrice,
      campaignGoal,
      profileCompleted,
    } = req.body;

    let profile;

    if (id) {
      // ── UPDATE ──────────────────────────────────────────
      const updateData = {};
      if (brandOwnerName !== undefined)            updateData.brandOwnerName = brandOwnerName;
      if (companyBrandName !== undefined)          updateData.companyBrandName = companyBrandName;
      if (email !== undefined)                     updateData.email = email;
      if (gstNumber !== undefined)                 updateData.gstNumber = gstNumber;
      if (industryCategory !== undefined)          updateData.industryCategory = industryCategory;
      if (productServiceDescription !== undefined) updateData.productServiceDescription = productServiceDescription;
      if (logo !== undefined)                      updateData.logo = logo;
      if (targetCustomer !== undefined)            updateData.targetCustomer = targetCustomer;
      if (averageProductPrice !== undefined)       updateData.averageProductPrice = averageProductPrice;
      if (campaignGoal !== undefined)              updateData.campaignGoal = campaignGoal;
      if (profileCompleted !== undefined)          updateData.profileCompleted = 2;

      profile = await UserProfile.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Profile not found",
        });
      }

    } else {
      // ── CREATE ──────────────────────────────────────────
      const existingProfile = await UserProfile.findOne({ email });
      if (existingProfile) {
        return res.status(400).json({
          success: false,
          message: "Profile already exists for this email",
        });
      }

      profile = await UserProfile.create({
        brandOwnerName,
        companyBrandName,
        email,
        gstNumber,
        industryCategory,
        productServiceDescription,
        logo,
        targetCustomer,
        averageProductPrice,
        campaignGoal,
        profileCompleted: 2 ?? 1,
      });
    }

    res.status(200).json({
      success: true,
      message: id ? "Profile updated successfully" : "Profile created successfully",
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
  const { userId } = req.query;

  const profile = await UserProfile.findOne({ _id });

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