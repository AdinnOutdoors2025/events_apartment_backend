const mongoose = require("mongoose");

const ItemsMasterSchema = new mongoose.Schema(
  {
    item_name: {
      type: String,
      required: true,
      trim: true,
    },

    item_type: {
      type: Number,
      required: true,
      enum: [1, 2], // 1 = Individual, 2 = Category
    },

    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ElementsCategoryMaster",
      default: null,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    amount_unit: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4], // 1 = Day, 2 = Hour , 3 = sqr.ft , 4 = feet
    },

    item_status: {
      type: Number,
      enum: [0, 1],
      default: 1, // 1 = enable , 0 = disable
    },

    item_notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("ElementsItemsMaster", ItemsMasterSchema);
