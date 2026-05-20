const mongoose = require("mongoose");

const uploadSessionSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
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
    insertedApartmentIds: [{ type: String }],
    updatedApartmentIds:  [{ type: String }],
    skippedApartmentIds:  [{ type: String }], 
    skippedData: [
      {
        row:     { type: Object, default: {} },
        message: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExcelUploadSession", uploadSessionSchema);