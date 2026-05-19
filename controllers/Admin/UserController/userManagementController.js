const User = require("../../../models/Admin/UserManagement/userManagement");
const bcrypt = require("bcryptjs");

// CREATE USER
const createUser = async (req, res) => {
  try {
    const {
      userName,
      phoneNumber,
      email,
      password,
    } = req.body;

    // VALIDATION
    if (
      !userName ||
      !phoneNumber ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required",
      });
    }

    // CHECK EMAIL
    const emailExists =
      await User.findOne({ email });

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message:
          "Email already exists",
      });
    }

    // CHECK PHONE
    const phoneExists =
      await User.findOne({
        phoneNumber,
      });

    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number already exists",
      });
    }

    // HASH PASSWORD
    const salt =
      await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(
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
        userType: 2, // STATIC
      });

    return res.status(201).json({
      success: true,
      message:
        "User created successfully",
      data: newUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};

module.exports = {
  createUser,
};