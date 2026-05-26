// const mongoose = require("mongoose");
// const orderBooking = require("../../../models/Admin/EventHandling/eventOrderSchema");
// const Apartment = require("../../../models/Admin/ApartmentSchema/apartment")
// const EventBook = require("../../../models/Admin/EventHandling/eventRateSchema")
// // ─── Helper ──────────────────────────────────────────────────────────────────
// const asyncHandler = (fn) => (req, res, next) =>
//   Promise.resolve(fn(req, res, next)).catch(next);

// // Format: 20260503ORD#1
// async function generateAdminOrderId() {
//   const today = new Date();
//   const year = today.getFullYear();
//   const month = String(today.getMonth() + 1).padStart(2, "0");
//   const day = String(today.getDate()).padStart(2, "0");
//   const prefix = `${year}${month}${day}`;

//   const start = new Date(year, today.getMonth(), today.getDate());
//   const end = new Date(year, today.getMonth(), today.getDate() + 1);
//   const count = await orderBooking.countDocuments({ createdAt: { $gte: start, $lt: end } });

//   return `${prefix}ORD#${count + 1}`;
// }
// // ✅ NEW: Helper to categorize file type
// function getFileCategory(mimeType) {
//   if (mimeType.startsWith("image/")) return "image";
//   if (mimeType.startsWith("audio/")) return "audio";
//   if (mimeType === "application/pdf") return "pdf";
//   if (
//     mimeType === "application/vnd.ms-excel" ||
//     mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//   ) return "excel";
//   if (
//     mimeType === "application/msword" ||
//     mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
//   ) return "word";
//   return "other";
// }
// // ─── CREATE / UPDATE Booking ──────────────────────────────────────────────────

// const createBooking = asyncHandler(async (req, res) => {
//   const
//   {
//     apartmentId,
//     eventId,
//     fromDate,
//     toDate,
//     daysOfEvent,
//     daysOfApartment,
//     promoterRequired,
//     promoterCount,
//     promoters,
//     customerDetails,
//     discountPercentage,
//     discountType,
//     orderNoteText,
//     orderNoteFiles,
//     sqfet
//   } = req.body;

//   // ─────────────────────────────────────────────
//   // ORDER NOTE
//   // ─────────────────────────────────────────────

//   const uploadedFiles =
//     req.files?.orderNoteFiles || [];

//   const orderNote = {

//     text:
//       req.body.orderNoteText || "",

//     files:
//       uploadedFiles.map((file) => ({

//         originalName:
//           file.originalname,

//         fileName:
//           file.filename,

//         filePath:
//           file.path,

//         mimeType:
//           file.mimetype,

//         size:
//           file.size,

//         fileType:
//           getFileCategory(
//             file.mimetype
//           ),
//       })),
//   };

//   // ─────────────────────────────────────────────
//   // VALIDATE APARTMENT ID
//   // ─────────────────────────────────────────────

//   if (
//     !apartmentId ||
//     !mongoose.Types.ObjectId.isValid(
//       apartmentId
//     )
//   ) {

//     return res.status(400).json({

//       success: false,

//       message:
//         !apartmentId
//           ? "apartmentId is required"
//           : "Invalid apartmentId",
//     });
//   }

//   // ─────────────────────────────────────────────
//   // VALIDATE EVENT ID
//   // ─────────────────────────────────────────────

//   if (
//     !eventId ||
//     !mongoose.Types.ObjectId.isValid(
//       eventId
//     )
//   ) {

//     return res.status(400).json({

//       success: false,

//       message:
//         !eventId
//           ? "eventId is required"
//           : "Invalid eventId",
//     });
//   }

//   // ─────────────────────────────────────────────
//   // VALIDATE PHONE NUMBER
//   // ─────────────────────────────────────────────

//   const contactPersonPhoneNumber =
//     customerDetails
//       ?.contactPersonPhoneNumber;

//   if (
//     !contactPersonPhoneNumber
//   ) {

//     return res.status(400).json({

//       success: false,

//       message:
//         "customerDetails.contactPersonPhoneNumber is required",
//     });
//   }

//   // ─────────────────────────────────────────────
//   // VALIDATE DATES
//   // ─────────────────────────────────────────────

//   if (
//     !fromDate ||
//     !toDate
//   ) {

//     return res.status(400).json({

//       success: false,

//       message:
//         !fromDate
//           ? "fromDate is required"
//           : "toDate is required",
//     });
//   }

//   const parsedFromDate =
//     new Date(fromDate);

//   const parsedToDate =
//     new Date(toDate);

//   if (
//     isNaN(
//       parsedFromDate.getTime()
//     )
//   ) {

//     return res.status(400).json({

//       success: false,

//       message:
//         "Invalid fromDate",
//     });
//   }

//   if (
//     isNaN(
//       parsedToDate.getTime()
//     )
//   ) {

//     return res.status(400).json({

//       success: false,

//       message:
//         "Invalid toDate",
//     });
//   }

//   if (
//     parsedToDate <
//     parsedFromDate
//   ) {

//     return res.status(400).json({

//       success: false,

//       message:
//         "toDate must be on or after fromDate",
//     });
//   }

//   // ─────────────────────────────────────────────
//   // FETCH APARTMENT & EVENT
//   // ─────────────────────────────────────────────

//   const [
//     apartment,
//     event,
//   ] = await Promise.all([

//     Apartment.findById(
//       apartmentId
//     ).lean(),

//     EventBook.findById(
//       eventId
//     ).lean(),
//   ]);

//   if (!apartment) {

//     return res.status(404).json({

//       success: false,

//       message:
//         "Apartment not found",
//     });
//   }

//   if (!event) {

//     return res.status(404).json({

//       success: false,

//       message:
//         "Event not found",
//     });
//   }

//   // ─────────────────────────────────────────────
//   // STORE SNAPSHOT DETAILS
//   // ─────────────────────────────────────────────

//   const apartmentDetails = {

//     _id:
//       apartment._id,

//     apartmentName:
//       apartment.apartmentName,

//     apartmentAddress:
//       apartment.apartmentAddress,

//     city:
//       apartment.city,

//     location:
//       apartment.location,

//     perDayRent:
//       apartment.perDayRent,

//     contactPersonName:
//       apartment.contactPersonName,

//     contactPersonPhone:
//       apartment.contactPersonPhone,
//   };

//   const eventDetails = {

//     _id:
//       event._id,

//     eventName:
//       event.eventName,

//     amount:
//       event.amount,

//     description:
//       event.description,
//   };

//   // ─────────────────────────────────────────────
//   // FIND EXISTING CUSTOMER BOOKING
//   // ─────────────────────────────────────────────

//   const existingCustomerBooking =
//     await orderBooking.findOne({

//       apartmentId,

//       eventId,

//       "customerDetails.contactPersonPhoneNumber":
//         contactPersonPhoneNumber,
//     });

//   // ─────────────────────────────────────────────
//   // CHECK OVERLAPPING BOOKINGS
//   // ─────────────────────────────────────────────

//   const overlappingBooking =await orderBooking.findOne({

//       _id: {
//         $ne:
//           existingCustomerBooking?._id,
//       },

//       apartmentId,

//       eventId,

//       fromDate: {
//         $lte:
//           parsedToDate,
//       },

//       toDate: {
//         $gte:
//           parsedFromDate,
//       },
//     });

