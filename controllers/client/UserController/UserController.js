// require("dotenv").config();
// const User = require("../../../models/client/UserModule/UserSchema");
// const generateToken = require("../../../utils/generateToken");
// const axios = require("axios");
// const nodemailer = require("nodemailer");

// // ==================== CONFIGURATION ====================
// const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY;
// const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID;
// const NETTYFISH_TEMPLATE_ID = process.env.NETTYFISH_TEMPLATE_ID;
// const IS_PRODUCTION = process.env.NODE_ENV === "production";
// const emailID = process.env.EMAIL_ID;
// const emailPwd = process.env.EMAIL_PASSWORD;

// // ==================== OTP STORE ====================
// // NOTE: In-memory store. Use Redis in production.
// const otpStore = {};

// // ==================== HELPERS ====================

// // async function sendSms(userPhone, message, templateId) {
// //   const mobileNumber = userPhone.replace(/\D/g, "");
// //   const formattedNumber = mobileNumber.length === 10 ? `91${mobileNumber}` : mobileNumber;
// //   const tid = templateId || NETTYFISH_TEMPLATE_ID;

// //   const apiUrl =
// //     `https://retailsms.nettyfish.com/api/mt/SendSMS` +
// //     `?APIKey=${NETTYFISH_API_KEY}` +
// //     `&senderid=${NETTYFISH_SENDER_ID}` +
// //     `&channel=Trans&DCS=0&flashsms=0` +
// //     `&number=${formattedNumber}` +
// //     `&dlttemplateid=${tid}` +
// //     `&text=${encodeURIComponent(message)}` +
// //     `&route=17`;

// //   try {
// //     const response = await axios.get(apiUrl);
// //     const data = response.data;
// //     if (typeof data === "object" && data.ErrorCode === "000") return true;
// //     if (typeof data === "string" && data.includes("Message Accepted")) return true;
// //     // console.error("Nettyfish unexpected response:", data);
// //     return false;
// //   } catch (err) {
// //     // console.error("Nettyfish SMS error:", err.message);
// //     return false;
// //   }
// // }

// // function sendPhpMail(payload) {
// //   axios
// //     .post("https://adinndigital.com/api/index.php", payload, {
// //       headers: { "Content-Type": "application/json" },
// //     })
// //     .then((res) => console.log("PHP mail API responded:", res.data))
// //     .catch((err) => console.error("PHP mail API error:", err.message));
// // }

// // function createMailTransporter() {
// //   return nodemailer.createTransport({
// //     service: "gmail",
// //     auth: { user: emailID, pass: emailPwd },
// //   });
// // }

// // function generateAndStoreOtp(key, userName) {
// //   const otp = Math.floor(1000 + Math.random() * 9000);
// //   otpStore[key] = {
// //     otp,
// //     expiresAt: Date.now() + 5 * 60 * 1000,
// //     userName: userName || "User",
// //   };
// //   return otp;
// // }

// // function validateOtp(key, otp) {
// //   const stored = otpStore[key];
// //   if (!stored) return "No OTP found. Please request a new OTP.";
// //   if (Date.now() > stored.expiresAt) {
// //     delete otpStore[key];
// //     return "OTP has expired. Please request a new OTP.";
// //   }
// //   if (otp.toString() !== stored.otp.toString()) return "Invalid OTP. Please try again.";
// //   return null;
// // }
// async function sendSms(userPhone, message, templateId) {
//   const mobileNumber = userPhone.replace(/\D/g, "");
//   const formattedNumber =
//     mobileNumber.length === 10
//       ? `91${mobileNumber}`
//       : mobileNumber;

//   const tid = templateId || NETTYFISH_TEMPLATE_ID;

