require("dotenv").config();
const UserProfile = require("../../../models/client/UserProfile/UserProfileSchema"); 
const User = require("../../../models/client/UserModule/UserSchema");

const generateToken = require("../../../utils/generateToken");
const axios = require("axios");

// ==================== CONFIGURATION ====================

const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY;
const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID;
const NETTYFISH_TEMPLATE_ID_REGISTER =process.env.NETTYFISH_TEMPLATE_ID_REGISTER;
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
  const { userName, userEmail, userPhone,customerType  } = req.body;

  try {
    // ================= VALIDATION =================

    if (!userName || !userPhone) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // ================= CHECK PHONE =================

    const existingPhone = await User.findOne({
      userPhone,
    });

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered",
      });
    }

    // ================= GENERATE OTP =================

    const otp = generateAndStoreOtp(userPhone, {
      userName,
      userEmail,
      userPhone,
       customerType,
    });

    // ================= SMS MESSAGE =================

    const message = `Welcome to ADINN. Your Brand Activation Code is ${otp}. Use it to verify your brand owner account. Valid for 5 minutes.`;

    // ================= SEND SMS =================

    if (IS_PRODUCTION) {
      const smsSent = await sendSms(
        userPhone,
        message,
        NETTYFISH_TEMPLATE_ID_REGISTER,
      );

      if (!smsSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to send OTP",
        });
      }

      return res.json({
        success: true,
        message: "OTP sent to mobile number",
      });
    } else {
      return res.json({
        success: true,
        message: "OTP sent successfully",
        testOtp: otp,
      });
    }
  } catch (err) {
    console.log("Register Send OTP Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const verifyRegisterOtp = async (req, res) => {
  const { userPhone,userEmail, otp } = req.body;

  try {
    // ================= VALIDATION =================

    if (!userPhone || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone number and OTP are required",
      });
    }

    // ================= VERIFY OTP =================

    const otpError = validateOtp(userPhone, otp);

    if (otpError) {
      return res.status(400).json({
        success: false,
        message: otpError,
      });
    }

    // ================= GET STORED DATA =================

    const storedData = otpStore[userPhone];

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: "OTP data not found",
      });
    }

    const { userName, userEmail,customerType  } = storedData.userData;

    // ================= CREATE USER =================

    const newUser = new User({
      userName,
      userEmail,
      userPhone,
      userType: 3,
      customerType
    });

    await newUser.save();

    // ================= DELETE OTP =================

    delete otpStore[userPhone];

    // ================= GENERATE TOKEN =================

    const token = generateToken(newUser);

    return res.json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        _id: newUser._id,
        userName: newUser.userName,
        userEmail: newUser.userEmail,
        userPhone: newUser.userPhone,
        userType: newUser.userType,
        customerType: newUser.customerType,
      },
    });
  } catch (err) {
    console.log("Verify Register OTP Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const resendRegisterOtp = async (req, res) => {
  const { userPhone } = req.body;

  try {
    // ================= VALIDATION =================

    if (!userPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    // ================= CHECK OTP STORE =================

    const storedData = otpStore[userPhone];

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: "No registration request found",
      });
    }

    // ================= GENERATE NEW OTP =================

    const newOtp = generateAndStoreOtp(userPhone, storedData.userData);

    // ================= SMS MESSAGE =================

    const message = `Your new ADINN Campaign Code is ${newOtp}. It is valid for 5 minutes. Please keep it private.`;

    // ================= SEND SMS =================

    if (IS_PRODUCTION) {
      const smsSent = await sendSms(userPhone, message,NETTYFISH_TEMPLATE_ID_RESEND);

      if (!smsSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to resend OTP",
        });
      }

      return res.json({
        success: true,
        message: "OTP resent successfully",
      });
    } else {
      // console.log("==================================");
      // console.log("RESEND OTP:", {
      //   userPhone,
      //   otp: newOtp,
      // });
      // console.log("==================================");

      return res.json({
        success: true,
        message: "OTP resent successfully",
        testOtp: newOtp,
      });
    }
  } catch (err) {
    console.log("Resend OTP Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const loginSendOtp = async (req, res) => {
  const { userPhone } = req.body;

  try {
    if (!userPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    // ================= FIND USER =================

    const user = await User.findOne({
      userPhone,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ================= GENERATE OTP =================

    const otp = generateAndStoreOtp(userPhone, {
      login: true,
    });

    const message = `Your ADINN Campaign Code is ${otp}. Use it to access your campaign dashboard. Valid for 5 minutes. Do not share this code.`;
    // ================= SEND SMS =================

    if (IS_PRODUCTION) {
      const smsSent = await sendSms(
        userPhone,
        message,
        NETTYFISH_TEMPLATE_ID_LOGIN,
      );

      if (!smsSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to send login OTP",
        });
      }

      return res.json({
        success: true,
        message: "Login OTP sent successfully",
      });
    } else {
      // console.log("==================================");
      // console.log("LOGIN OTP:", {
      //   userPhone,
      //   otp,
      // });
      // console.log("==================================");

      return res.json({
        success: true,
        message: "Login OTP sent successfully",
        testOtp: otp,
      });
    }
  } catch (err) {
    console.log("Login Send OTP Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const loginVerifyOtp = async (req, res) => {
  const { userPhone, otp } = req.body;

  try {
    if (!userPhone || !otp) {
      return res.status(400).json({
        success: false,
        message: "Phone and OTP required",
      });
    }

    // ================= VALIDATE OTP =================

    const otpError = validateOtp(userPhone, otp);

    if (otpError) {
      return res.status(400).json({
        success: false,
        message: otpError,
      });
    }

    // ================= FIND USER =================

    const user = await User.findOne({
      userPhone,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ================= DELETE OTP =================

    delete otpStore[userPhone];

    // ================= TOKEN =================

    const token = generateToken(user);
  const profile = await UserProfile.findOne({ userId: user._id });
    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        userName: user.userName,
        userEmail: user.userEmail,
        userPhone: user.userPhone,
        userType: user.userType,
        customerType: user.customerType,
        profileCompleted: profile ? profile.profileCompleted : 1,
      },
    });
  } catch (err) {
    console.log("Login Verify OTP Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const resendLoginOtp = async (req, res) => {
  const { userPhone } = req.body;

  try {
    // ================= VALIDATION =================

    if (!userPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    // ================= CHECK OTP STORE =================

    const storedData = otpStore[userPhone];

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: "No login request found. Please login again",
      });
    }

    // ================= GENERATE NEW OTP =================

    const newOtp = generateAndStoreOtp(userPhone, storedData.userData);

    // ================= SMS MESSAGE =================

    const message = `Your new ADINN Campaign Code is ${newOtp}. It is valid for 5 minutes. Please keep it private.`;

    // ================= SEND SMS =================

    if (IS_PRODUCTION) {
      const smsSent = await sendSms(userPhone, message,NETTYFISH_TEMPLATE_ID_RESEND);

      if (!smsSent) {
        return res.status(500).json({
          success: false,
          message: "Failed to resend login OTP",
        });
      }

      return res.json({
        success: true,
        message: "Login OTP resent successfully",
      });
    } else {
     

      return res.json({
        success: true,
        message: "Login OTP resent successfully",
        testOtp: newOtp,
      });
    }
  } catch (err) {
    console.log("Resend Login OTP Error:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  registerSendOtp,
  verifyRegisterOtp,
  resendRegisterOtp,
  loginSendOtp,
  loginVerifyOtp,
  resendLoginOtp,
};