//   if (overlappingBooking) {

//     return res.status(409).json({

//       success: false,

//       message:
//         `Already booked from ${overlappingBooking.fromDate.toDateString()} to ${overlappingBooking.toDate.toDateString()}`,
//     });
//   }

// const apartmentAmount = Math.floor(
//   (apartment.perDayRent || 0) * (daysOfApartment || 0)
// );
// const sqfetAmount = Math.floor(
//   (apartment.perDayRent || 0) * (sqfet || 0)
// );

// const eventAmount = Math.floor(
//   (event.amount || 0) * (daysOfEvent || 0)
// );

// let promoterTotal = 0;

// const promotersWithAmount = (promoters || []).map((p) => {
//   const promoterAmount = Math.floor(
//     (p.promoterPerDayCharge || 0) * (daysOfEvent || 0)
//   );

//   promoterTotal += promoterAmount;

//   return {
//     ...p,
//     promoterAmount,
//   };
// });

// const subTotal = Math.floor(apartmentAmount + eventAmount + promoterTotal + sqfetAmount);

// let discountAmount = 0;

// // 1 = Percentage
// if (discountType === 1) {
//   discountAmount = Math.floor((subTotal * (discountPercentage || 0)) / 100);
// }
// // 2 = Flat
// else if (discountType === 2) {
//   discountAmount = Math.floor(discountPercentage || 0);
// }

// const taxableAmount = Math.floor(subTotal - discountAmount);

// const gstAmount = Math.floor((taxableAmount * 18) / 100);

// const totalAmount = Math.floor(taxableAmount + gstAmount);
//   // ─────────────────────────────────────────────
//   // UPDATE EXISTING BOOKING
//   // ─────────────────────────────────────────────

//   if (
//     existingCustomerBooking
//   ) {

//     existingCustomerBooking.fromDate =
//       parsedFromDate;

//     existingCustomerBooking.toDate =
//       parsedToDate;

//     existingCustomerBooking.daysOfEvent =
//       daysOfEvent;

//     existingCustomerBooking.daysOfApartment =
//       daysOfApartment;

//     existingCustomerBooking.sqfet =
//       sqfet;

//     existingCustomerBooking.promoterRequired =
//       promoterRequired;

//     existingCustomerBooking.promoterCount =
//       promoterCount;

//     existingCustomerBooking.promoters =
//       promotersWithAmount;

//     existingCustomerBooking.customerDetails =
//       customerDetails;

//     existingCustomerBooking.discountPercentage =
//       discountPercentage;

//     existingCustomerBooking.discountType =
//       discountType;

//     existingCustomerBooking.apartmentAmount =
//       apartmentAmount;

//     existingCustomerBooking.sqfetAmount =
//       sqfetAmount;

//     existingCustomerBooking.eventAmount =
//       eventAmount;

//     existingCustomerBooking.promoterTotal =
//       promoterTotal;

//     existingCustomerBooking.subTotal =
//       subTotal;

//     existingCustomerBooking.discountAmount =
//       discountAmount;

//     existingCustomerBooking.taxableAmount =
//       taxableAmount;

//     existingCustomerBooking.gstAmount =
//       gstAmount;

//     existingCustomerBooking.totalAmount =
//       totalAmount;

//     existingCustomerBooking.apartmentDetails =
//       apartmentDetails;

//     existingCustomerBooking.eventDetails =
//       eventDetails;

//     existingCustomerBooking.orderNote =
//       orderNote;

//     existingCustomerBooking.updatedBy =
//       req.user?.name;

//     await existingCustomerBooking.save();

//     return res.status(200).json({

//       success: true,

//       message:
//         "Booking updated successfully",
//     });
//   }

//   // ─────────────────────────────────────────────
//   // GENERATE ORDER ID
//   // ─────────────────────────────────────────────

//   const orderId =
//     await generateAdminOrderId();

//   // ─────────────────────────────────────────────
//   // CREATE BOOKING
//   // ─────────────────────────────────────────────

//   const booking =
//     await orderBooking.create({

//       orderId,

//       apartmentId,

//       eventId,

//       apartmentDetails,

//       eventDetails,

//       fromDate:
//         parsedFromDate,

//       toDate:
//         parsedToDate,

//       daysOfEvent,

//       daysOfApartment,
//       sqfet,
//       promoterRequired,

//       promoterCount,

//       promoters:
//         promotersWithAmount,

//       customerDetails,

//       discountPercentage,

//       discountType,

//       apartmentAmount,
//       sqfetAmount,
//       eventAmount,

//       promoterTotal,

//       subTotal,

//       discountAmount,

//       taxableAmount,

//       gstAmount,

//       totalAmount,

//       orderNote,

//       orderStatus: 1,

//       createdBy:
//         req.user?.name,

//       updatedBy:
//         req.user?.name,
//     });

//   return res.status(201).json({

//     success: true,

//     message:
//       "Booking created successfully",
//   });

// });

// // ───────────────── LIST BOOKINGS ─────────────────
// // FORMAT : DD-MM-YYYY

// const parseDate = (dateString) => {

//   if (!dateString) return null;

//   const parts =
//     dateString.split("-");

//   if (parts.length !== 3) {
//     return null;
//   }

//   const [day, month, year] =
//     parts;

//   const parsedDate =
//     new Date(
//       `${year}-${month}-${day}`
//     );

//   return isNaN(parsedDate)
//     ? null
//     : parsedDate;
// };

// const buildBookingFilters = async (
//   body
// ) => {

//   const {
//     apartmentId,
//     orderStatus,
//     fromDate,
//     toDate,
//     search,
//   } = body;

//   let filter = {};

//   // ───────────────── APARTMENT FILTER ─────────────────

//   if (apartmentId) {

//     filter.apartmentId =
//       new mongoose.Types.ObjectId(
//         apartmentId
//       );
//   }

//   // ───────────────── STATUS FILTER ─────────────────

// // STATUS = 1 → ALL DATA
// // STATUS = 2,3,4,5 → PARTICULAR STATUS DATA

// if (
//   orderStatus !== undefined &&
//   orderStatus !== null &&
//   orderStatus !== ""
// ) {

//   const statusValue =
//     Number(orderStatus);

//   // IF STATUS IS NOT 1
//   // APPLY FILTER

//   if (statusValue !== 0) {

//     filter.orderStatus =
//       statusValue;
//   }
// }

//   // ───────────────── DATE FILTER ─────────────────
//   // FORMAT : DD-MM-YYYY

//   if (
//     fromDate ||
//     toDate
//   ) {

//     filter.fromDate = {};

//     // FROM DATE

//     if (fromDate) {

//       const startDate =
//         parseDate(
//           fromDate
//         );

//       if (!startDate) {

//         return {
//           error:
//             "Invalid fromDate format. Use DD-MM-YYYY",
//         };
//       }

//       filter.fromDate.$gte =
//         startDate;
//     }

//     // TO DATE

//     if (toDate) {

//       const endDate =
//         parseDate(
//           toDate
//         );

//       if (!endDate) {

//         return {
//           error:
//             "Invalid toDate format. Use DD-MM-YYYY",
//         };
//       }

//       endDate.setHours(
//         23,
//         59,
//         59,
//         999
//       );

//       filter.fromDate.$lte =
//         endDate;
//     }
//   }

//   // ───────────────── SEARCH FILTER ─────────────────
//   // SEARCH apartmentName + eventName