//   const apiUrl =
//     `https://retailsms.nettyfish.com/api/mt/SendSMS` +
//     `?APIKey=${NETTYFISH_API_KEY}` +
//     `&senderid=${NETTYFISH_SENDER_ID}` +
//     `&channel=Trans&DCS=0&flashsms=0` +
//     `&number=${formattedNumber}` +
//     `&dlttemplateid=${tid}` +
//     `&text=${encodeURIComponent(message)}` +
//     `&route=17`;

//   try {
//     const response = await axios.get(apiUrl);
//     const data = response.data;

//     if (
//       (typeof data === "object" && data.ErrorCode === "000") ||
//       (typeof data === "string" &&
//         data.includes("Message Accepted"))
//     ) {
//       return true;
//     }

//     return false;
//   } catch (err) {
//     console.log(err.message);
//     return false;
//   }
// }

// function generateAndStoreOtp(key, userData) {
//   const otp = Math.floor(1000 + Math.random() * 9000);

//   otpStore[key] = {
//     otp,
//     expiresAt: Date.now() + 5 * 60 * 1000,
//     userData,
//   };

//   return otp;
// }

// function validateOtp(key, otp) {
//   const stored = otpStore[key];

//   if (!stored) {
//     return "No OTP found";
//   }

//   if (Date.now() > stored.expiresAt) {
//     delete otpStore[key];
//     return "OTP expired";
//   }

//   if (stored.otp.toString() !== otp.toString()) {
//     return "Invalid OTP";
//   }

//   return null;
// }


// // const register = async (req, res) => {
// //   const { userName, userEmail, userPhone } = req.body;

// //   try {
// //     if (!userName || !userEmail || !userPhone) {
// //       return res.status(400).json({ success: false, message: "All fields are required" });
// //     }

// //     const existingEmail = await User.findOne({ userEmail });
// //     if (existingEmail) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Email already registered. Try logging in or use a different email.",
// //       });
// //     }

// //     const existingPhone = await User.findOne({ userPhone });
// //     if (existingPhone) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Phone number already registered. Try logging in or use a different phone number.",
// //       });
// //     }

// //     // userType 3 = standard client user
// //     const newUser = new User({ userName, userEmail, userPhone, userType: 3 });
// //     await newUser.save();

// //     // Welcome SMS - Only in production
// //     if (IS_PRODUCTION) {
// //       const welcomeMessage = "Thank you for registering with Adinn Outdoors. We're glad to have you on board!";
// //       const ok = await sendSms(userPhone, welcomeMessage, "1007653370910160293");
// //       if (ok) console.log("Welcome SMS sent to", userPhone);
// //     } else {
// //       console.log("=========================================");
// //       console.log("WELCOME SMS (Dev - Not Sent):", { userName, userEmail, userPhone });
// //       console.log("=========================================");
// //     }

// //     // Welcome Emails - Only in production
// //     if (IS_PRODUCTION) {
// //       const transporter = createMailTransporter();

// //       // Send welcome email to user
// //       transporter.sendMail({
// //         from: emailID,
// //         to: userEmail,
// //         subject: "Welcome to Adinn - Registration Successful",
// //         html: `
// //           <div style="font-family:Montserrat;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:5px;width:max-content;">
// //             <center><img src="https://www.adinnoutdoors.com/wp-content/uploads/2024/04/adinn-outdoor-final-logo.png" alt="Adinn Logo" style="height:auto;width:auto;" /></center>
// //             <h1 style="color:#333;">Hi ${userName}, Welcome to Adinn Outdoors!</h1>
// //             <p style="font-size:17px;color:black;">You have successfully registered. We're glad to have you on board!</p>
// //             <h2 style="color:#333;margin-top:20px;">Your Registration Details</h2>
// //             <ul style="font-size:17px;">
// //               <li><strong>Name:</strong> ${userName}</li>
// //               <li><strong>Email:</strong> ${userEmail}</li>
// //               <li><strong>Phone:</strong> <a href="tel:${userPhone}">${userPhone}</a></li>
// //             </ul>
// //           </div>`,
// //       }, (err) => { if (err) console.error("Error sending welcome email:", err); });

