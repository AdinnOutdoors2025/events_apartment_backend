const mongoose = require("mongoose");

const GiftMasterSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      required: true,
    },
    // 1 = Normal Gift
    // 2 = Live Gift
    giftType: {
      type: Number,
      enum: [1, 2],
      required: true,
    },

    giftName: {
      type: String,
      required: true,
      trim: true,
    },

    // 1 = Per Quantity
    // 2 = Per unit
    // 3 = Per Day
    // 4 = Per Hour
    // 5 = Per Person
    priceType: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: true,
    },

    // Common Price
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Applicable only for priceType = 2
    unit: {
      type: Number,
      default: null,
      min: 1,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // 0 = Inactive
    // 1 = Active
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

// Validation
GiftMasterSchema.pre("validate", function () {
  // Normal Gift => only 1,2
  if (this.giftType === 1 && ![1, 2].includes(this.priceType)) {
    return next(
      new Error(
        "For Normal Gift, priceType must be  (Per Quantity) or  (Unit Price)",
      ),
    );
  }

  // Live Gift => only 3,4,5
  if (this.giftType === 2 && ![3, 4, 5].includes(this.priceType)) {
    return next(
      new Error(
        "For Live Gift, priceType must be 3 (Per Day), 4 (Per Hour), or 5 (Per Person)",
      ),
    );
  }

  // priceType = 2 requires unit
  if (this.priceType === 2) {
    if (!this.unit) {
      return next(new Error("unit is required for priceType 2"));
    }
  } else {
    this.unit = null;
  }
});

module.exports = mongoose.model("GiftsMaster", GiftMasterSchema);
