const UserProfile = require("../../../models/client/UserProfile/UserProfileSchema");

const saveOrUpdateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      id,
      brandOwnerName,
      companyBrandName,
      email,
      gstNumber,
      industryCategory,
      productServiceDescription,
      targetCustomer,
      averageProductPrice,
      campaignGoal,
      profileCompleted,
    } = req.body;

       // ─────────────────────────────────────────────────────
    // PROCESS LOGO FILE
    // ─────────────────────────────────────────────────────
    const uploadedLogoFile = req.files?.logoDocument?.[0];

    const resolvedLogoDocument = uploadedLogoFile
      ? req.processFile(uploadedLogoFile)   // 👈 uses folder from route
      : undefined;
    
    let profile;

    // UPDATE
    if (id) {
      const updateData = {};

      if (brandOwnerName !== undefined)
        updateData.brandOwnerName = brandOwnerName;

      if (companyBrandName !== undefined)
        updateData.companyBrandName = companyBrandName;

      if (email !== undefined)
        updateData.email = email;

      if (gstNumber !== undefined)
        updateData.gstNumber = gstNumber;

      if (industryCategory !== undefined)
        updateData.industryCategory = industryCategory;

      if (productServiceDescription !== undefined)
        updateData.productServiceDescription =
          productServiceDescription;

      if (targetCustomer !== undefined)
        updateData.targetCustomer = targetCustomer;

      if (averageProductPrice !== undefined)
        updateData.averageProductPrice = averageProductPrice;

      if (campaignGoal !== undefined)
        updateData.campaignGoal = campaignGoal;

      if (profileCompleted !== undefined)
        updateData.profileCompleted = Number(profileCompleted);

      if (resolvedLogoDocument)
        updateData.logoDocument = resolvedLogoDocument;

      profile = await UserProfile.findOneAndUpdate(
        {
          _id: id,
          userId,
        },
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "Profile not found",
        });
      }
    } else {
      // CREATE
      const existingProfile = await UserProfile.findOne({
        userId,
      });

      if (existingProfile) {
        return res.status(400).json({
          success: false,
          message: "Profile already exists",
          data: existingProfile,
        });
      }

      profile = await UserProfile.create({
        userId,
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
        profileCompleted:
          profileCompleted !== undefined
            ? Number(profileCompleted)
            : 0,
      });
    }

    return res.status(200).json({
      success: true,
      message: id
        ? "Profile updated successfully"
        : "Profile created successfully",
      data: profile,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
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
