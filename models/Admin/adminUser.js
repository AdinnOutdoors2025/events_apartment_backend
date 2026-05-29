const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^(\+91)?[0-9]{10}$/, 'Enter a valid phone number']
    },
    password: {
      type: String,
      required: true
    },
    userType: {
      type: Number,
      required: true,
      default: 1    // 1 - Admin  2 - Staff Admin  3 - Client
    },
    // role: {
    //   type: Number,
    //   enum: [0, 1, 2],  // 0 - Client  1 - Admin  2 - SuperAdmin
    //   default: 0
    // }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("AdminUser", userSchema);