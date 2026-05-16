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
        required: true,
        enum: [0, 1]
      },
      updatedBy: { type: String },
    },
    {
      timestamps: true,
    }
  );

// AUTO EVENT ID GENERATION
// eventRateSchema.pre(
//   "save",
//   async function (next) {
//     try {
//       if (!this.eventId) {
//         const count =
//           await mongoose
//             .model("EventBook")
//             .countDocuments();

//         this.eventId =
//           `EVT${String(
//             count + 1
//           ).padStart(4, "0")}`;
//       }

//     //   next();
//     } catch (error) {
//       next(error);
//     }
//   }
// );

module.exports =mongoose.model("EventBook",eventRateSchema);