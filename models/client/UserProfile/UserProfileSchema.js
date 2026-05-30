const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
  {
   
    brandOwnerName: {
      type: String,
      required: true,
      trim: true,
    },

    companyBrandName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    gstNumber: {
      type: String,
      default: "",
      trim: true,
    },

    industryCategory: {
      type: String,
      default: "",
      trim: true,
    },

    productServiceDescription: {
      type: String,
      default: "",
      trim: true,
    },

    logo: {
      type: String,
      default: "",
    },

    targetCustomer: {
      type: String,
      default: "",
      trim: true,
    },

    averageProductPrice: {
      type: Number,
      default: 0,
    },

    campaignGoal: {
      type: String,
      default: "",
      trim: true,
    },

    profileCompleted: {
      type: Number,
      enum: [0,1, 2],
      default: 1, //0 = Skip 1 = Incomplete, 2 = Completed, 
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("UserProfile", userProfileSchema);