const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
  {
    brandOwnerName: {
      type: String,
      trim: true,
      default: "",
    },

    companyBrandName: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      default: "",
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
    logoDocument: {
      originalName: { type: String },
      fileName: { type: String },
      filePath: { type: String },
      mimeType: { type: String },
      size: { type: Number },
      fileType: {
        type: String,
        enum: ["image"],
      },
      uploadedAt: { type: Date, default: Date.now },
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
      enum: [0, 1, 2],
      default: 1, //0 = Skip 1 = Incomplete, 2 = Completed,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // 👈 one profile per user at DB level
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("UserProfile", userProfileSchema);
