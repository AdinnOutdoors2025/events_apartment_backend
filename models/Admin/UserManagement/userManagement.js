const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true },
    userEmail: { type: String },
    userPhone: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },

    userType: {
      type: Number,
      default: 2, // 1 - Admin, 2 - Staff Admin, 3 - Client
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("staffAdmin", userSchema);
