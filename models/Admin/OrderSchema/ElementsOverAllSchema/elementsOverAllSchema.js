const mongoose = require("mongoose");

// ─── Sub-schema: Element Items ──────────────────────────────────────────────
const OrderItemSchema = new mongoose.Schema(
  {
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ElementsItemsMaster",
      required: true,
    },
    item_name: {
      type: String,
      required: true,
      trim: true,
    },
    item_type: {
      type: Number,
      enum: [1, 2], // 1 = Individual, 2 = Category
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit_amount: {
      type: Number,
      required: true,
      min: 0,
    },
    amount_unit: {
      type: Number,
      enum: [1, 2, 3, 4], // 1=Day, 2=Hour, 3=sqr.ft, 4=feet
      required: true,
    },
    item_amount: {
      // unit_amount × quantity
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// ─── Sub-schema: Gifts ──────────────────────────────────────────────────────
const OrderGiftSchema = new mongoose.Schema(
  {
    gift_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gift",
      required: true,
    },
    gift_name: {
      type: String,
      required: true,
      trim: true,
    },
    gift_type: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit_price: {
      // snapshot of price from Gift DB at order time
      type: Number,
      required: true,
      min: 0,
    },
    price_type: {
      type: Number,
      required: true,
      // e.g. 5 = fixed price — extend enum as your Gift model defines
    },
    gift_amount: {
      // unit_price × quantity
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// ─── Main Order Schema ──────────────────────────────────────────────────────
const OrderSchema = new mongoose.Schema(
  {
    // Element items (can be empty if order has only gifts)
    items: {
      type: [OrderItemSchema],
      default: [],
    },

    // Gifts (can be empty if order has only items)
    gifts: {
      type: [OrderGiftSchema],
      default: [],
    },

    items_total:  { type: Number, default: 0, min: 0 }, // sum of all item_amount
    gifts_total:  { type: Number, default: 0, min: 0 }, // sum of all gift_amount
    total_amount: { type: Number, required: true, min: 0 }, // items_total + gifts_total

    order_status: {
      type: Number,
      enum: [0, 1, 2], // 0=cancelled, 1=active, 2=completed
      default: 1,
    },
    order_notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OrderElements", OrderSchema);