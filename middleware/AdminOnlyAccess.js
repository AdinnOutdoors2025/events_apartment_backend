const adminOnly = (
  req,
  res,
  next
) => {
  if (req.user.userType === 1) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message:
        "Only admin can create user",
    });
  }
};

module.exports = adminOnly;