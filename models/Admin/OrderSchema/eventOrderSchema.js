const mongoose = require("mongoose");

// Helper function to get status text
const getStatusText = (status) => {
  switch (Number(status)) {
    case 1:
      return "Enquiry";
    case 2:
      return "Need Analysis";
    case 3:
      return "Proposal & Price Quote";
    case 4:
      return "Negotiation & Review";
    case 5:
      return "Close Won";
    case 6:
      return "Closed Loss";
    case 7:
      return "Project Code Creation";
    default:
      return "Unknown";
  }
};
// ─── Order History ─────────────────────────────────────
const OrderHistorySchema = new mongoose.Schema(
  {
    fromStatus: { type: Number, default: null },
    fromStatusText: { type: String },
    toStatus: { type: Number, required: true },
    toStatusText: { type: String },
    changedBy: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    remarks: { type: String, trim: true },
    // additionalNotes: { type: String, trim: true },
    additionalNotes: { type: [String], default: [] },
    // negotiationAmount: { type: Number, default: null },

    closeLossReason: { type: String, trim: true },
    poDocument: {
      originalName: { type: String },
      fileName: { type: String },
      filePath: { type: String },
      mimeType: { type: String },
      size: { type: Number },
      fileType: {
        type: String,
        enum: ["image", "pdf"],
      },
      uploadedAt: { type: Date, default: Date.now },
    },

    // statusDocument: {
    //   // Generic document for any status change (optional)
    //   originalName: { type: String },
    //   fileName: { type: String },
    //   filePath: { type: String },
    //   mimeType: { type: String },
    //   size: { type: Number },
    //   fileType: {
    //     type: String,
    //     enum: ["image", "audio", "pdf", "excel", "word", "other"],
    //   },
    //   uploadedAt: { type: Date, default: Date.now },
    // },
    // OrderHistorySchema - change statusDocument from object to array
    statusDocument: {
      type: [
        {
          originalName: { type: String },
          fileName: { type: String },
          filePath: { type: String },
          mimeType: { type: String },
          size: { type: Number },
          fileType: {
            type: String,
            enum: ["image", "audio", "pdf", "excel", "word", "other"],
          },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    voiceDocument: {
      type: [
        {
          originalName: { type: String },
          fileName: { type: String },
          filePath: { type: String },
          mimeType: { type: String },
          size: { type: Number },
          fileType: {
            type: String,
            enum: ["audio"],
            default: "audio",
          },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { _id: false },
);

// ─── Individual Promoter ─────────────────────────────────────
const PromoterSchema = new mongoose.Schema(
  {
    _promoterId: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
    promoterGender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    promoterDays: {
      type: Number,
      default: 0,
    },
    promoterPerDayCharge: {
      type: Number,
      default: 0,
    },
    promoterLanguage: [
      {
        type: String,
      },
    ],
    promoterLookAndAppearance: [
      {
        type: String,
      },
    ],
    promoterAmount: { type: Number, default: 0 },
  },
  { _id: false },
);

// ─── Customer Details ─────────────────────────────────────
const CustomerDetailsSchema = new mongoose.Schema(
  {
    // 1 Individual  2 Agency
    customerType: {
      type: Number,
      enum: [1, 2],
    },
    gstNumber: { type: Number, default: "" },
    designation: { type: String, default: "" },
    brandOrCompanyName: {
      type: String,
      trim: true,
    },
    contactPersonName: {
      type: String,
      trim: true,
    },
    contactPersonPhoneNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    // additionalNotes: {
    //   type: String,
    //   trim: true,
    // },
    additionalNotes: { type: [String], default: [] },
    _customerId: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId(),
    },
  },
  { _id: false },
);

// ─── PO Document ─────────────────────────────────────
const PODocumentSchema = new mongoose.Schema(
  {
    originalName: { type: String },
    fileName: { type: String },
    filePath: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    fileType: {
      type: String,
      enum: ["image", "pdf"],
    },
    uploadedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: false },
);
// ─── Daily Schedule ─────────────────────────────────────
const DailyScheduleSchema = new mongoose.Schema(
  {
    days: { type: Number, required: true }, // 1, 2, 3, etc.
    fromTime: { type: String, required: true }, // "10:00 AM" format
    toTime: { type: String, required: true }, // "2:00 PM" format
    notes: { type: String, trim: true }, // Optional notes for this day
  },
  { _id: false },
);

// assignmentSchema
const assignmentSchema = new mongoose.Schema(
  {
    assignedToType: {
      type: Number, // 1=Admin, 2=Staff Admin
      enum: [1, 2],
    },
    assignedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaffAdminUser",
      default: null,
    },

    assignedUserName: {
      type: String,
      default: "",
    },

    assignedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaffAdminUser",
      default: null,
    },

    assignedByName: {
      type: String,
      default: "",
    },

    assignedAt: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  },
);

// ─── Sub-schema: Element Items ──────────────────────────────────────────────
const OrderItemSchema = new mongoose.Schema(
  {
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ElementsItemsMaster",
      required: true,
    },
    state: {
      type: String,
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
      enum: [1, 2, 3, 4, 5], // 1=Day, 2=Hour, 3=sqr.ft, 4=feet 5= pices
      required: true,
    },
    // quantity: {
    //   type: Number,
    //   default: null,
    // },
    item_amount: {
      // unit_amount × quantity
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
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
  { _id: false },
);
// ─── Main Schema ─────────────────────────────────────────────────────
const OrderBookingSchema = new mongoose.Schema(
  {
    // Basic Information
    // userId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "User",
    //   required: true,
    // },
    stageRequired: {
      type: Number,
      enum: [0, 1], // 0 = no 1 = Yes
      default: 0,
    },
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

    items_total: { type: Number, default: 0, min: 0 }, // sum of all item_amount
    gifts_total: { type: Number, default: 0, min: 0 }, // sum of all gift_amount
    itemsAndGiftsTotal: { type: Number, required: true, min: 0 }, // items_total + gifts_total

    order_status: {
      type: Number,
      enum: [0, 1, 2], // 0=cancelled, 1=active, 2=completed
      default: 1,
    },
    orderId: { type: String, unique: true },
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Apartment",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventBook",
      required: true,
    },
    assignment: assignmentSchema,
    // Snapshot Details
    apartmentDetails: {
      type: Object,
      default: {},
    },
    eventDetails: {
      type: Object,
      default: {},
    },

    // Date Information
    fromDate: { type: Date },
    toDate: { type: Date },
    daysOfEvent: { type: Number, default: 0 },
    // daysOfApartment: { type: Number, default: 0 },
    dailySchedule: { type: [DailyScheduleSchema], default: [] },
    // Promoter Information
    promoterRequired: {
      type: Number,
      enum: [0, 1], // 0 = no 1 = Yes
      default: 0,
    },
    promoterCount: { type: Number, default: 0 },
    promoters: { type: [PromoterSchema], default: [] },

    // Customer Information
    customerDetails: { type: CustomerDetailsSchema, default: {} },

    // Financial Information
    // 1 Percentage,2 Amount
    discountType: {
      type: Number,
      enum: [1, 2],
      default: 1,
    },
    discountPercentage: { type: Number, default: 0 },
    // negotiationAmount: { type: Number, default: null },
    finalAmount: { type: Number, default: 0 },
    // Calculated Amounts
    sqfet: { type: Number, default: 0 },
    apartmentAmount: { type: Number, default: 0 },
    // sqfetAmount: { type: Number, default: 0 },
    eventAmount: { type: Number, default: 0 },
    promoterTotal: { type: Number, default: 0 },
    subTotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

    // Order Status 1. Enquiry 2. Need analysis 3. Proposal & Price Quote 4. Negotiation & Review 5. Close Won  6. Closed loss 7. Project Code Creation
    orderStatus: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6, 7],
      default: 1,
    },

    // additionalNotes: { type: String, trim: true, default: "" },
    additionalNotes: { type: [String], default: [] },
    closeLossReason: { type: String, trim: true, default: "" },
    poDocument: { type: PODocumentSchema, default: null },

    document: {
      originalName: { type: String },
      fileName: { type: String },
      filePath: { type: String },
      mimeType: { type: String },
      size: { type: Number },
      fileType: {
        type: String,
        enum: ["image", "audio", "pdf", "excel", "word", "other"],
      },
      uploadedAt: { type: Date, default: Date.now },
    },
    voiceNote: {
      originalName: { type: String },
      fileName: { type: String },
      filePath: { type: String },
      mimeType: { type: String },
      size: { type: Number },
      fileType: {
        type: String,
        enum: ["audio"],
      },
      uploadedAt: { type: Date, default: Date.now },
    },
    // Order Notes
    orderNote: {
      text: { type: String, default: "" },
      files: [
        {
          originalName: { type: String },
          fileName: { type: String },
          filePath: { type: String },
          mimeType: { type: String },
          size: { type: Number },
          fileType: {
            type: String,
            enum: ["image", "audio", "pdf", "excel", "word", "other"],
          },
        },
      ],
    },

    // Order History
    orderHistory: { type: [OrderHistorySchema], default: [] },
    // Mail Tracking Fields - Add these two fields
    isMailSent: {
      type: Boolean,
      default: false,
      description: "Indicates if order confirmation mail has been sent",
    },
    mailSentAt: {
      type: Date,
      default: null,
      description: "Timestamp when the mail was successfully sent",
    },
    // Audit Fields
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  {
    timestamps: true,
  },
);

// ─── ONLY ONE PRE-SAVE MIDDLEWARE ─────────────────────────────────────
// Make sure there is only ONE of these in your entire file
OrderBookingSchema.pre("save", function () {
  // Date Validation
  if (this.fromDate && this.toDate && this.toDate < this.fromDate) {
    return next(new Error("toDate must be on or after fromDate"));
  }

  // Auto-populate status text for order history entries
  if (this.orderHistory && this.orderHistory.length > 0) {
    this.orderHistory.forEach((history) => {
      if (history.fromStatus !== undefined && history.fromStatus !== null) {
        history.fromStatusText = getStatusText(history.fromStatus);
      }
      if (history.toStatus !== undefined && history.toStatus !== null) {
        history.toStatusText = getStatusText(history.toStatus);
      }
    });
  }
});
// Add virtual fields for current status text
OrderBookingSchema.virtual("currentStatusText").get(function () {
  return getStatusText(this.orderStatus);
});

// Include virtuals when converting to JSON
OrderBookingSchema.set("toJSON", { virtuals: true });
OrderBookingSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("ApartmentOrderBooking", OrderBookingSchema);
