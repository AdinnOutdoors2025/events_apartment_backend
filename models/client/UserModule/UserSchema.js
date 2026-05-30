const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true },
    userEmail: { type: String },
    userPhone: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },

    userType: {
      type: Number,
      required: true,
      default: 3,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("ClientUser", userSchema);
