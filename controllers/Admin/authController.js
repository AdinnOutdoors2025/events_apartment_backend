const User = require("../../models/Admin/adminUser");
const bcrypt = require("bcryptjs");
const generateToken = require("../../utils/generateToken");
const { successResponse, errorResponse } = require('../../utils/response');

// REGISTER
exports.register = async (req, res) => {
  try {
    const { phoneNumber, password,role } = req.body;

    // validation
    if (!phoneNumber || !password) {
       return errorResponse(res, 'Name, phone and password are required', 400);
    }

    // check existing user
    const existingUser = await User.findOne({
      phoneNumber
    });

    if (existingUser) {
     return errorResponse(res, 'Phone number already exists', 400);
    }

    // hash password
    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    // create user
    const user = await User.create({
      phoneNumber,
      password: hashedPassword,
      role
    });

    // response
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token: generateToken(user._id),
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        role:user.role
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// LOGIN

exports.login = async (req, res) => {
  try {

    const { phoneNumber, password, role } = req.body;

    // validation
    if (!phoneNumber || !password) {
      return errorResponse(
        res,
        "Phone number and password are required",
        null,
        400
      );
    }

    // check user
    const user = await User.findOne({
      phoneNumber
    });

    if (!user) {
      return errorResponse(
        res,
        "Invalid phone number",
        null,
        400
      );
    }

    // compare password
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return errorResponse(
        res,
        "Invalid password",
        null,
        400
      );
    }

    // role check
    if (role !== undefined && user.role !== role) {
      return errorResponse(
        res,
        "Access denied",
        null,
        403
      );
    }

    // generate token
    const token = generateToken(user);

    return successResponse(
      res,
      "Login successful",
      {
        role: user.role,
        token
      }
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
