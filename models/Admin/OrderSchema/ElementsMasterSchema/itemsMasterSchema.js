const mongoose = require("mongoose");

const ItemsMasterSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      required: true,
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
    item_name: {
      type: String,
      required: true,
      trim: true,
    },

    amount_unit: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4, 5], // 1 = Day, 2 = Hour , 3 = sqr.ft , 4 = feet , 5 = pices
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      // quantity Means sqr.ft , feet , pices  only Added inside the package
      type: Number,
      default: null,
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
