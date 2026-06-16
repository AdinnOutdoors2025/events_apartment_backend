const User = require("../../../models/Admin/StaffAdminManagement/staffAdminManagement");
const Admin = require("../../../models/Admin/adminUser");
const bcrypt = require("bcryptjs");
const { successResponse, errorResponse } = require("../../../utils/response");
const generateToken = require("../../../utils/generateToken");
const axios = require("axios");

const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY;
const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID;
const NETTYFISH_TEMPLATE_ID_REGISTER =
  process.env.NETTYFISH_TEMPLATE_ID_REGISTER;
const NETTYFISH_TEMPLATE_ID_LOGIN = process.env.NETTYFISH_TEMPLATE_ID_LOGIN;
const NETTYFISH_TEMPLATE_ID_RESEND = process.env.NETTYFISH_TEMPLATE_ID_RESEND;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const otpStore = {};
async function sendSms(userPhone, message, templateId) {
  try {
    // Format mobile number
    const mobileNumber = userPhone.toString().replace(/\D/g, "");
    const formattedNumber =
      mobileNumber.length === 10 ? `91${mobileNumber}` : mobileNumber;

    // Validation
    if (!formattedNumber) {
      console.log("Invalid mobile number:", userPhone);
      return false;
    }

    if (!message) {
      console.log("Message is required");
      return false;
    }

    // Use provided template ID or fallback to environment variable
    const tid = templateId;
    // console.log("Using Template ID:", tid);
    if (!tid) {
      console.log("No template ID found in environment variables");
      return false;
    }

    // Build API URL
    const apiUrl = `https://retailsms.nettyfish.com/api/mt/SendSMS?APIKey=${NETTYFISH_API_KEY}&senderid=${NETTYFISH_SENDER_ID}&channel=Trans&DCS=0&flashsms=0&number=${formattedNumber}&dlttemplateid=${tid}&text=${encodeURIComponent(message)}&route=17`;

    // console.log("Sending SMS to:", formattedNumber);
    // console.log("Using Template ID:", tid);

    // API Call
    const response = await axios.get(apiUrl, {
      timeout: 10000, // 10 second timeout
    });

    // console.log("SMS API Response:", JSON.stringify(response.data));

    // Success Check
    if (
      typeof response.data === "object" &&
      response.data.ErrorCode === "000"
    ) {
      // console.log("SMS sent successfully to:", formattedNumber);
      return true;
    }

    if (
      typeof response.data === "string" &&
      response.data.includes("Message Accepted")
    ) {
      console.log("SMS accepted successfully");
      return true;
    }

    console.log("SMS failed - Response:", response.data);
    return false;
  } catch (err) {
    console.log("SMS SEND ERROR - Full details:", {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      phone: userPhone,
    });
    return false;
  }
}

function generateAndStoreOtp(key, userData) {
  const otp = Math.floor(1000 + Math.random() * 9000);

  otpStore[key] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
    userData,
  };

  return otp;
}

function validateOtp(key, otp) {
  const stored = otpStore[key];

  if (!stored) {
    return "No OTP found";
  }

  if (Date.now() > stored.expiresAt) {
    delete otpStore[key];
    return "OTP expired";
  }

  if (stored.otp.toString() !== otp.toString()) {
    return "Invalid OTP";
  }

  return null;
}

