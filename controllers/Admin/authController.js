const User = require("../../models/Admin/adminUser");
const AdminUser = require("../../models/Admin/UserManagement/userManagement")
const bcrypt = require("bcryptjs");
const generateToken = require("../../utils/generateToken");
const { successResponse, errorResponse } = require('../../utils/response');

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, phoneNumber, password, userType } = req.body;

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
      userType,
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
          userType: user.userType
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

// exports.login = async (req, res) => {
//   try {

//     const { phoneNumber, password } = req.body;

//     // validation
//     if (!phoneNumber || !password) {
//       return errorResponse(
//         res,
//         "Phone number and password are required",
//         null,
//         400
//       );
//     }

//     // check user
//     const user = await User.findOne({
//       phoneNumber
//     });

//     if (!user) {
//       return errorResponse(
//         res,
//         "Invalid phone number",
//         null,
//         400
//       );
//     }

//     // compare password
//     const isMatch = await bcrypt.compare(
//       password,
//       user.password
//     );

//     if (!isMatch) {
//       return errorResponse(
//         res,
//         "Invalid password",
//         null,
//         400
//       );
//     }


//     // generate token
//     const token = generateToken(user);

//     return successResponse(
//       res,
//       "Login successful",
//       {
//         user: {
//           id: user._id,
//           phoneNumber: user.phoneNumber,
//           name: user.name,
//         },
//         token,
//       }
//     );

//   } catch (error) {

//     return errorResponse(
//       res,
//       error.message,
//       null,
//       500
//     );
//   }
// };
exports.login = async (req, res) => {
  try {
    const { phoneNumber, password, } = req.body;

    // VALIDATION
    if (!phoneNumber || !password) {
      return errorResponse(
        res,
        "Phone number and password are required",
        null,
        400
      );
    }

    // CHECK ADMIN USER
    let user = await User.findOne({
      phoneNumber,
    });

    let userRole = "admin";

    // IF NOT ADMIN CHECK NORMAL USER
    if (!user) {
      user =
        await AdminUser.findOne({
          phoneNumber,
        });

      userRole = "user";
    }

    // USER NOT FOUND
    if (!user) {
      return errorResponse(
        res,
        "Invalid phone number",
        null,
        400
      );
    }

    // PASSWORD CHECK
    const isMatch =
      await bcrypt.compare(
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

    // GENERATE TOKEN
    const token =
      generateToken({
        id: user._id,
        userType:
          user.userType,
      });

    return successResponse(
      res,
      "Login successful",
      {
        user: {
          id: user._id,
          phoneNumber:
            user.phoneNumber,
          name:
            user.name ||
            user.userName,
          userType:
            user.userType,
          role: userRole,
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