// //       // Send notification email to admin
// //       transporter.sendMail({
// //         from: emailID,
// //         to: emailID,
// //         subject: "New User Registration on Adinn Site",
// //         html: `
// //           <div style="font-family:Montserrat;padding:20px;border:1px solid #ddd;border-radius:5px;">
// //             <h2 style="color:#333;">New User Registration</h2>
// //             <ul>
// //               <li><strong>Name:</strong> ${userName}</li>
// //               <li><strong>Email:</strong> ${userEmail}</li>
// //               <li><strong>Phone:</strong> ${userPhone}</li>
// //               <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
// //             </ul>
// //           </div>`,
// //       }, (err) => { if (err) console.error("Error sending admin email:", err); });

// //       // Send PHP mail notification
// //       sendPhpMail({ mailtype: "register", userName, userEmail, userPhone });
      
// //       console.log("All registration emails sent to:", userEmail);
// //     } else {
// //       // Development mode - just log what would be sent
// //       console.log("=========================================");
// //       console.log("REGISTRATION EMAILS (Dev - Not Sent)");
// //       console.log("Welcome email would be sent to:", userEmail);
// //       console.log("Admin notification would be sent to:", emailID);
// //       console.log("PHP mail would be triggered with:", { mailtype: "register", userName, userEmail, userPhone });
// //       console.log("User Details:", { userName, userEmail, userPhone });
// //       console.log("=========================================");
// //     }

// //     return res.json({
// //       success: true,
// //       message: "Registration successful! Please login with OTP.",
// //       user: {
// //         _id: newUser._id,
// //         userName: newUser.userName,
// //         userEmail: newUser.userEmail,
// //         userPhone: newUser.userPhone,
// //       },
// //     });
// //   } catch (err) {
// //     console.error("Register error:", err);
// //     return res.status(500).json({ success: false, message: "Server error" });
// //   }
// // };
// // ==================== SEND OTP (for login) ====================

// const sendOtp = async (req, res) => {
//   const { userEmail, userPhone, userName } = req.body;

//   if (!userEmail && !userPhone) {
//     return res.status(400).json({ success: false, message: "Email or userPhone is required" });
//   }

//   try {
//     let existingUser = null;
//     if (userEmail) {
//       existingUser = await User.findOne({ userEmail });
//       if (!existingUser) {
//         return res.status(404).json({ success: false, message: "No account found with this email" });
//       }
//     } else {
//       existingUser = await User.findOne({ userPhone: userPhone });
//       if (!existingUser) {
//         return res.status(404).json({ success: false, message: "No account found with this userPhone number" });
//       }
//     }

//     const otpKey = userEmail || userPhone;
//     const recipientName = existingUser.userName || userName || "User";
//     const otp = generateAndStoreOtp(otpKey, recipientName);

//     if (userEmail) {
//       if (!IS_PRODUCTION) {
//         // DEVELOPMENT: Only log to console
//         // console.log("=========================================");
//         // console.log("EMAIL OTP (Dev):", { userEmail, otp });
//         // console.log("=========================================");
//         return res.json({ 
//           success: true, 
//           message: "OTP sent to email (development mode - check console)", 
//           testOtp: otp 
//         });
//       } else {
//         // PRODUCTION: Send actual email
//         sendPhpMail({ mailtype: "login", userName: recipientName, userEmail, otp: otp.toString(), userPhone: userPhone || "" });
//         return res.json({ success: true, message: "OTP sent to email" });
//       }
//     }