//   if (
//     search &&
//     search.trim() !== ""
//   ) {

//     const searchRegex =
//       new RegExp(
//         search.trim(),
//         "i"
//       );

//     // APARTMENT SEARCH

//     const matchedApartments =
//       await Apartment.find(
//         {
//           apartmentName:
//             searchRegex,
//         },
//         "_id"
//       ).lean();

//     // EVENT SEARCH

//     const matchedEvents =
//       await Event.find(
//         {
//           eventName:
//             searchRegex,
//         },
//         "_id"
//       ).lean();

//     const apartmentIds =
//       matchedApartments.map(
//         (item) =>
//           item._id
//       );

//     const eventIds =
//       matchedEvents.map(
//         (item) =>
//           item._id
//       );

//     let orConditions =
//       [];

//     // APARTMENT MATCH

//     if (
//       apartmentIds.length >
//       0
//     ) {

//       orConditions.push({
//         apartmentId: {
//           $in:
//             apartmentIds,
//         },
//       });
//     }

//     // EVENT MATCH

//     if (
//       eventIds.length >
//       0
//     ) {

//       orConditions.push({
//         eventId: {
//           $in:
//             eventIds,
//         },
//       });
//     }

//     // NO MATCH

//     if (
//       orConditions.length ===
//       0
//     ) {

//       return {
//         noMatch: true,
//         filter,
//       };
//     }

//     filter.$or =
//       orConditions;
//   }

//   return {
//     filter,
//   };
// };

// const listAllBookings = asyncHandler(
//     async (req, res) => {

//       const {
//         pageNumber,
//         count,
//       } = req.body || {};

//       // ───────────────── VALIDATION ─────────────────

//       if (
//         !pageNumber ||
//         !count
//       ) {

//         return res.status(400).json({
//           success: false,
//           message:
//             "pageNumber and count are required",
//         });
//       }

//       // ───────────────── PAGINATION ─────────────────

//       const page =
//         parseInt(
//           pageNumber
//         );

//       const limit =
//         parseInt(
//           count
//         );

//       const skip =
//         (page - 1) *
//         limit;

//       // ───────────────── FILTER ─────────────────

//       const filterResult =
//         await buildBookingFilters(
//           req.body
//         );

//       // DATE ERROR

//       if (
//         filterResult.error
//       ) {

//         return res.status(400).json({
//           success: false,
//           message:
//             filterResult.error,
//         });
//       }

//       // NO SEARCH MATCH

//       if (
//         filterResult.noMatch
//       ) {

//         return res.status(200).json({
//           success: true,
//           message:
//             "Bookings fetched successfully",

//           data: {

//             pageNumber:
//               page,

//             count:
//               limit,

//             totalCount: 0,

//             totalPages: 0,

//             bookings: [],
//           },
//         });
//       }

//       const filter =
//         filterResult.filter;

//       // ───────────────── GET DATA ─────────────────

//       const [
//         totalCount,
//         bookings,
//       ] = await Promise.all([

//         orderBooking.countDocuments(
//           filter
//         ),

//         orderBooking
//           .find(filter)

//           .populate({
//             path:
//               "apartmentId",

//             select:
//               "apartmentName",
//           })

//           .populate({
//             path:
//               "eventId",

//             select:
//               "eventName",
//           })

//           .sort({
//             createdAt: -1,
//           })

//           .skip(skip)

//           .limit(limit)

//           .lean(),
//       ]);

//       // ───────────────── FORMAT DATA ─────────────────

//       const formattedBookings =
//         bookings.map(
//           (item) => ({

//             ...item,

//             apartmentId:
//               item
//                 .apartmentId
//                 ?._id || null,

//             apartmentName:
//               item
//                 .apartmentId
//                 ?.apartmentName ||
//               "",

//             eventId:
//               item
//                 .eventId
//                 ?._id || null,

//             eventName:
//               item
//                 .eventId
//                 ?.eventName ||
//               "",
//           })
//         );

//       // ───────────────── RESPONSE ─────────────────

//       return res.status(200).json({

//         success: true,

//         message:
//           "Bookings fetched successfully",

//         data: {

//           pageNumber:
//             page,

//           count:
//             limit,

//           totalCount,

//           totalPages:
//             Math.ceil(
//               totalCount /
//               limit
//             ),

//           bookings:
//             formattedBookings,
//         },
//       });
//     }
//   );

// const apartmentEventGet = async (req, res) => {
//   try {

//     // GET ID FROM QUERY PARAMS
//     const { apartmentId } = req.query;

//     // VALIDATION
//     if (!apartmentId) {
//       return res.status(400).json({
//         success: false,
//         message: "id is required",
//       });
//     }
//     // FIND APARTMENT
//     const apartment = await Apartment.findById(apartmentId)
//       .populate("createdBySession")
//       .populate("lastUpdatedBySession");
//     // FIND EVENT
//     const events = await EventBook.find({
//       status: 1,
//     });
//     // NOT FOUND
//     if (!apartment) {
//       return res.status(404).json({
//         success: false,
//         message: "Apartment not found",
//       });
//     }

//     // RESPONSE
//     return res.status(200).json({
//       success: true,
//       message: "Apartment fetched successfully",
//       data: {
//         apartment,
//         events,
//       },
//     });

//   } catch (error) {
//     console.log("GET APARTMENT ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// // ─── Exports ──────────────────────────────────────────────────────────────────
// module.exports = {
//   createBooking, listAllBookings, apartmentEventGet
// };

const mongoose = require("mongoose");
const orderBooking = require("../../../models/Admin/EventHandling/eventOrderSchema");
const Apartment = require("../../../models/Admin/ApartmentSchema/apartment");
const EventBook = require("../../../models/Admin/EventHandling/eventRateSchema");

// ─── Helper Functions ──────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

async function generateAdminOrderId() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const prefix = `${year}${month}${day}`;
  const start = new Date(year, today.getMonth(), today.getDate());
  const end = new Date(year, today.getMonth(), today.getDate() + 1);
  const count = await orderBooking.countDocuments({
    createdAt: { $gte: start, $lt: end },
  });
  return `${prefix}ORD#${count + 1}`;
}

