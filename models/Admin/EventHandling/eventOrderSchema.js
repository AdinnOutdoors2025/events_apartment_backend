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
    additionalNotes: { type: String, trim: true },
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

    statusDocument: {
      // Generic document for any status change (optional)
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
    voiceDocument: {
      originalName: { type: String },
      fileName: { type: String },
      filePath: { type: String },
      mimeType: { type: String },
      size: { type: Number },
      // duration: { type: Number }, // Optional: duration in seconds
      fileType: {
        type: String,
        enum: ["audio"],
        default: "audio",
      },
      uploadedAt: { type: Date, default: Date.now },
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
    promoterPerDayCharge: {
      type: Number,
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
      enum: [1,2], 
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
    additionalNotes: {
      type: String,
      trim: true,
    },
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
// ─── Main Schema ─────────────────────────────────────────────────────
const OrderBookingSchema = new mongoose.Schema(
  {
    // Basic Information
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
      enum: [0, 1],
      default: 0,
    },
    promoterCount: { type: Number, default: 0 },
    promoters: { type: [PromoterSchema], default: [] },

    // Customer Information
    customerDetails: { type: CustomerDetailsSchema, default: {} },

    // Financial Information
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
    sqfetAmount: { type: Number, default: 0 },
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

    additionalNotes: { type: String, trim: true, default: "" },
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
      description: "Indicates if order confirmation mail has been sent"
    },
    mailSentAt: {
      type: Date,
      default: null,
      description: "Timestamp when the mail was successfully sent"
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