//     if (IS_PRODUCTION) {
//       const message = `Welcome to Adinn Outdoors! Your login OTP is ${otp}. Valid for 5 minutes. Do not share it.`;
//       const ok = await sendSms(userPhone, message);
//       if (!ok) return res.status(500).json({ success: false, message: "Failed to send OTP via SMS" });
//       return res.json({ success: true, message: "OTP sent to userPhone" });
//     } else {
//     //   console.log("=========================================");
//     //   console.log("SMS OTP (Dev):", { userPhone, otp, user: recipientName });
//     //   console.log("=========================================");
//       return res.json({ success: true, message: "OTP sent (check console)", testOtp: otp });
//     }
//   } catch (err) {
//     // console.error("Send OTP error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };
// const register = async (req, res) => {
//   const { userName, userEmail, userPhone } = req.body;

//   try {
//     if (!userName || !userEmail || !userPhone) {
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required",
//       });
//     }

//     // Check email
//     const existingEmail = await User.findOne({ userEmail });

//     if (existingEmail) {
//       return res.status(400).json({
//         success: false,
//         message: "Email already exists",
//       });
//     }

//     // Check phone
//     const existingPhone = await User.findOne({ userPhone });

//     if (existingPhone) {
//       return res.status(400).json({
//         success: false,
//         message: "Phone number already exists",
//       });
//     }

//     // Generate OTP
//     const otp = generateAndStoreOtp(userPhone, {
//       userName,
//       userEmail,
//       userPhone,
//     });

//     // Send SMS
//     const message = `Your Adinn Outdoors registration OTP is ${otp}. Valid for 5 minutes.`;

//     if (IS_PRODUCTION) {
//       const smsSent = await sendSms(userPhone, message);

//       if (!smsSent) {
//         return res.status(500).json({
//           success: false,
//           message: "Failed to send OTP",
//         });
//       }

//       return res.json({
//         success: true,
//         message: "OTP sent to mobile number",
//       });
//     } else {
//       console.log("REGISTER OTP:", otp);

//       return res.json({
//         success: true,
//         message: "OTP sent successfully",
//         testOtp: otp,
//       });
//     }
//   } catch (err) {
//     console.log(err);

//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

// // ==================== VERIFY REGISTER OTP ====================

// const verifyRegisterOtp = async (req, res) => {
//   const { userPhone, otp } = req.body;

//   try {
//     if (!userPhone || !otp) {
//       return res.status(400).json({
//         success: false,
//         message: "Phone and OTP required",
//       });
//     }

//     const otpError = validateOtp(userPhone, otp);

//     if (otpError) {
//       return res.status(400).json({
//         success: false,
//         message: otpError,
//       });
//     }

//     const storedData = otpStore[userPhone];

//     if (!storedData) {
//       return res.status(400).json({
//         success: false,
//         message: "OTP data not found",
//       });
//     }

//     const { userName, userEmail } =
//       storedData.userData;

//     // Create user after OTP verification
//     const newUser = new User({
//       userName,
//       userEmail,
//       userPhone,
//       userType: 3,
//     });

//     await newUser.save();

//     delete otpStore[userPhone];

//     const token = generateToken(newUser);

//     return res.json({
//       success: true,
//       message: "Registration successful",
//       token,
//       user: {
//         _id: newUser._id,
//         userName: newUser.userName,
//         userEmail: newUser.userEmail,
//         userPhone: newUser.userPhone,
//         userType: newUser.userType,
//       },
//     });
//   } catch (err) {
//     console.log(err);

//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };
// // ==================== LOGIN (verify OTP + issue token) ====================
// const login = async (req, res) => {
//   const { userEmail, userPhone, otp } = req.body;

//   if ((!userEmail && !userPhone) || !otp) {
//     return res.status(400).json({ success: false, message: "Email/userPhone and OTP are required" });
//   }

//   const otpKey = userEmail || userPhone;
//   const otpError = validateOtp(otpKey, otp);
//   if (otpError) return res.status(400).json({ success: false, message: otpError });

//   delete otpStore[otpKey];

//   try {
//     const user = userEmail
//       ? await User.findOne({ userEmail })
//       : await User.findOne({ userPhone: userPhone });

//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     const token = generateToken(user);

