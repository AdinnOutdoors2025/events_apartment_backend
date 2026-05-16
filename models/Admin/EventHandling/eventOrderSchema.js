
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
    { _id: false,} // disable default _id 
    
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

      discountPercentage: {
        type: Number,
        default: 0,
      },

      //   // AUTO CALCULATED
      //   totalChargeBeforeDiscount:
      //     {
      //       type: Number,
      //       default: 0,
      //     },

      //   discountAmount: {
      //     type: Number,
      //     default: 0,
      //   },

      //   totalChargeAfterDiscount:
      //     {
      //       type: Number,
      //       default: 0,
      //     },

      //   status: {
      //     type: String,
      //     enum: [
      //       "Pending",
      //       "Confirmed",
      //       "Cancelled",
      //     ],
      //     default: "Pending",
      //   },
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

    // // TOTAL CALCULATION
    // const total =
    //   (
    //     this.promoters || []
    //   ).reduce(
    //     (sum, p) =>
    //       sum +
    //       (
    //         p.promoterPerDayCharge ||
    //         0
    //       ) *
    //         (
    //           this.daysOfEvent ||
    //           0
    //         ),
    //     0
    //   );

    // this.totalChargeBeforeDiscount =
    //   total;

    // this.discountAmount =
    //   parseFloat(
    //     (
    //       (total *
    //         (
    //           this.discountPercentage ||
    //           0
    //         )) /
    //       100
    //     ).toFixed(2)
    //   );

    // this.totalChargeAfterDiscount =
    //   parseFloat(
    //     (
    //       total -
    //       this.discountAmount
    //     ).toFixed(2)
    //   );

    // next();
  }
);

module.exports =
  mongoose.model(
    "ApartmentOrderBooking",
    OrderBookingSchema
  );