const registerSendOtp = async (req, res) => {
  const { userName, userEmail, userPhone, categoryType } = req.body;

  try {
    // ================= VALIDATION =================

    if (!userName) {
      return errorResponse(res, "User name is required", null, 400);
    }

    if (!userPhone) {
      return errorResponse(res, "Mobile number is required", null, 400);
    }
    const normalizedPhone = String(userPhone).trim();
    // ================= CHECK PHONE =================

    const existingPhone = await User.findOne({
      userPhone: normalizedPhone,
    });

    if (existingPhone) {
      return errorResponse(
        res,
        "This mobile number is already registered. Please log in.",
        null,
        400,
      );
    }

    // ================= GENERATE OTP =================

    const otp = generateAndStoreOtp(normalizedPhone, {
      userName,
      userEmail,
      userPhone: normalizedPhone,
      categoryType,
    });

    // ================= SMS MESSAGE =================

    const message = `Welcome to ADINN. Your Brand Activation Code is ${otp}. Use it to verify your brand owner account. Valid for 5 minutes.`;

    // ================= SEND SMS =================

    if (IS_PRODUCTION) {
      const smsSent = await sendSms(
        normalizedPhone,
        message,
        NETTYFISH_TEMPLATE_ID_REGISTER,
      );

      if (!smsSent) {
        // Clean up OTP if SMS fails
        delete otpStore[normalizedPhone];
        return errorResponse(
          res,
          "Unable to send OTP. Please try again.",
          null,
          500,
        );
      }

      return successResponse(res, "OTP sent successfully", null, 200);
    }
    return successResponse(
      res,
      "OTP sent successfully",
      {
        testOtp: otp,
      },
      200,
    );
  } catch (err) {
    return errorResponse(res, "Server error", null, 500);
  }
};

const verifyRegisterOtp = async (req, res) => {
  const { userPhone, userEmail, otp, categoryType } = req.body;

  try {
    // ================= VALIDATION =================

    if (!userPhone || !otp) {
      return errorResponse(res, "Phone number and OTP are required", null, 400);
    }

    // ================= VERIFY OTP =================

    const otpError = validateOtp(userPhone, otp);

    if (otpError) {
      return errorResponse(res, otpError, null, 400);
    }

    // ================= GET STORED DATA =================

    const storedData = otpStore[userPhone];

    if (!storedData) {
      return errorResponse(res, "OTP data not found", null, 400);
    }

    const { userName, userEmail, categoryType } = storedData.userData;

    // ================= CREATE USER =================

    const newUser = new User({
      userName,
      userEmail,
      userPhone,
      categoryType,
      userType: 2, // Staff Admin
    });

    await newUser.save();

    // ================= DELETE OTP =================

    delete otpStore[userPhone];

    // ================= GENERATE TOKEN =================

    const token = generateToken(newUser);

    return successResponse(res, "Registration successful", {
      token,
      user: {
        _id: newUser._id,
        userName: newUser.userName,
        userEmail: newUser.userEmail,
        userPhone: newUser.userPhone,
        categoryType: newUser.categoryType,
        userType: newUser.userType,
      },
    });
  } catch (err) {
    console.log("Verify Register OTP Error:", err);

    return errorResponse(res, "Server error", null, 400);
  }
};

const resendRegisterOtp = async (req, res) => {
  const { userPhone } = req.body;

  try {
    // ================= VALIDATION =================

    if (!userPhone) {
      return errorResponse(res, "Phone number is required", null, 400);
    }
    const normalizedPhone = String(userPhone).trim();

    // ================= CHECK IF USER ALREADY EXISTS =================
    const existingUser = await User.findOne({
      userPhone: normalizedPhone,
    });

    if (existingUser) {
      return errorResponse(
        res,
        "This mobile number is already registered. Please log in instead.",
        null,
        400,
      );
    }
    // ================= CHECK OTP STORE =================

    const storedData = otpStore[userPhone];

    if (!storedData) {
      return errorResponse(
        res,
        "No active registration request found. Please start the registration process again.",
        null,
        400,
      );
    }
    // Check if userData exists and has required fields
    if (!storedData.userData || !storedData.userData.userName) {
      // Clean up invalid entry
      delete otpStore[normalizedPhone];
      return errorResponse(
        res,
        "Invalid registration data. Please start over.",
        null,
        400,
      );
    }

    // ================= GENERATE NEW OTP =================
    // Preserve the existing userData
    const userData = storedData.userData;
    // ================= GENERATE NEW OTP =================

    const newOtp = generateAndStoreOtp(normalizedPhone, storedData.userData);

    // ================= SMS MESSAGE =================

    const message = `Your new ADINN Campaign Code is ${newOtp}. It is valid for 5 minutes. Please keep it private.`;

    // ================= SEND SMS =================

    if (IS_PRODUCTION) {
      const smsSent = await sendSms(
        normalizedPhone,
        message,
        NETTYFISH_TEMPLATE_ID_RESEND,
      );

      if (!smsSent) {
        return errorResponse(res, "Failed to resend OTP", null, 500);
      }

      return successResponse(res, "OTP resent successfully", 200);
    } else {
      // console.log("==================================");
      // console.log("RESEND OTP:", {
      //   userPhone,
      //   otp: newOtp,
      // });
      // console.log("==================================");

      return successResponse(
        res,
        "OTP resent successfully",
        {
          userPhone: normalizedPhone,
          testOtp: newOtp,
        },
        200,
      );
    }
  } catch (err) {
    console.log("Resend OTP Error:", err);

    return errorResponse(res, "Server error", null, 500);
  }
};