//     return res.json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: {
//         _id: user._id,
//         userName: user.userName,
//         userEmail: user.userEmail,
//         userPhone: user.userPhone,
//         userType: user.userType,
//         createdAt: user.createdAt,
//       },
//     });
//   } catch (err) {
//     // console.error("Login error:", err);
//     return res.status(500).json({ success: false, message: "Server error during login" });
//   }
// };

// // ==================== VERIFY OTP (without login) ====================
// // const verifyOtp = async (req, res) => {
// //   const { userEmail, userPhone, otp } = req.body;

// //   if ((!userEmail && !userPhone) || !otp) {
// //     return res.status(400).json({ success: false, message: "Email/userPhone and OTP are required" });
// //   }

// //   const otpKey = userEmail || userPhone;
// //   const otpError = validateOtp(otpKey, otp);
// //   if (otpError) return res.status(400).json({ success: false, message: otpError });

// //   delete otpStore[otpKey];

// //   try {
// //     const user = userEmail
// //       ? await User.findOne({ userEmail })
// //       : await User.findOne({ userPhone: userPhone });

// //     if (!user) {
// //       return res.status(404).json({ success: false, message: "User not found" });
// //     }

// //     return res.json({
// //       success: true,
// //       verified: true,
// //       message: "OTP verified successfully",
// //       user: {
// //         _id: user._id,
// //         userName: user.userName,
// //         userEmail: user.userEmail,
// //         userPhone: user.userPhone,
// //         userType: user.userType,
// //       },
// //     });
// //   } catch (err) {
// //     // console.error("Verify OTP error:", err);
// //     return res.status(500).json({ success: false, message: "Server error" });
// //   }
// // };

// // ==================== RESEND OTP ====================
// const resendOtp = async (req, res) => {
//   const { userEmail, userPhone } = req.body;

//   if (!userEmail && !userPhone) {
//     return res.status(400).json({ success: false, message: "Email or userPhone is required" });
//   }

//   try {
//     let existingUser = null;
//     if (userEmail) {
//       existingUser = await User.findOne({ userEmail });
//       if (!existingUser) {
//         return res.status(404).json({ success: false, message: "No account found with this email" });
//       }
//     } else {
//       existingUser = await User.findOne({ userPhone: userPhone });
//       if (!existingUser) {
//         return res.status(404).json({ success: false, message: "No account found with this userPhone number" });
//       }
//     }

//     const otpKey = userEmail || userPhone;
//     const recipientName = existingUser.userName || "User";
//     const newOtp = generateAndStoreOtp(otpKey, recipientName);

//     if (userEmail) {
//       if (!IS_PRODUCTION) {
//         return res.json({ 
//           success: true, 
//           message: "OTP resent to email (development mode - check console)", 
//           testOtp: newOtp 
//         });
//       } else {
//         // PRODUCTION: Send actual email
//         sendPhpMail({ mailtype: "login", userName: recipientName, userEmail, otp: newOtp.toString(), userPhone: userPhone || "" });
//         return res.json({ success: true, message: "OTP resent to email" });
//       }
//     }

//     if (IS_PRODUCTION) {
//       const message = `Welcome to Adinn Outdoors! Your login OTP is ${newOtp}. Valid for 5 minutes. Do not share it.`;
//       const ok = await sendSms(userPhone, message);
//       if (!ok) return res.status(500).json({ success: false, message: "Failed to resend OTP via SMS" });
//       return res.json({ success: true, message: "OTP resent to userPhone" });
//     } else {
//     //   console.log("=========================================");
//     //   console.log("RESEND SMS OTP (Dev):", { userPhone, otp: newOtp });
//     //   console.log("=========================================");
//       return res.json({ success: true, message: "OTP resent (check console)", testOtp: newOtp });
//     }
//   } catch (err) {
//     // console.error("Resend OTP error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// // ==================== CHECK USER ====================
// const checkUser = async (req, res) => {
//   const { userEmail, userPhone } = req.body;

