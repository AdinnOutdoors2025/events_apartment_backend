const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true },
    userEmail: { type: String },
    userPhone: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    customerType: {
      type: Number,
      enum: [1, 2],
      default: 1, //1 = Brand Owner 2 = Agency
    },
    userType: {
      type: Number,
      required: true,
      default: 3, // 1 - Admin, 2 - Staff Admin, 3 - Client
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("ClientUser", userSchema);