function getFileCategory(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType === "application/vnd.ms-excel" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
    return "excel";
  if (
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "word";
  return "other";
}

function getStatusText(status) {
  const statusMap = {
    0: "All",
    1: "Enquiry",
    2: "Need Analysis",
    3: "Proposal & Price Quote",
    4: "Negotiation & Review",
    5: "Close Won",
    6: "Closed Loss",
  };
  return statusMap[status] || "Unknown";
}

const createBooking = asyncHandler(async (req, res) => {
  const {
    apartmentId,
    eventId,
    fromDate,
    toDate,
    daysOfEvent,
    daysOfApartment,
    promoterRequired,
    promoterCount,
    promoters,
    customerDetails,
    discountPercentage,
    discountType,
    orderNoteText,
    orderNoteFiles,
    sqfet,
  } = req.body;

  // ─────────────────────────────────────────────
  // ORDER NOTE
  // ─────────────────────────────────────────────

  const uploadedFiles = req.files?.orderNoteFiles || [];

  const orderNote = {
    text: req.body.orderNoteText || "",

    files: uploadedFiles.map((file) => ({
      originalName: file.originalname,

      fileName: file.filename,

      filePath: file.path,

      mimeType: file.mimetype,

      size: file.size,

      fileType: getFileCategory(file.mimetype),
    })),
  };

  // ─────────────────────────────────────────────
  // VALIDATE APARTMENT ID
  // ─────────────────────────────────────────────

  if (!apartmentId || !mongoose.Types.ObjectId.isValid(apartmentId)) {
    return res.status(400).json({
      success: false,

      message: !apartmentId ? "apartmentId is required" : "Invalid apartmentId",
    });
  }

  // ─────────────────────────────────────────────
  // VALIDATE EVENT ID
  // ─────────────────────────────────────────────

  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({
      success: false,

      message: !eventId ? "eventId is required" : "Invalid eventId",
    });
  }

  // ─────────────────────────────────────────────
  // VALIDATE PHONE NUMBER
  // ─────────────────────────────────────────────

  const contactPersonPhoneNumber = customerDetails?.contactPersonPhoneNumber;

  if (!contactPersonPhoneNumber) {
    return res.status(400).json({
      success: false,

      message: "customerDetails.contactPersonPhoneNumber is required",
    });
  }

  // ─────────────────────────────────────────────
  // VALIDATE DATES
  // ─────────────────────────────────────────────

  if (!fromDate || !toDate) {
    return res.status(400).json({
      success: false,

      message: !fromDate ? "fromDate is required" : "toDate is required",
    });
  }

  const parsedFromDate = new Date(fromDate);

  const parsedToDate = new Date(toDate);

  if (isNaN(parsedFromDate.getTime())) {
    return res.status(400).json({
      success: false,

      message: "Invalid fromDate",
    });
  }

  if (isNaN(parsedToDate.getTime())) {
    return res.status(400).json({
      success: false,

      message: "Invalid toDate",
    });
  }

  if (parsedToDate < parsedFromDate) {
    return res.status(400).json({
      success: false,
      message: "toDate must be on or after fromDate",
    });
  }

  // ─────────────────────────────────────────────
  // FETCH APARTMENT & EVENT
  // ─────────────────────────────────────────────

  const [apartment, event] = await Promise.all([
    Apartment.findById(apartmentId).lean(),

    EventBook.findById(eventId).lean(),
  ]);

  if (!apartment) {
    return res.status(404).json({
      success: false,

      message: "Apartment not found",
    });
  }

  if (!event) {
    return res.status(404).json({
      success: false,

      message: "Event not found",
    });
  }

  // ─────────────────────────────────────────────
  // STORE SNAPSHOT DETAILS
  // ─────────────────────────────────────────────

  const apartmentDetails = {
    _id: apartment._id,
    apartmentName: apartment.apartmentName,
    apartmentAddress: apartment.apartmentAddress,
    city: apartment.city,
    location: apartment.location,
    perDayRent: apartment.perDayRent,
    contactPersonName: apartment.contactPersonName,
    contactPersonPhone: apartment.contactPersonPhone,
  };

  const eventDetails = {
    _id: event._id,
    eventName: event.eventName,
    amount: event.amount,
    description: event.description,
  };

  // ─────────────────────────────────────────────
  // FIND EXISTING CUSTOMER BOOKING
  // ─────────────────────────────────────────────

  const existingCustomerBooking = await orderBooking.findOne({
    apartmentId,
    eventId,
    "customerDetails.contactPersonPhoneNumber": contactPersonPhoneNumber,
  });

  // ─────────────────────────────────────────────
  // CHECK OVERLAPPING BOOKINGS
  // ─────────────────────────────────────────────

  const overlappingBooking = await orderBooking.findOne({
    _id: {
      $ne: existingCustomerBooking?._id,
    },
    apartmentId,
    eventId,
    fromDate: {
      $lte: parsedToDate,
    },
    toDate: {
      $gte: parsedFromDate,
    },
  });

  if (overlappingBooking) {
    return res.status(409).json({
      success: false,
      message: `Already booked from ${overlappingBooking.fromDate.toDateString()} to ${overlappingBooking.toDate.toDateString()}`,
    });
  }
  const apartmentAmount = Math.floor(
    (apartment.perDayRent || 0) * (daysOfApartment || 0),
  );
  const sqfetAmount = Math.floor((apartment.perDayRent || 0) * (sqfet || 0));
  const eventAmount = Math.floor((event.amount || 0) * (daysOfEvent || 0));
  let promoterTotal = 0;
  const promotersWithAmount = (promoters || []).map((p) => {
    const promoterAmount = Math.floor(
      (p.promoterPerDayCharge || 0) * (daysOfEvent || 0),
    );

    promoterTotal += promoterAmount;

    return {
      ...p,
      promoterAmount,
    };
  });

  const subTotal = Math.floor(
    apartmentAmount + eventAmount + promoterTotal + sqfetAmount,
  );

  let discountAmount = 0;

  // 1 = Percentage
  if (discountType === 1) {
    discountAmount = Math.floor((subTotal * (discountPercentage || 0)) / 100);
  }
  // 2 = Flat
  else if (discountType === 2) {
    discountAmount = Math.floor(discountPercentage || 0);
  }

  const taxableAmount = Math.floor(subTotal - discountAmount);
  const gstAmount = Math.floor((taxableAmount * 18) / 100);
  const totalAmount = Math.floor(taxableAmount + gstAmount);
  // ─────────────────────────────────────────────
  // UPDATE EXISTING BOOKING
  // ─────────────────────────────────────────────

  if (existingCustomerBooking) {
    existingCustomerBooking.fromDate = parsedFromDate;
    existingCustomerBooking.toDate = parsedToDate;
    existingCustomerBooking.daysOfEvent = daysOfEvent;
    existingCustomerBooking.daysOfApartment = daysOfApartment;
    existingCustomerBooking.sqfet = sqfet;
    existingCustomerBooking.promoterRequired = promoterRequired;
    existingCustomerBooking.promoterCount = promoterCount;
    existingCustomerBooking.promoters = promotersWithAmount;
    existingCustomerBooking.customerDetails = customerDetails;
    existingCustomerBooking.discountPercentage = discountPercentage;
    existingCustomerBooking.discountType = discountType;
    existingCustomerBooking.apartmentAmount = apartmentAmount;
    existingCustomerBooking.sqfetAmount = sqfetAmount;
    existingCustomerBooking.eventAmount = eventAmount;
    existingCustomerBooking.promoterTotal = promoterTotal;
    existingCustomerBooking.subTotal = subTotal;
    existingCustomerBooking.discountAmount = discountAmount;
    existingCustomerBooking.taxableAmount = taxableAmount;
    existingCustomerBooking.gstAmount = gstAmount;
    existingCustomerBooking.totalAmount = totalAmount;
    existingCustomerBooking.apartmentDetails = apartmentDetails;
    existingCustomerBooking.eventDetails = eventDetails;
    existingCustomerBooking.orderNote = orderNote;
    existingCustomerBooking.updatedBy = req.user?.name;
    await existingCustomerBooking.save();

    return res.status(200).json({
      success: true,
      message: "Booking updated successfully",
    });
  }

  // ─────────────────────────────────────────────
  // GENERATE ORDER ID
  // ─────────────────────────────────────────────

  const orderId = await generateAdminOrderId();

  // ─────────────────────────────────────────────
  // CREATE BOOKING
  // ─────────────────────────────────────────────

  const booking = await orderBooking.create({
    orderId,
    apartmentId,
    eventId,
    apartmentDetails,
    eventDetails,
    fromDate: parsedFromDate,
    toDate: parsedToDate,
    daysOfEvent,
    daysOfApartment,
    sqfet,
    promoterRequired,
    promoterCount,
    promoters: promotersWithAmount,
    customerDetails,
    discountPercentage,
    discountType,
    apartmentAmount,
    sqfetAmount,
    eventAmount,
    promoterTotal,
    subTotal,
    discountAmount,
    taxableAmount,
    gstAmount,
    totalAmount,
    orderNote,
    orderStatus: 1,
    createdBy: req.user?.name,
    updatedBy: req.user?.name,
  });
  return res.status(201).json({
    success: true,
    message: "Booking created successfully",
  });
});

