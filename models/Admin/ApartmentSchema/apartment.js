const mongoose = require("mongoose");
async function generateApartmentId() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const datePrefix = `${dd}${mm}${yyyy}`; // e.g. "22052026"

  // Count how many apartments already have today's prefix, then increment
  const count = await mongoose
    .model("Apartment")
    .countDocuments({ apartmentId: new RegExp(`^${datePrefix}#`) });

  return `${datePrefix}#${count + 1}`; // e.g. "22052026#1"
}
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
    apartmentAddress: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    jioLocation: { type: String, trim: true, default: "" },
    photo: { type: String, trim: true, },
    apartmentSummary: { type: String, trim: true },
    contactPersonName: { type: String, trim: true },
    contactPersonPhone: { type: String, required: true },
    email: { type: String, },

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
    fromTGValues: { type: Number, default: 0, min: 0 },
    toTGValues: { type: Number, default: 0, min: 0 },
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
// ── PRE-SAVE HOOK: auto-assign apartmentId if missing ────────────────────────
// ✅ CORRECT - async hook, no next() parameter
apartmentSchema.pre("save", async function () {
  if (!this.apartmentId) {
    this.apartmentId = await generateApartmentId();
  }
});
module.exports = mongoose.model("Apartment", apartmentSchema);