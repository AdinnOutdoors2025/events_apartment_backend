const mongoose = require("mongoose");

const ElementsMasterSchema = new mongoose.Schema(
  {
    category_name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: Number,
      enum: [0, 1],
      default: 1, // 1 - enable , 0 - disable
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "ElementsMaster",
  ElementsMasterSchema
);