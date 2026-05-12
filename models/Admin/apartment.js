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
    bankDetails: {
      type: String,
      trim: true,
      default: "",
    },
    permissionStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
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
        eventDate: Date,
        remarks: String,
      },
    ],
    perDayRent: {
      type: Number,
      required: true,
      min: 0,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Apartment", apartmentSchema);