const User = require("../../../models/Admin/UserManagement/userManagement");
const Admin = require("../../../models/Admin/adminUser");
const bcrypt = require("bcryptjs");
const { successResponse, errorResponse } = require('../../../utils/response');
// CREATE USER
const createUser = async (req, res) => {
  try {
    const { userName,phoneNumber,email,password} = req.body;

    // VALIDATION
    if (!userName ||!phoneNumber ||!email ||!password) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required",
      });
    }

    // CHECK EMAIL IN USER
    const emailExists =
      await User.findOne({ email });

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message:
          "Email already exists",
      });
    }

    // CHECK PHONE IN USER
    const userPhoneExists =
      await User.findOne({
        phoneNumber,
      });

    // CHECK PHONE IN ADMIN
    const adminPhoneExists =
      await Admin.findOne({
        phoneNumber,
      });

    // PHONE ALREADY EXISTS
    if (userPhoneExists ||adminPhoneExists) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number already exists",
      });
    }

    // HASH PASSWORD
    const salt =await bcrypt.genSalt(10);

    const hashedPassword =await bcrypt.hash(
        password,
        salt
      );

    // CREATE USER
    const newUser =
      await User.create({
        userName,
        phoneNumber,
        email,
        password: hashedPassword,
        userType: 2,
      });

    return successResponse(
      res,
      "User created successfully",
      newUser,
      201
    );

  } catch (error) {
    return errorResponse(
      res,
      error.message,
      null,
      500
    );
  }
};

module.exports = {createUser};