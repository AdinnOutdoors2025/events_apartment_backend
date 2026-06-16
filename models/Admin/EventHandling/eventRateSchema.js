// ====================== SCHEMA ======================

const mongoose = require("mongoose");

const eventRateSchema =
  new mongoose.Schema(
    {
      // eventId: {
      //   type: String,
      //   unique: true,
      // },
      // apartmentId: {
      //   type: String,
      //   required: true,
      // },

      eventName: {
        type: String,
        required: true,
        trim: true,
      },

      amount: {
        type: Number,
        required: true,
        default: 0,
      },

      // 0 = Unavailable
      // 1 = Available
      status: {
        type: Number,
        enum: [0, 1],
        default: 1,
      },
      updatedBy: { type: String },
    },
    {
      timestamps: true,
    }
  );

module.exports =mongoose.model("EventBook",eventRateSchema);