// ─── LIST BOOKINGS ──────────────────────────────────────────────────
const parseDate = (dateString) => {
  if (!dateString) return null;
  const parts = dateString.split("-");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const parsedDate = new Date(`${year}-${month}-${day}`);
  return isNaN(parsedDate) ? null : parsedDate;
};

const buildBookingFilters = async (body) => {
  const { apartmentId, orderStatus, fromDate, toDate, search } = body;
  let filter = {};
  if (apartmentId && mongoose.Types.ObjectId.isValid(apartmentId)) {
    filter.apartmentId = new mongoose.Types.ObjectId(apartmentId);
  }
  if (orderStatus !== undefined && orderStatus !== null && orderStatus !== "") {
    const statusValue = Number(orderStatus);
    if (statusValue !== 0) {
      filter.orderStatus = statusValue;
    }
  }
  if (fromDate || toDate) {
    filter.fromDate = {};
    if (fromDate) {
      const startDate = parseDate(fromDate);
      if (!startDate)
        return { error: "Invalid fromDate format. Use DD-MM-YYYY" };
      filter.fromDate.$gte = startDate;
    }
    if (toDate) {
      const endDate = parseDate(toDate);
      if (!endDate) return { error: "Invalid toDate format. Use DD-MM-YYYY" };
      endDate.setHours(23, 59, 59, 999);
      filter.fromDate.$lte = endDate;
    }
  }
  if (search && search.trim() !== "") {
    const searchRegex = new RegExp(search.trim(), "i");
    const matchedApartments = await Apartment.find(
      { apartmentName: searchRegex },
      "_id",
    ).lean();
    const matchedEvents = await EventBook.find(
      { eventName: searchRegex },
      "_id",
    ).lean();
    const apartmentIds = matchedApartments.map((item) => item._id);
    const eventIds = matchedEvents.map((item) => item._id);
    let orConditions = [];
    if (apartmentIds.length > 0)
      orConditions.push({ apartmentId: { $in: apartmentIds } });
    if (eventIds.length > 0) orConditions.push({ eventId: { $in: eventIds } });
    if (orConditions.length === 0) return { noMatch: true, filter };
    filter.$or = orConditions;
  }
  return { filter };
};

