const mongoose = require("mongoose");

const apartmentSchema = new mongoose.Schema(
  {
    apartmentName: {
      type: String,
      required: true,
      trim: true,
    },
    apartmentAddress: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    jioLocation: {
      type: String,
      trim: true,
      default: "",
    },
    photo: {
      type: String,
      trim: true,
      default: "",
    },
    apartmentSummary: {
      type: String,
      required: true,
      trim: true,
    },
    contactPersonName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPersonPhone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    bankDetails: [
      {
        accountName: String,
        bankName: String,
        accountNumber: String,
        ifscCode: String,
        phoneNumber: String,
        upiId: String,
      },
    ],
    permissionStatus: {
      type: String,
      trim: true,
      default: "",
    },
    rating: {
      type: String,
      trim: true,
      default: "",
    },
    residencyCount: {
      type: Number,
      required: true,
      min: 0,
    },
    approxPeopleCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startingTGValues: {
      type: Number,
      default: 0,
      min: 0,
    },
    existingEventsHistory: [
      {
        eventName: String,
        eventDate: String,
        remarks: String,
      },
    ],
    perDayRent: {
      type: Number,
      required: true,
      min: 0,
    },
    fileName: {
      type: String,
      trim: true,
      default: "",
    },
    totalRows: {
      type: Number,
      default: 0,
    },

    insertedCount: {
      type: Number,
      default: 0,
    },

    updatedCount: {
      type: Number,
      default: 0,
    },

    skippedCount: {
      type: Number,
      default: 0,
    },

    insertedData: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Apartment",
        },

        email: {
          type: String,
          trim: true,
        },

        phone: {
          type: String,
          trim: true,
        },

        message: {
          type: String,
          trim: true,
        },
      },
    ],

    updatedData: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Apartment",
        },

        email: {
          type: String,
          trim: true,
        },

        phone: {
          type: String,
          trim: true,
        },

        message: {
          type: String,
          trim: true,
        },
      },
    ],

    skippedData: [
      {
        row: {
          type: Object,
          default: {},
        },

        message: {
          type: String,
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Apartment", apartmentSchema);