const loginSendOtp = async (req, res) => {
  const { userPhone } = req.body;

  try {
    if (!userPhone) {
      return errorResponse(res, "Phone number is required", null, 400);
    }
    const normalizedPhone = String(userPhone).trim();
    // ================= FIND USER =================

    const user = await User.findOne({
      userPhone,
    });

    if (!user) {
      return errorResponse(res, "User not found", null, 404);
    }

    // ================= GENERATE OTP =================

    const otp = generateAndStoreOtp(normalizedPhone, {
      userId: user._id,
      login: true,
      userPhone: normalizedPhone,
    });

    const message = `Your ADINN Campaign Code is ${otp}. Use it to access your campaign dashboard. Valid for 5 minutes. Do not share this code.`;
    // ================= SEND SMS =================

    if (IS_PRODUCTION) {
      const smsSent = await sendSms(
        normalizedPhone,
        message,
        NETTYFISH_TEMPLATE_ID_LOGIN,
      );

      if (!smsSent) {
        return errorResponse(res, "Failed to send login OTP", null, 500);
      }

      return successResponse(res, "Login OTP sent successfully", 200);
    } else {
      // console.log("==================================");
      // console.log("LOGIN OTP:", {
      //   userPhone,
      //   otp,
      // });
      // console.log("==================================");

      return successResponse(
        res,
        "Login OTP sent successfully",
        {
          userPhone: normalizedPhone,
          testOtp: otp,
        },
        200,
      );
    }
  } catch (err) {
    console.log("Login Send OTP Error:", err);

    return errorResponse(res, "Server error", null, 500);
  }
};

const loginVerifyOtp = async (req, res) => {
  const { userPhone, otp } = req.body;

  try {
    if (!userPhone || !otp) {
      return errorResponse(res, "Phone and OTP required", null, 400);
    }

    // ================= VALIDATE OTP =================

    const otpError = validateOtp(userPhone, otp);

    if (otpError) {
      return errorResponse(res, otpError, null, 400);
    }

    // ================= FIND USER =================

    const user = await User.findOne({
      userPhone,
    });

    if (!user) {
      return errorResponse(res, "User not found", null, 404);
    }
    user.lastLogin = new Date();
    await user.save();
    // ================= DELETE OTP =================

    delete otpStore[userPhone];

    // ================= TOKEN =================

    const token = generateToken(user);
    return successResponse(res, "Login successful", {
      token,
      user: {
        _id: user._id,
        userName: user.userName,
        userEmail: user.userEmail,
        userPhone: user.userPhone,
        userType: user.userType,
      },
    });
  } catch (err) {
    console.log("Login Verify OTP Error:", err);

    return errorResponse(res, "Server error", null, 500);
  }
};