//   if (!userEmail && !userPhone) {
//     return res.status(400).json({ success: false, message: "Email or userPhone is required" });
//   }

//   try {
//     const user = userEmail
//       ? await User.findOne({ userEmail })
//       : await User.findOne({ userPhone });

//     if (user) {
//       return res.json({
//         success: true,
//         exists: true,
//         message: "User exists",
//         user: { _id: user._id, userName: user.userName, userEmail: user.userEmail, userPhone: user.userPhone },
//       });
//     }

//     return res.json({ success: true, exists: false, message: "User does not exist" });
//   } catch (err) {
//     // console.error("Check user error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// module.exports = { register, sendOtp, login, verifyRegisterOtp, resendOtp, checkUser };



require("dotenv").config();

const User = require("../../../models/client/UserModule/UserSchema");
const generateToken = require("../../../utils/generateToken");
const axios = require("axios");

// ==================== CONFIGURATION ====================

const NETTYFISH_API_KEY = process.env.NETTYFISH_API_KEY;
const NETTYFISH_SENDER_ID = process.env.NETTYFISH_SENDER_ID;
const NETTYFISH_TEMPLATE_ID = process.env.NETTYFISH_TEMPLATE_ID;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ==================== OTP STORE ====================
// NOTE: Use Redis in production

const otpStore = {};

// ==================== HELPERS ====================

// async function sendSms(userPhone, message, templateId) {
//   const mobileNumber = userPhone.replace(/\D/g, "");

//   const formattedNumber =
//     mobileNumber.length === 10
//       ? `91${mobileNumber}`
//       : mobileNumber;

//   const tid = templateId || NETTYFISH_TEMPLATE_ID;

//   const apiUrl =
//     `https://retailsms.nettyfish.com/api/mt/SendSMS` +
//     `?APIKey=${NETTYFISH_API_KEY}` +
//     `&senderid=${NETTYFISH_SENDER_ID}` +
//     `&channel=Trans&DCS=0&flashsms=0` +
//     `&number=${formattedNumber}` +
//     `&dlttemplateid=${tid}` +
//     `&text=${encodeURIComponent(message)}` +
//     `&route=17`;

//   try {
//     const response = await axios.get(apiUrl);

//     const data = response.data;

//     if (
//       (typeof data === "object" &&
//         data.ErrorCode === "000") ||
//       (typeof data === "string" &&
//         data.includes("Message Accepted"))
//     ) {
//       return true;
//     }

//     return false;
//   } catch (err) {
//     console.log("SMS Error:", err.message);
//     return false;
//   }
// }
async function sendSms(userPhone, message, templateId = null) {
  try {
    // Format mobile number
    const mobileNumber = userPhone.toString().replace(/\D/g, "");
    const formattedNumber = mobileNumber.length === 10 ? `91${mobileNumber}` : mobileNumber;

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
    const tid = templateId || NETTYFISH_TEMPLATE_ID;
    console.log("Using Template ID:", tid);
    if (!tid) {
      console.log("No template ID found in environment variables");
      return false;
    }

    // Build API URL
    const apiUrl = `https://retailsms.nettyfish.com/api/mt/SendSMS?APIKey=${NETTYFISH_API_KEY}&senderid=${NETTYFISH_SENDER_ID}&channel=Trans&DCS=0&flashsms=0&number=${formattedNumber}&dlttemplateid=${tid}&text=${encodeURIComponent(message)}&route=17`;

    console.log("Sending SMS to:", formattedNumber);
    console.log("Using Template ID:", tid);
    
    // API Call
    const response = await axios.get(apiUrl, {
      timeout: 10000, // 10 second timeout
    });

    console.log("SMS API Response:", JSON.stringify(response.data));

    // Success Check
    if (typeof response.data === "object" && response.data.ErrorCode === "000") {
      console.log("SMS sent successfully to:", formattedNumber);
      return true;
    }

    if (typeof response.data === "string" && response.data.includes("Message Accepted")) {
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
      phone: userPhone
    });
    return false;
  }
}
// ==================== GENERATE OTP ====================

