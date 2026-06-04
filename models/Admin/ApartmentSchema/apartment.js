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
    ApartmentName: { type: String, required: true, trim: true },
    ApartmentGroupName: { type: String,  trim: true },
    // apartmentAddress: { type: String, trim: true },
    City: { type: String, required: true, trim: true },
    State: { type: String, required: true, trim: true },
    Location: { type: String, required: true, trim: true },
    GeoLocation: { type: String, trim: true, default: "" },
    // photo: { type: String, trim: true, },
    // apartmentSummary: { type: String, trim: true },
    ContactPersonName: { type: String, trim: true },
    ContactPersonPhone: { type: String, required: true },
    // email: { type: String, },

    bankDetails: 
      {
        AccountHolderName: String,
        BankName: String,
        AccountNumber: String,
        IfscCode: String,
        PhoneNumber: String,
        UpiID: String,
      },
    PermissionStatus: { type: String, trim: true, default: "" },
    Rating: { type: String, trim: true, default: "" },
    ResidencyCount: { type: Number, required: true, min: 0 },
    ApproxPeopleCount: { type: Number, default: 0, min: 0 },
    FromTGValues: { type: Number, default: 0, min: 0 },
    ToTGValues: { type: Number, default: 0, min: 0 },
    // existingEventsHistory: [
    //   {
    //     eventName: String,
    //     eventDate: String,
    //     remarks: String,
    //   },
    // ],
      isActive: {
      type: Boolean,
      default: true,
    },
    PerDayRent: { type: Number, required: true, min: 0 },
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