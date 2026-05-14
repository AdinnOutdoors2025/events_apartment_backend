const User = require("../../models/Admin/adminUser");
const bcrypt = require("bcryptjs");
const generateToken = require("../../utils/generateToken");
const { successResponse, errorResponse } = require('../../utils/response');

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, phoneNumber, password } = req.body;

    // validation
    if (!name || !phoneNumber || !password) {
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
      name,
      password: hashedPassword,
    });

    // response
    const token =
      generateToken(user._id);

    return successResponse(
      res,
      "User registered successfully",
      {
        user: {
          id: user._id,
          phoneNumber:
            user.phoneNumber,
          name: user.name,
        },
        token,
      }
    );

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

    const { phoneNumber, password } = req.body;

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


    // generate token
    const token = generateToken(user);

    return successResponse(
      res,
      "Login successful",
      {
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          name: user.name,
        },
        token,
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