function generateAndStoreOtp(key, userData) {
  const otp = Math.floor(
    1000 + Math.random() * 9000
  );

  otpStore[key] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
    userData,
  };

  return otp;
}

// ==================== VALIDATE OTP ====================

function validateOtp(key, otp) {
  const stored = otpStore[key];

  if (!stored) {
    return "No OTP found";
  }

  if (Date.now() > stored.expiresAt) {
    delete otpStore[key];
    return "OTP expired";
  }

  if (
    stored.otp.toString() !== otp.toString()
  ) {
    return "Invalid OTP";
  }

  return null;
}

// ======================================================
// ==================== REGISTER SEND OTP ===============
// ======================================================

const registerSendOtp = async (req, res) => {
  const {
    userName,
    userEmail,
    userPhone,
  } = req.body;

  try {
    // ================= VALIDATION =================

    if (
      !userName ||
      !userEmail ||
      !userPhone
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // ================= CHECK EMAIL =================

    const existingEmail =
      await User.findOne({
        userEmail,
      });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message:
          "Email already registered",
      });
    }

    // ================= CHECK PHONE =================

    const existingPhone =
      await User.findOne({
        userPhone,
      });

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number already registered",
      });
    }

    // ================= GENERATE OTP =================

    const otp = generateAndStoreOtp(
      userPhone,
      {
        userName,
        userEmail,
        userPhone,
      }
    );

    // ================= SMS MESSAGE =================

    const message = `Welcome to Adinn Outdoors! Your registration OTP is ${otp}. Valid for 5 minutes. Do not share it.`;

    // ================= SEND SMS =================

    if (IS_PRODUCTION) {
      const smsSent = await sendSms(
        userPhone,
        message
      );

      if (!smsSent) {
        return res.status(500).json({
          success: false,
          message:
            "Failed to send OTP",
        });
      }

      return res.json({
        success: true,
        message:
          "OTP sent to mobile number",
      });
    } else {
      console.log(
        "=================================="
      );
      console.log("REGISTER OTP:", {
        userPhone,
        otp,
      });
      console.log(
        "=================================="
      );

      return res.json({
        success: true,
        message:
          "OTP sent successfully",
        testOtp: otp,
      });
    }
  } catch (err) {
    console.log(
      "Register Send OTP Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================================
// ==================== VERIFY REGISTER OTP =============
// ======================================================

const verifyRegisterOtp = async (
  req,
  res
) => {
  const { userPhone, otp } = req.body;

  try {
    // ================= VALIDATION =================

    if (!userPhone || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number and OTP are required",
      });
    }

    // ================= VERIFY OTP =================

    const otpError = validateOtp(
      userPhone,
      otp
    );

    if (otpError) {
      return res.status(400).json({
        success: false,
        message: otpError,
      });
    }

    // ================= GET STORED DATA =================

    const storedData =
      otpStore[userPhone];

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message:
          "OTP data not found",
      });
    }

    const {
      userName,
      userEmail,
    } = storedData.userData;

    // ================= CREATE USER =================

    const newUser = new User({
      userName,
      userEmail,
      userPhone,
      userType: 3,
    });

    await newUser.save();

    // ================= DELETE OTP =================

    delete otpStore[userPhone];

    // ================= GENERATE TOKEN =================

    const token =
      generateToken(newUser);

    return res.json({
      success: true,
      message:
        "Registration successful",
      token,
      user: {
        _id: newUser._id,
        userName:
          newUser.userName,
        userEmail:
          newUser.userEmail,
        userPhone:
          newUser.userPhone,
        userType:
          newUser.userType,
      },
    });
  } catch (err) {
    console.log(
      "Verify Register OTP Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================================
// ==================== RESEND OTP ======================
// ======================================================

const resendRegisterOtp = async (
  req,
  res
) => {
  const { userPhone } = req.body;

  try {
    // ================= VALIDATION =================

    if (!userPhone) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number is required",
      });
    }

    // ================= CHECK OTP STORE =================

    const storedData =
      otpStore[userPhone];

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message:
          "No registration request found",
      });
    }

    // ================= GENERATE NEW OTP =================

    const newOtp =
      generateAndStoreOtp(
        userPhone,
        storedData.userData
      );

    // ================= SMS MESSAGE =================

    const message = `Welcome to Adinn Outdoors! Your registration OTP is ${newOtp}. Valid for 5 minutes. Do not share it.`;

    // ================= SEND SMS =================

    if (IS_PRODUCTION) {
      const smsSent = await sendSms(
        userPhone,
        message
      );

      if (!smsSent) {
        return res.status(500).json({
          success: false,
          message:
            "Failed to resend OTP",
        });
      }

      return res.json({
        success: true,
        message:
          "OTP resent successfully",
      });
    } else {
      console.log(
        "=================================="
      );
      console.log("RESEND OTP:", {
        userPhone,
        otp: newOtp,
      });
      console.log(
        "=================================="
      );

      return res.json({
        success: true,
        message:
          "OTP resent successfully",
        testOtp: newOtp,
      });
    }
  } catch (err) {
    console.log(
      "Resend OTP Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================================
// ==================== LOGIN SEND OTP ==================
// ======================================================

const loginSendOtp = async (
  req,
  res
) => {
  const { userPhone } = req.body;

  try {
    if (!userPhone) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number is required",
      });
    }

    // ================= FIND USER =================

    const user = await User.findOne({
      userPhone,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    // ================= GENERATE OTP =================

    const otp = generateAndStoreOtp(
      userPhone,
      {
        login: true,
      }
    );

    const message = `Welcome back to Adinn Outdoors! Your login OTP is ${otp}. Valid for 5 minutes.`;

    // ================= SEND SMS =================

    if (IS_PRODUCTION) {
      const smsSent = await sendSms(
        userPhone,
        message
      );

      if (!smsSent) {
        return res.status(500).json({
          success: false,
          message:
            "Failed to send login OTP",
        });
      }

      return res.json({
        success: true,
        message:
          "Login OTP sent successfully",
      });
    } else {
      console.log(
        "=================================="
      );
      console.log("LOGIN OTP:", {
        userPhone,
        otp,
      });
      console.log(
        "=================================="
      );

      return res.json({
        success: true,
        message:
          "Login OTP sent successfully",
        testOtp: otp,
      });
    }
  } catch (err) {
    console.log(
      "Login Send OTP Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================================
// ==================== LOGIN VERIFY OTP ================
// ======================================================

const loginVerifyOtp = async (
  req,
  res
) => {
  const { userPhone, otp } = req.body;

  try {
    if (!userPhone || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Phone and OTP required",
      });
    }

    // ================= VALIDATE OTP =================

    const otpError = validateOtp(
      userPhone,
      otp
    );

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
        message:
          "User not found",
      });
    }

    // ================= DELETE OTP =================

    delete otpStore[userPhone];

    // ================= TOKEN =================

    const token =
      generateToken(user);

    return res.json({
      success: true,
      message:
        "Login successful",
      token,
      user: {
        _id: user._id,
        userName:
          user.userName,
        userEmail:
          user.userEmail,
        userPhone:
          user.userPhone,
        userType:
          user.userType,
      },
    });
  } catch (err) {
    console.log(
      "Login Verify OTP Error:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ======================================================
// ==================== EXPORTS =========================
// ======================================================

module.exports = {
  registerSendOtp,
  verifyRegisterOtp,
  resendRegisterOtp,
  loginSendOtp,
  loginVerifyOtp,
};