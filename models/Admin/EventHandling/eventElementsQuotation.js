const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    elementId: {
      type: String,
      unique: true,
    },

    element: {
      type: String,
      required: true,
      trim: true,
    },

    sqft: {
      type: String,
      default: "",
    },

    qty: {
      type: Number,
      default: 1,
    },

    amount: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const quotationSchema = new mongoose.Schema(
  {
    stateCode: {
      type: String,
      required: true,
      enum: ["TN", "KL", "KA", "AP", "TS"],
      default: "TN",
    },

    items: [itemSchema],

    // totalAmount: {
    //   type: Number,
    //   default: 0,
    // },
  },
  {
    timestamps: true,
  }
);

// GENERATE ITEM ID
quotationSchema.pre("save", function () {
  this.items = this.items.map((item, index) => {
    if (!item.elementId) {
      item.elementId =
        `${this.stateCode}-ITEM-${Date.now()}-${index + 1}`;
    }

    return item;
  });

  // // TOTAL AMOUNT
  // this.totalAmount = this.items.reduce(
  //   (sum, item) => sum + Number(item.amount || 0),
  //   0
  // );

});

module.exports = mongoose.model(
  "eventElementsQuotation",
  quotationSchema
);