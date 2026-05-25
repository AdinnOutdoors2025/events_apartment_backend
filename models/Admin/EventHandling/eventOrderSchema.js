
// const mongoose = require("mongoose");

// // ─── Sub-schema: Individual Promoter ─────────────────────

// const PromoterSchema =new mongoose.Schema(
//     {
//       _promoterId: {
//         type:
//           mongoose.Schema.Types
//             .ObjectId,
//         default:
//           () =>
//             new mongoose.Types.ObjectId(),
//       },
//       promoterGender: {
//         type: String,
//         enum: [
//           "Male",
//           "Female",
//           "Other",
//         ],
//       },

//       promoterPerDayCharge:
//       {
//         type: Number,
//       },

//       promoterLanguage: [
//         {
//           type: String,
//         },
//       ],

//       promoterLookAndAppearance:
//         [
//           {
//             type: String,
//           },
//         ],
//     },
//     {
//       _id: false, // disable default _id
//     }
//   );

// // ─── Sub-schema: Customer Details ─────────────────────

// const CustomerDetailsSchema = new mongoose.Schema(
//   {
//     brandOrCompanyName:
//     {
//       type: String,
//       trim: true,
//     },

//     contactPersonName: {
//       type: String,
//       trim: true,
//     },

//     contactPersonPhoneNumber:
//     {
//       type: String,
//       trim: true,
//     },

//     email: {
//       type: String,
//       lowercase: true,
//       trim: true,
//     },

//     additionalNotes: {
//       type: String,
//       trim: true,
//     },
//     _customerId: {
//       type:
//         mongoose.Schema.Types
//           .ObjectId,
//       default:
//         () =>
//           new mongoose.Types.ObjectId(),
//     },
//   },
//   { _id: false, } // disable default _id 

// );

// // ─── Main Schema ─────────────────────────────────────

// const OrderBookingSchema = new mongoose.Schema(
//   {
//     apartmentDetails: {
//       type: Object,
//       default: {},
//     },

//     eventDetails: {
//       type: Object,
//       default: {},
//     },
//     updatedBy: { type: String },
//     // apartmentId: {
//     //   type: String,
//     //   trim: true,
//     //   required: true,
//     // },

//     // eventId: {
//     //   type: String,
//     //   trim: true,
//     //   required: true,
//     // },
//     // FIXED
//     orderId: { type: String, unique: true },
//     apartmentId: {
//       type:
//         mongoose.Schema.Types.ObjectId,

//       ref: "Apartment",

//       required: true,
//     },

//     // FIXED
//     eventId: {
//       type:
//         mongoose.Schema.Types.ObjectId,

//       ref: "EventBook",

//       required: true,
//     },
//     fromDate: {
//       type: Date,
//     },

//     toDate: {
//       type: Date,
//     },

//     daysOfEvent: {
//       type: Number,
//       default: 0,
//     },
//     daysOfApartment: {
//       type: Number,
//       default: 0,
//     },

//     // 0 = No
//     // 1 = Yes
//     promoterRequired: {
//       type: Number,
//       enum: [0, 1],
//       default: 0,
//     },

//     promoterCount: {
//       type: Number,
//       default: 0,
//     },

//     promoters: {
//       type: [PromoterSchema],
//       default: [],
//     },

//     customerDetails: {
//       type:
//         CustomerDetailsSchema,
//       default: {},
//     },
//     // 1 Percentage
//     // 2 Number
//     discountType: {
//       type: Number,
//       enum: [1, 2],
//       default: 1,
//     },

//     discountPercentage: {
//       type: Number,
//       default: 0,
//     },
//     orderStatus:{
//       type:Number,
//       enum:[ 0,1,2,3,4,5,6] 
//         // "All",   // 0
//         // "Enquiry", // 1
//         // "Need Analysis", // 2
//         // "Proposal & Price Quote",  // 3
//         // "Negotiation & Review",  // 4
//         // "Close Won", // 5
//         // "Closed loss" // 6
      
//     },
    
//     sqfet: {
//       type: Number,
//       default: 0,
//     },
//     orderNote: {
//       text: {
//         type: String,
//         default: "",
//       },
//       files: [
//         {
//           originalName: { type: String },
//           fileName: { type: String },
//           filePath: { type: String },
//           mimeType: { type: String },
//           size: { type: Number },
//           fileType: {
//             type: String,
//             enum: ["image", "audio", "pdf", "excel", "word", "other"],
//           },
//         },
//       ],
//     },