const resendLoginOtp = async (req, res) => {
  const { userPhone } = req.body;

  try {
    // ================= VALIDATION =================

    if (!userPhone) {
      return errorResponse(res, "Phone number is required", null, 400);
    }

    const normalizedPhone = String(userPhone).trim();

    // ================= VERIFY USER EXISTS =================

    const user = await User.findOne({
      userPhone: normalizedPhone,
    });

    if (!user) {
      return errorResponse(
        res,
        "User not found. Please register first.",
        null,
        404,
      );
    }

    // ================= CHECK OTP STORE =================

    let newOtp;

    // ================= CHECK OTP STORE =================

    const storedData = otpStore[normalizedPhone];

    if (!storedData) {
      // Create new OTP session
      newOtp = generateAndStoreOtp(normalizedPhone, {
        userId: user._id,
        login: true,
        userPhone: normalizedPhone,
      });
    } else {
      // Regenerate OTP using existing session data
      newOtp = generateAndStoreOtp(normalizedPhone, storedData.userData);
    }

    // ================= SMS MESSAGE =================

    const message = `Your new ADINN Campaign Code is ${newOtp}. It is valid for 5 minutes. Please keep it private.`;

    // ================= SEND SMS =================

    if (IS_PRODUCTION) {
      const smsSent = await sendSms(
        normalizedPhone,
        message,
        NETTYFISH_TEMPLATE_ID_RESEND,
      );

      if (!smsSent) {
        return errorResponse(res, "Failed to resend login OTP", null, 500);
      }

      return successResponse(res, "Login OTP resent successfully", 200);
    } else {
      return successResponse(res, "Login OTP resent successfully", {
        userPhone: normalizedPhone,
        testOtp: newOtp,
      });
    }
  } catch (err) {
    console.log("Resend Login OTP Error:", err);

    return errorResponse(res, "Server error", null, 500);
  }
};
// const listUsers = async (req, res) => {
//   try {
//     // ================= FETCH ALL USERS =================
//     const users = await User.find({}).select('-__v');

//     // ================= CHECK IF USERS EXIST =================
//     if (!users || users.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No users found"
//       });
//     }

//     // ================= RETURN ALL USERS WITH DETAILS =================
//     return res.status(200).json({
//       success: true,
//       message: "Users retrieved successfully",
//       data: users
//     });

//   } catch (err) {
//     console.error("List Users Error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error while fetching users",
//       error: err.message
//     });
//   }
// };
// const listUsers = async (req, res) => {
//   try {
//     const [users, admins] = await Promise.all([
//       User.find({}).select("-__v").lean(),
//       Admin.find({}).select("-__v -password").lean(),
//     ]);

//     const formattedUsers = users.map((user) => ({
//       ...user,
//       userCategory: "StaffAdmin",
//     }));

//     const formattedAdmins = admins.map((admin) => ({
//       ...admin,
//       userCategory: "Admin",
//     }));

//     const allUsers = [...formattedAdmins, ...formattedUsers];

//     if (allUsers.length === 0) {
//       return errorResponse(res, "No users found", null, 404);
//     }

//     return successResponse(res, "Users retrieved successfully", {
//       count: allUsers.length,
//       users: allUsers,
//     });
//   } catch (err) {
//     console.error("List Users Error:", err);
//     return errorResponse(res, "Server error while fetching users", null, 500);
//   }
// };
const listUsers = async (req, res) => {
  try {
    const [users, admins] = await Promise.all([
      User.find({}).select("-__v").lean(),
      Admin.find({}).select("-__v -password").lean(),
    ]);

    const staffAdmins = users.map((user) => ({
      ...user,
      userCategory: "StaffAdmin",
    }));

    const adminUsers = admins.map((admin) => ({
      ...admin,
      userCategory: "Admin",
    }));

    return successResponse(res, "Users retrieved successfully", {
      totalCount: adminUsers.length + staffAdmins.length,
      adminCount: adminUsers.length,
      staffAdminCount: staffAdmins.length,
      admins: adminUsers,
      staffAdmins: staffAdmins,
    });
  } catch (err) {
    console.error("List Users Error:", err);
    return errorResponse(res, "Server error while fetching users", null, 500);
  }
};
module.exports = {
  registerSendOtp,
  verifyRegisterOtp,
  resendRegisterOtp,
  loginSendOtp,
  loginVerifyOtp,
  resendLoginOtp,
  listUsers,
};
