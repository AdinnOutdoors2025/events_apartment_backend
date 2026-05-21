const mongoose = require("mongoose");

const apartmentSchema = new mongoose.Schema(
  {
    // apartmentId: {
    //   type: String,
    //   required: true,
    //   trim: true,
    //   unique: true,
    // },
    apartmentId: {
      type: String,
      // trim: true,
      unique: true,
      sparse: true,
      // default: null,
    },
    // ── WHICH SESSION FIRST INSERTED THIS RECORD ──
    createdBySession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExcelUploadSession",
      default: null,
    },

    // ── WHICH SESSION LAST UPDATED THIS RECORD ──
    lastUpdatedBySession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExcelUploadSession",
      default: null,
    },
    // ── WHICH SESSION SKIPPED THIS RECORD ──
    skippedBySession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExcelUploadSession",
      default: null,
    },
    apartmentName: { type: String, required: true, trim: true },
    apartmentAddress: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    jioLocation: { type: String, trim: true, default: "" },
    photo: { type: String, trim: true, default: "" },
    apartmentSummary: { type: String, required: true, trim: true },
    contactPersonName: { type: String, required: true, trim: true },
    contactPersonPhone: { type: String, required: true },
    email: { type: String, required: true },

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
    permissionStatus: { type: String, trim: true, default: "" },
    rating: { type: String, trim: true, default: "" },
    residencyCount: { type: Number, required: true, min: 0 },
    approxPeopleCount: { type: Number, default: 0, min: 0 },
    startingTGValues: { type: Number, default: 0, min: 0 },
    existingEventsHistory: [
      {
        eventName: String,
        eventDate: String,
        remarks: String,
      },
    ],
    perDayRent: { type: Number, required: true, min: 0 },
    updatedBy: { type: String },
  },

  { timestamps: true }
);

module.exports = mongoose.model("Apartment", apartmentSchema);