//     apartmentAmount: { type: Number, default: 0 },  // perDayRent × daysOfApartment
//     sqfetAmount: { type: Number, default: 0 },  // perDayRent × sqfet
//     eventAmount: { type: Number, default: 0 },  // event.amount × daysOfEvent
//     promoterTotal: { type: Number, default: 0 },  // sum of all promoter charges
//     promoterAmount: { type: Number, default: 0 },  // promoterPerDayCharge × daysOfEvent
//     subTotal: { type: Number, default: 0 },  // apartmentAmount + eventAmount + promoterTotal
//     discountAmount: { type: Number, default: 0 },  // calculated from discountType + discountPercentage
//     taxableAmount: { type: Number, default: 0 },  // subTotal - discountAmount
//     gstAmount: { type: Number, default: 0 },  // taxableAmount × 18%
//     totalAmount: { type: Number, default: 0 },  // taxableAmount + gstAmount

//   },
//   {
//     timestamps: true,
//   }
// );

// // ─── PRE SAVE ─────────────────────────────────────

// OrderBookingSchema.pre(
//   "save",
//   function (next) {

//     // DATE VALIDATION
//     if (
//       this.fromDate &&
//       this.toDate &&
//       this.toDate <
//       this.fromDate
//     ) {
//       return next(
//         new Error(
//           "toDate must be on or after fromDate"
//         )
//       );
//     }


//   }
// );

// module.exports = mongoose.model("ApartmentOrderBooking", OrderBookingSchema);







const mongoose = require("mongoose");

// ─── Sub-schema: Order History ─────────────────────────────────────
const OrderHistorySchema = new mongoose.Schema({
  fromStatus: { type: Number, default: null },
  toStatus: { type: Number, required: true },
  changedBy: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  remarks: { type: String, trim: true },
  additionalNotes: { type: String, trim: true },
  negotiationAmount: { type: Number, default: null },
  
  closeLossReason: { type: String, trim: true },
  poDocument: {
    originalName: { type: String },
    fileName: { type: String },
    filePath: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    fileType: {
      type: String,
      enum: ["image", "pdf", "word", "excel", "other"],
    },
    uploadedAt: { type: Date, default: Date.now }
  }
}, { _id: false });

// ─── Sub-schema: Individual Promoter ─────────────────────────────────────
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
    promoterLanguage: [{
      type: String,
    }],
    promoterLookAndAppearance: [{
      type: String,
    }],
    promoterAmount: { type: Number, default: 0 }
  },
  { _id: false }
);

// ─── Sub-schema: Customer Details ─────────────────────────────────────
const CustomerDetailsSchema = new mongoose.Schema(
  {
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
  { _id: false }
);

// ─── Sub-schema: PO Document ─────────────────────────────────────
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
  { _id: false }
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
    daysOfApartment: { type: Number, default: 0 },
    
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
    negotiationAmount: { type: Number, default: null },
    finalAmount: {type: Number,default: 0},
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
    
    // Order Status
    orderStatus: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6],
      default: 1
    },
    
    // Additional Information
    additionalNotes: { type: String, trim: true, default: "" },
    closeLossReason: { type: String, trim: true, default: "" },
    poDocument: { type: PODocumentSchema, default: null },
    
    // Order Notes
    orderNote: {
      text: { type: String, default: "" },
      files: [{
        originalName: { type: String },
        fileName: { type: String },
        filePath: { type: String },
        mimeType: { type: String },
        size: { type: Number },
        fileType: {
          type: String,
          enum: ["image", "audio", "pdf", "excel", "word", "other"],
        },
      }],
    },
    
    // Order History
    orderHistory: { type: [OrderHistorySchema], default: [] },
    
    // Audit Fields
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  {
    timestamps: true,
  }
);

// ─── ONLY ONE PRE-SAVE MIDDLEWARE ─────────────────────────────────────
// Make sure there is only ONE of these in your entire file
OrderBookingSchema.pre("save", function() {
  // Date Validation
  if (this.fromDate && this.toDate && this.toDate < this.fromDate) {
    return next(new Error("toDate must be on or after fromDate"));
  }
  
  // Add any other pre-save validations here
  // For example:
  // if (this.orderStatus === 5 && !this.poDocument) {
  //   return next(new Error("PO Document is required for Close Won status"));
  // }
  
  // next();
});

module.exports = mongoose.model("ApartmentOrderBooking", OrderBookingSchema);