const listAllBookings = asyncHandler(async (req, res) => {
  const { pageNumber, count } = req.body || {};
  if (!pageNumber || !count) {
    return res
      .status(400)
      .json({ success: false, message: "pageNumber and count are required" });
  }
  const page = parseInt(pageNumber);
  const limit = parseInt(count);
  const skip = (page - 1) * limit;
  const filterResult = await buildBookingFilters(req.body);
  if (filterResult.error) {
    return res
      .status(400)
      .json({ success: false, message: filterResult.error });
  }
  if (filterResult.noMatch) {
    return res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      data: {
        pageNumber: page,
        count: limit,
        totalCount: 0,
        totalPages: 0,
        bookings: [],
      },
    });
  }

  const filter = filterResult.filter;
  const [totalCount, bookings] = await Promise.all([
    orderBooking.countDocuments(filter),
    orderBooking
      .find(filter)
      .populate({ path: "apartmentId", select: "apartmentName" })
      .populate({ path: "eventId", select: "eventName" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const formattedBookings = bookings.map((item) => ({
    ...item,
    orderStatusText: getStatusText(item.orderStatus),
    apartmentId: item.apartmentId?._id || null,
    apartmentName: item.apartmentId?.apartmentName || "",
    eventId: item.eventId?._id || null,
    eventName: item.eventId?.eventName || "",
  }));

  return res.status(200).json({
    success: true,
    message: "Bookings fetched successfully",
    data: {
      pageNumber: page,
      count: limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      bookings: formattedBookings,
    },
  });
});

const apartmentEventGet = async (req, res) => {
  try {
    const { apartmentId } = req.query;
    if (!apartmentId) {
      return res
        .status(400)
        .json({ success: false, message: "apartmentId is required" });
    }
    const apartment = await Apartment.findById(apartmentId)
      .populate("createdBySession")
      .populate("lastUpdatedBySession");
    const events = await EventBook.find({ status: 1 });
    if (!apartment) {
      return res
        .status(404)
        .json({ success: false, message: "Apartment not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Apartment fetched successfully",
      data: { apartment, events },
    });
  } catch (error) {
    console.log("GET APARTMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ─── STATUS CHANGE ONLY API (SINGLE PURPOSE) ──────────────────────────
// const updateOrderStatusOnly = asyncHandler(async (req, res) => {
//   const { orderId } = req.query;
//   const {
//     status,
//     additionalNotes,
//     negotiationAmount,
//     closeLossReason,
//     poDocument,
//     statusDocument,
//   } = req.body;

//   // ─────────────────────────────────────────────
//   // VALIDATIONS
//   // ─────────────────────────────────────────────

//   if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
//     return res.status(400).json({
//       success: false,
//       message: !orderId ? "orderId is required" : "Invalid orderId",
//     });
//   }

//   if (status === undefined || status === null) {
//     return res.status(400).json({
//       success: false,
//       message: "status is required",
//     });
//   }

//   const newStatus = Number(status);
//   if (![1, 2, 3, 4, 5, 6].includes(newStatus)) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid status value. Allowed values: 1,2,3,4,5,6",
//     });
//   }

//   // FIND ORDER
//   const order = await orderBooking.findById(orderId);
//   if (!order) {
//     return res.status(404).json({
//       success: false,
//       message: "Order not found",
//     });
//   }

//   const currentStatus = order.orderStatus;

//   // CHECK IF STATUS IS ALREADY SAME
//   if (currentStatus === newStatus) {
//     return res.status(400).json({
//       success: false,
//       message: `Order is already in ${getStatusText(currentStatus)} status`,
//     });
//   }

//   // ─────────────────────────────────────────────
//   // VALIDATE STATUS TRANSITION
//   // ─────────────────────────────────────────────
//   const validTransitions = {
//     1: [2], // Enquiry → Need Analysis
//     2: [3], // Need Analysis → Proposal & Price Quote
//     3: [4], // Proposal & Price Quote → Negotiation & Review
//     4: [5, 6], // Negotiation & Review → Close Won OR Closed Loss
//     5: [], // Close Won - Terminal State (No further changes)
//     6: [], // Closed Loss - Terminal State (No further changes)
//   };

//   if (!validTransitions[currentStatus]?.includes(newStatus)) {
//     return res.status(400).json({
//       success: false,
//       message: `Invalid status transition from ${getStatusText(currentStatus)} to ${getStatusText(newStatus)}. Allowed transitions: ${validTransitions[currentStatus]?.map((s) => getStatusText(s)).join(", ") || "None"}`,
//     });
//   }
//   // ─────────────────────────────────────────────
//   // HELPER FUNCTION: Process uploaded document
//   // ─────────────────────────────────────────────
//   const processUploadedDocument = (uploadedFile, documentData) => {
//     let resolvedDocument = null;

//     if (uploadedFile) {
//       // File was uploaded (local or Spaces)
//       const {
//         getFileUrl,
//         STORAGE_TYPE,
//       } = require("../../../middleware/orderNoteFileUpload");

//       resolvedDocument = {
//         originalName: uploadedFile.originalname,
//         fileName: uploadedFile.filename || uploadedFile.key?.split("/").pop(),
//         filePath: getFileUrl(req, uploadedFile),
//         mimeType: uploadedFile.mimetype,
//         size: uploadedFile.size,
//         fileType: getFileCategory(uploadedFile.mimetype),
//         uploadedAt: new Date(),
//       };
//     } else if (documentData) {
//       // Fallback: document passed as JSON in req.body (no file upload)
//       resolvedDocument = documentData;
//     }

//     return resolvedDocument;
//   };

//   // ─────────────────────────────────────────────
//   // PROCESS STATUS DOCUMENT (Optional - for any status change)
//   // ─────────────────────────────────────────────
//   let resolvedStatusDocument = null;
//   const uploadedStatusFile = req.files?.statusDocument?.[0];

//   if (uploadedStatusFile || statusDocument) {
//     resolvedStatusDocument = processUploadedDocument(uploadedStatusFile, statusDocument);
    
//     // Validate document structure if provided
//     if (resolvedStatusDocument) {
//       if (!resolvedStatusDocument.originalName || 
//           !resolvedStatusDocument.fileName || 
//           !resolvedStatusDocument.filePath) {
//         return res.status(400).json({
//           success: false,
//           message: "statusDocument must contain originalName, fileName, and filePath",
//         });
//       }
//     }
//   }
//   // ─────────────────────────────────────────────
//   // STATUS SPECIFIC VALIDATIONS
//   // ─────────────────────────────────────────────

//   let historyEntry = {
//     fromStatus: currentStatus,
//     toStatus: newStatus,
//     changedBy: req.user?.name || "Admin",
//     changedAt: new Date(),
//       additionalNotes: additionalNotes || "", // Optional, can be empty
//     statusDocument: resolvedStatusDocument, // Optional document for this status change
//   };

//    // 1 → 2: Need Analysis
//   if (currentStatus === 1 && newStatus === 2) {
//     if (additionalNotes) order.additionalNotes = additionalNotes;
    
//     // Store status document in order if provided
//     if (resolvedStatusDocument) {
//       if (!order.statusDocuments) order.statusDocuments = [];
//       order.statusDocuments.push({
//         status: newStatus,
//         document: resolvedStatusDocument,
//         notes: additionalNotes || "",
//         uploadedAt: new Date(),
//         uploadedBy: req.user?.name || "Admin",
//       });
//     }
//   }

//   // 2 → 3: Proposal & Price Quote
//   else if (currentStatus === 2 && newStatus === 3) {
//     if (additionalNotes) order.additionalNotes = additionalNotes;
    
//     if (resolvedStatusDocument) {
//       if (!order.statusDocuments) order.statusDocuments = [];
//       order.statusDocuments.push({
//         status: newStatus,
//         document: resolvedStatusDocument,
//         notes: additionalNotes || "",
//         uploadedAt: new Date(),
//         uploadedBy: req.user?.name || "Admin",
//       });
//     }
//   }

//   // 3 → 4: Negotiation & Review
//   else if (currentStatus === 3 && newStatus === 4) {
//     if (additionalNotes) order.additionalNotes = additionalNotes;

//     if (negotiationAmount !== undefined && negotiationAmount !== null) {
//       const totalAmount = Number(order.totalAmount || 0);
//       const negotiationAmt = Number(negotiationAmount);
//       const finalAmount = totalAmount - negotiationAmt;

//       if (finalAmount < 0) {
//         return res.status(400).json({
//           success: false,
//           message: "Negotiation amount cannot be greater than total amount",
//         });
//       }

//       historyEntry.negotiationAmount = negotiationAmt;
//       historyEntry.finalAmount = finalAmount;

//       order.negotiationAmount = negotiationAmt;
//       order.finalAmount = finalAmount;
//     }
    
//     if (resolvedStatusDocument) {
//       if (!order.statusDocuments) order.statusDocuments = [];
//       order.statusDocuments.push({
//         status: newStatus,
//         document: resolvedStatusDocument,
//         notes: additionalNotes || "",
//         uploadedAt: new Date(),
//         uploadedBy: req.user?.name || "Admin",
//       });
//     }
//   }
  
//   // 4 → 5: Close Won
//   else if (currentStatus === 4 && newStatus === 5) {
//     // Process PO Document (mandatory for Close Won)
//     let resolvedPoDocument = null;
//     const uploadedPoFile = req.files?.poDocument?.[0];

//     if (uploadedPoFile) {
//       const {
//         getFileUrl,
//         STORAGE_TYPE,
//       } = require("../../../middleware/orderNoteFileUpload");

//       resolvedPoDocument = {
//         originalName: uploadedPoFile.originalname,
//         fileName: uploadedPoFile.filename || uploadedPoFile.key?.split("/").pop(),
//         filePath: getFileUrl(req, uploadedPoFile),
//         mimeType: uploadedPoFile.mimetype,
//         size: uploadedPoFile.size,
//         fileType: getFileCategory(uploadedPoFile.mimetype),
//         uploadedAt: new Date(),
//       };
//     } else if (poDocument) {
//       resolvedPoDocument = poDocument;
//     }

//     // Validate PO Document (mandatory for Close Won)
//     if (!resolvedPoDocument) {
//       return res.status(400).json({
//         success: false,
//         message: "poDocument is mandatory when moving to Close Won",
//       });
//     }

//     if (!resolvedPoDocument.originalName ||
//         !resolvedPoDocument.fileName ||
//         !resolvedPoDocument.filePath) {
//       return res.status(400).json({
//         success: false,
//         message: "poDocument must contain originalName, fileName, and filePath",
//       });
//     }

//     historyEntry.poDocument = resolvedPoDocument;
//     order.poDocument = resolvedPoDocument;
    
//     // Also store status document if provided
//     if (resolvedStatusDocument) {
//       if (!order.statusDocuments) order.statusDocuments = [];
//       order.statusDocuments.push({
//         status: newStatus,
//         document: resolvedStatusDocument,
//         notes: additionalNotes || "",
//         uploadedAt: new Date(),
//         uploadedBy: req.user?.name || "Admin",
//       });
//     }
//   }

//   // 4 → 6: Closed Loss
//   else if (currentStatus === 4 && newStatus === 6) {
//     if (!closeLossReason || closeLossReason.trim() === "") {
//       return res.status(400).json({
//         success: false,
//         message: "closeLossReason is required when moving to Closed Loss",
//       });
//     }
    
//     historyEntry.closeLossReason = closeLossReason;
//     order.closeLossReason = closeLossReason;
    
//     if (resolvedStatusDocument) {
//       if (!order.statusDocuments) order.statusDocuments = [];
//       order.statusDocuments.push({
//         status: newStatus,
//         document: resolvedStatusDocument,
//         notes: additionalNotes || "",
//         uploadedAt: new Date(),
//         uploadedBy: req.user?.name || "Admin",
//       });
//     }
//   }

//   // ─────────────────────────────────────────────
//   // UPDATE ORDER
//   // ─────────────────────────────────────────────
//   order.orderStatus = newStatus;
//   order.updatedBy = req.user?.name;

//    // Only update additionalNotes if provided
//   if (additionalNotes) {
//     order.additionalNotes = additionalNotes;
//   }
//   // ADD TO ORDER HISTORY
//   if (!order.orderHistory) {
//     order.orderHistory = [];
//   }
//   order.orderHistory.push(historyEntry);

//   await order.save();

//   // ─────────────────────────────────────────────
//   // RESPONSE
//   // ─────────────────────────────────────────────
//   return res.status(200).json({
//     success: true,
//     message: `Order status updated to ${getStatusText(newStatus)} successfully`,
//     data: {
//       orderId: order._id,
//       orderNo: order.orderId,
//       previousStatus: getStatusText(currentStatus),
//       currentStatus: getStatusText(newStatus),
//       updatedAt: new Date(),
//     },
//   });
// });
const updateOrderStatusOnly = asyncHandler(async (req, res) => {
  const { orderId } = req.query;
  const {
    status,
    additionalNotes,
    negotiationAmount,
    closeLossReason,
    poDocument, // For Close Won only
    statusDocument, // Generic document for any status change (optional)
    voiceDocument,
  } = req.body;

  // ─────────────────────────────────────────────
  // VALIDATIONS
  // ─────────────────────────────────────────────

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({
      success: false,
      message: !orderId ? "orderId is required" : "Invalid orderId",
    });
  }

  if (status === undefined || status === null) {
    return res.status(400).json({
      success: false,
      message: "status is required",
    });
  }

  const newStatus = Number(status);
  if (![1, 2, 3, 4, 5, 6].includes(newStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status value. Allowed values: 1,2,3,4,5,6",
    });
  }

  // FIND ORDER
  const order = await orderBooking.findById(orderId);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found",
    });
  }

  const currentStatus = order.orderStatus;

  // CHECK IF STATUS IS ALREADY SAME
  if (currentStatus === newStatus) {
    return res.status(400).json({
      success: false,
      message: `Order is already in ${getStatusText(currentStatus)} status`,
    });
  }

  // ─────────────────────────────────────────────
  // VALIDATE STATUS TRANSITION - FULLY FLEXIBLE
  // ─────────────────────────────────────────────
  // Allow ANY status to move to ANY other status
  // Just check that it's a different status
  const validTransitions = {
    1: [2, 3, 4, 5, 6], // Enquiry → Any status
    2: [1, 3, 4, 5, 6], // Need Analysis → Any status (including back to 1)
    3: [1, 2, 4, 5, 6], // Proposal & Price Quote → Any status
    4: [1, 2, 3, 5, 6], // Negotiation & Review → Any status
    5: [1, 2, 3, 4, 6], // Close Won → Any status (reopen)
    6: [1, 2, 3, 4, 5], // Closed Loss → Any status (reopen)
  };

  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status transition from ${getStatusText(currentStatus)} to ${getStatusText(newStatus)}.`,
    });
  }

  // ─────────────────────────────────────────────
  // HELPER FUNCTION: Process uploaded document
  // ─────────────────────────────────────────────
  const processUploadedDocument = (uploadedFile, documentData) => {
    let resolvedDocument = null;

    if (uploadedFile) {
      // File was uploaded (local or Spaces)
      const {
        getFileUrl,
        STORAGE_TYPE,
      } = require("../../../middleware/orderNoteFileUpload");

      resolvedDocument = {
        originalName: uploadedFile.originalname,
        fileName: uploadedFile.filename || uploadedFile.key?.split("/").pop(),
        filePath: getFileUrl(req, uploadedFile),
        mimeType: uploadedFile.mimetype,
        size: uploadedFile.size,
        fileType: getFileCategory(uploadedFile.mimetype),
        uploadedAt: new Date(),
      };
    } else if (documentData) {
      // Fallback: document passed as JSON in req.body (no file upload)
      resolvedDocument = documentData;
    }

    return resolvedDocument;
  };

  // ─────────────────────────────────────────────
  // PROCESS STATUS DOCUMENT (Optional - for any status change)
  // ─────────────────────────────────────────────
  let resolvedStatusDocument = null;
  const uploadedStatusFile = req.files?.statusDocument?.[0];

  if (uploadedStatusFile || statusDocument) {
    resolvedStatusDocument = processUploadedDocument(uploadedStatusFile, statusDocument);
    
    // Validate document structure if provided
    if (resolvedStatusDocument) {
      if (!resolvedStatusDocument.originalName || 
          !resolvedStatusDocument.fileName || 
          !resolvedStatusDocument.filePath) {
        return res.status(400).json({
          success: false,
          message: "statusDocument must contain originalName, fileName, and filePath",
        });
      }
    }
  }
const processVoiceNote = (uploadedFile, voiceNoteData) => {
    let resolvedVoiceNote = null;

    if (uploadedFile) {
      const {
        getFileUrl,
        STORAGE_TYPE,
      } = require("../../../middleware/orderNoteFileUpload");

      // Validate that it's an audio file
      if (!uploadedFile.mimetype.startsWith("audio/")) {
        throw new Error("Uploaded file is not an audio file");
      }

      resolvedVoiceNote = {
        originalName: uploadedFile.originalname,
        fileName: uploadedFile.filename || uploadedFile.key?.split("/").pop(),
        filePath: getFileUrl(req, uploadedFile),
        mimeType: uploadedFile.mimetype,
        size: uploadedFile.size,
        fileType: "audio",
        duration: null, // You can add duration extraction logic here
        uploadedAt: new Date(),
      };
    } else if (voiceNoteData) {
      resolvedVoiceNote = voiceNoteData;
      
      // Validate voice note data
      if (resolvedVoiceNote && !resolvedVoiceNote.mimeType?.startsWith("audio/")) {
        throw new Error("Voice note must be an audio file");
      }
    }

    return resolvedVoiceNote;
  };

   // ─────────────────────────────────────────────
  // PROCESS VOICE NOTE (Optional - for any status change)
  // ─────────────────────────────────────────────
  let resolvedVoiceNote = null;
  const uploadedVoiceFile = req.files?.voiceDocument?.[0];

  try {
    if (uploadedVoiceFile || voiceDocument) {
      resolvedVoiceNote = processVoiceNote(
        uploadedVoiceFile, 
        voiceDocument
      );
      
      // Validate voice note structure if provided
      if (resolvedVoiceNote) {
        if (!resolvedVoiceNote.originalName || 
            !resolvedVoiceNote.fileName || 
            !resolvedVoiceNote.filePath ||
            !resolvedVoiceNote.mimeType) {
          return res.status(400).json({
            success: false,
            message: "voiceNote must contain originalName, fileName, filePath, and mimeType",
          });
        }
      }
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  // ─────────────────────────────────────────────
  // STATUS SPECIFIC VALIDATIONS & PROCESSING
  // ─────────────────────────────────────────────

  let historyEntry = {
    fromStatus: currentStatus,
    toStatus: newStatus,
    changedBy: req.user?.name || "Admin",
    changedAt: new Date(),
    additionalNotes: additionalNotes || "",
    statusDocument: resolvedStatusDocument,
    voiceDocument: resolvedVoiceNote,
  };

  // Handle status-specific validations based on TARGET status
  // For any transition TO status 5 (Close Won)
  if (newStatus === 5) {
    // Process PO Document (mandatory for Close Won)
    let resolvedPoDocument = null;
    const uploadedPoFile = req.files?.poDocument?.[0];

    if (uploadedPoFile) {
      const {
        getFileUrl,
        STORAGE_TYPE,
      } = require("../../../middleware/orderNoteFileUpload");

      resolvedPoDocument = {
        originalName: uploadedPoFile.originalname,
        fileName: uploadedPoFile.filename || uploadedPoFile.key?.split("/").pop(),
        filePath: getFileUrl(req, uploadedPoFile),
        mimeType: uploadedPoFile.mimetype,
        size: uploadedPoFile.size,
        fileType: getFileCategory(uploadedPoFile.mimetype),
        uploadedAt: new Date(),
      };
    } else if (poDocument) {
      resolvedPoDocument = poDocument;
    }

    // Validate PO Document (mandatory for Close Won)
    if (!resolvedPoDocument) {
      return res.status(400).json({
        success: false,
        message: "poDocument is mandatory when moving to Close Won",
      });
    }

    if (!resolvedPoDocument.originalName ||
        !resolvedPoDocument.fileName ||
        !resolvedPoDocument.filePath) {
      return res.status(400).json({
        success: false,
        message: "poDocument must contain originalName, fileName, and filePath",
      });
    }

    historyEntry.poDocument = resolvedPoDocument;
    order.poDocument = resolvedPoDocument;
  }

  // For any transition TO status 6 (Closed Loss)
  else if (newStatus === 6) {
    if (!closeLossReason || closeLossReason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "closeLossReason is required when moving to Closed Loss",
      });
    }
    
    historyEntry.closeLossReason = closeLossReason;
    order.closeLossReason = closeLossReason;
  }

  // For any transition TO status 4 (Negotiation & Review)
  else if (newStatus === 4) {
    // Handle negotiation amount if provided
    if (negotiationAmount !== undefined && negotiationAmount !== null) {
      const totalAmount = Number(order.totalAmount || 0);
      const negotiationAmt = Number(negotiationAmount);
      const finalAmount = totalAmount - negotiationAmt;

      if (finalAmount < 0) {
        return res.status(400).json({
          success: false,
          message: "Negotiation amount cannot be greater than total amount",
        });
      }

      historyEntry.negotiationAmount = negotiationAmt;
      historyEntry.finalAmount = finalAmount;

      order.negotiationAmount = negotiationAmt;
      order.finalAmount = finalAmount;
    }
  }

  // ─────────────────────────────────────────────
  // HANDLE REOPENING LOGIC (Moving from terminal to active)
  // ─────────────────────────────────────────────
  
  // If moving from Closed Won (5) or Closed Loss (6) to any other status
  if ((currentStatus === 5 || currentStatus === 6) && newStatus !== currentStatus) {
    // Clear terminal-specific fields when reopening
    if (currentStatus === 5) {
      // Optionally clear poDocument or keep for history
      // order.poDocument = null; // Uncomment if you want to clear
    }
    if (currentStatus === 6) {
      // Optionally clear closeLossReason
      // order.closeLossReason = ""; // Uncomment if you want to clear
    }
    
    // Add a remark in history about reopening
    historyEntry.remarks = `Order reopened from ${getStatusText(currentStatus)} to ${getStatusText(newStatus)}`;
  }

  // ─────────────────────────────────────────────
  // COMMON UPDATES FOR ALL STATUS CHANGES
  // ─────────────────────────────────────────────

  // Update additionalNotes if provided
  if (additionalNotes) {
    order.additionalNotes = additionalNotes;
  }

  // Store status document if provided (for any status change)
  if (resolvedStatusDocument) {
    if (!order.statusDocuments) order.statusDocuments = [];
    order.statusDocuments.push({
      fromStatus: currentStatus,
      toStatus: newStatus,
      document: resolvedStatusDocument,
      notes: additionalNotes || "",
      uploadedAt: new Date(),
      uploadedBy: req.user?.name || "Admin",
    });
  }


  if (resolvedVoiceNote) {
    if (!order.voiceNotes) order.voiceNotes = [];
    order.voiceNotes.push({
      fromStatus: currentStatus,
      toStatus: newStatus,
      voiceNote: resolvedVoiceNote,
      notes:  additionalNotes || "",
      uploadedAt: new Date(),
      uploadedBy: req.user?.name || "Admin",
    });
  }

  // ─────────────────────────────────────────────
  // UPDATE ORDER
  // ─────────────────────────────────────────────
  order.orderStatus = newStatus;
  order.updatedBy = req.user?.name;

  // ADD TO ORDER HISTORY
  if (!order.orderHistory) {
    order.orderHistory = [];
  }
  order.orderHistory.push(historyEntry);

  await order.save();

  // ─────────────────────────────────────────────
  // RESPONSE
  // ─────────────────────────────────────────────
  return res.status(200).json({
    success: true,
    message: `Order status updated from ${getStatusText(currentStatus)} to ${getStatusText(newStatus)} successfully`,
    data: {
      orderId: order._id,
      orderNo: order.orderId,
      previousStatus: getStatusText(currentStatus),
      currentStatus: getStatusText(newStatus),
      hasAdditionalNotes: !!additionalNotes,
      hasDocument: !!resolvedStatusDocument,
      hasVoiceNote: !!resolvedVoiceNote,
      updatedAt: new Date(),
    },
  });
});
// ─── GET SINGLE ORDER DETAILS ──────────────────────────────────
const getOrderDetails = asyncHandler(async (req, res) => {
  const { orderId } = req.query;

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({
      success: false,
      message: !orderId ? "orderId is required" : "Invalid orderId",
    });
  }

  const order = await orderBooking
    .findById(orderId)
    .populate(
      "apartmentId",
      "apartmentName apartmentAddress city location perDayRent",
    )
    .populate("eventId", "eventName amount description")
    .lean();

  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }
  const formattedOrderHistory =
    order.orderHistory?.map((history) => ({
      fromStatus: history.fromStatus,
      fromStatusText:
        history.fromStatus !== null
          ? getStatusText(history.fromStatus)
          : "Created",
      toStatus: history.toStatus,
      toStatusText: getStatusText(history.toStatus),
      changedBy: history.changedBy,
      changedAt: history.changedAt,
      remarks: history.remarks,
      additionalNotes: history.additionalNotes,
      negotiationAmount: history.negotiationAmount,
      closeLossReason: history.closeLossReason,
      poDocument: history.poDocument,
      statusDocument: history.statusDocument,
      voiceDocument: history.voiceDocument,
    })) || [];

  const formattedOrder = {
    ...order,
    orderStatusText: getStatusText(order.orderStatus),
    orderHistory: formattedOrderHistory,
  };
  return res.status(200).json({
    success: true,
    message: "Order fetched successfully",
    data: formattedOrder,
  });
});

module.exports = {
  createBooking,
  listAllBookings,
  apartmentEventGet,
  getOrderDetails,
  updateOrderStatusOnly,
};
