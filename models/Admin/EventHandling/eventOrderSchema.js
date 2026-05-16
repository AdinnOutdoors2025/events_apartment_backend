
const mongoose = require("mongoose");

// ─── Sub-schema: Individual Promoter ─────────────────────

const PromoterSchema =
  new mongoose.Schema(
    {
      _promoterId: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        default:
          () =>
            new mongoose.Types.ObjectId(),
      },
      promoterGender: {
        type: String,
        enum: [
          "Male",
          "Female",
          "Other",
        ],
      },

      promoterPerDayCharge:
      {
        type: Number,
      },

      promoterLanguage: [
        {
          type: String,
        },
      ],

      promoterLookAndAppearance:
        [
          {
            type: String,
          },
        ],
    },
    {
      _id: false, // disable default _id
    }
  );

// ─── Sub-schema: Customer Details ─────────────────────

const CustomerDetailsSchema =
  new mongoose.Schema(
    {
      brandOrCompanyName:
      {
        type: String,
        trim: true,
      },

      contactPersonName: {
        type: String,
        trim: true,
      },

      contactPersonPhoneNumber:
      {
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
        type:
          mongoose.Schema.Types
            .ObjectId,
        default:
          () =>
            new mongoose.Types.ObjectId(),
      },
    },
    { _id: false, } // disable default _id 

  );

// ─── Main Schema ─────────────────────────────────────

const OrderBookingSchema =
  new mongoose.Schema(
    {
      updatedBy: { type: String },
      apartmentId: {
        type: String,
        trim: true,
        required: true,
      },

      eventId: {
        type: String,
        trim: true,
        required: true,
      },

      fromDate: {
        type: Date,
      },

      toDate: {
        type: Date,
      },

      daysOfEvent: {
        type: Number,
        default: 0,
      },
      daysOfApartment: {
        type: Number,
        default: 0,
      },

      // 0 = No
      // 1 = Yes
      promoterRequired: {
        type: Number,
        enum: [0, 1],
        default: 0,
      },

      promoterCount: {
        type: Number,
        default: 0,
      },

      promoters: {
        type: [PromoterSchema],
        default: [],
      },

      customerDetails: {
        type:
          CustomerDetailsSchema,
        default: {},
      },
      // 1 Percentage
      // 2 Number
      discountType: {
        type: Number,
        enum: [1, 2],
        default: 1,
      },

      discountPercentage: {
        type: Number,
        default: 0,
      },






      apartmentAmount: { type: Number, default: 0 },  // perDayRent × daysOfApartment
      eventAmount: { type: Number, default: 0 },  // event.amount × daysOfEvent
      promoterTotal: { type: Number, default: 0 },  // sum of all promoter charges
      promoterAmount: { type: Number, default: 0 },  // promoterPerDayCharge × daysOfEvent
      subTotal: { type: Number, default: 0 },  // apartmentAmount + eventAmount + promoterTotal
      discountAmount: { type: Number, default: 0 },  // calculated from discountType + discountPercentage
      taxableAmount: { type: Number, default: 0 },  // subTotal - discountAmount
      gstAmount: { type: Number, default: 0 },  // taxableAmount × 18%
      totalAmount: { type: Number, default: 0 },  // taxableAmount + gstAmount

    },
    {
      timestamps: true,
    }
  );

// ─── PRE SAVE ─────────────────────────────────────

OrderBookingSchema.pre(
  "save",
  function (next) {

    // DATE VALIDATION
    if (
      this.fromDate &&
      this.toDate &&
      this.toDate <
      this.fromDate
    ) {
      return next(
        new Error(
          "toDate must be on or after fromDate"
        )
      );
    }


  }
);

module.exports =
  mongoose.model(
    "ApartmentOrderBooking",
    OrderBookingSchema
  );