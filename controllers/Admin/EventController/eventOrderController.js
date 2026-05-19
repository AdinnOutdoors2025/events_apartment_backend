const mongoose = require("mongoose");
const orderBooking = require("../../../models/Admin/EventHandling/eventOrderSchema");
const Apartment = require("../../../models/Admin/apartment")
const EventBook = require("../../../models/Admin/EventHandling/eventRateSchema")
// ─── Helper ──────────────────────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─── CREATE / UPDATE Booking ──────────────────────────────────────────────────

const createBooking =asyncHandler(async (req, res) => {

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
    } = req.body;

    // ─────────────────────────────────────────────
    // VALIDATE OBJECT IDS
    // ─────────────────────────────────────────────

    if (
      !apartmentId ||
      !mongoose.Types.ObjectId.isValid(
        apartmentId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: !apartmentId
          ? "apartmentId is required"
          : "Invalid apartmentId",
      });
    }

    if (
      !eventId ||
      !mongoose.Types.ObjectId.isValid(
        eventId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: !eventId
          ? "eventId is required"
          : "Invalid eventId",
      });
    }

    // ─────────────────────────────────────────────
    // VALIDATE PHONE NUMBER
    // ─────────────────────────────────────────────

    const contactPersonPhoneNumber =
      customerDetails
        ?.contactPersonPhoneNumber;

    if (
      !contactPersonPhoneNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "customerDetails.contactPersonPhoneNumber is required",
      });
    }

    // ─────────────────────────────────────────────
    // VALIDATE DATES
    // ─────────────────────────────────────────────

    if (
      !fromDate ||
      !toDate
    ) {
      return res.status(400).json({
        success: false,
        message: !fromDate
          ? "fromDate is required"
          : "toDate is required",
      });
    }

    const parsedFromDate =
      new Date(fromDate);

    const parsedToDate =
      new Date(toDate);

    if (
      isNaN(
        parsedFromDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid fromDate",
      });
    }

    if (
      isNaN(
        parsedToDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid toDate",
      });
    }

    if (
      parsedToDate <
      parsedFromDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "toDate must be on or after fromDate",
      });
    }

    // ─────────────────────────────────────────────
    // FETCH APARTMENT & EVENT
    // ─────────────────────────────────────────────

    const [
      apartment,
      event,
    ] = await Promise.all([
      Apartment.findById(
        apartmentId
      ),
      EventBook.findById(
        eventId
      ),
    ]);

    if (!apartment) {
      return res.status(404).json({
        success: false,
        message:
          "Apartment not found",
      });
    }

    if (!event) {
      return res.status(404).json({
        success: false,
        message:
          "Event not found",
      });
    }

    // ─────────────────────────────────────────────
    // FIND CUSTOMER EXISTING BOOKING
    // SAME apartment + event + phone
    // ─────────────────────────────────────────────

    const existingCustomerBooking =
      await orderBooking.findOne({
        apartmentId,
        eventId,
        "customerDetails.contactPersonPhoneNumber":
          contactPersonPhoneNumber,
      });

    // ─────────────────────────────────────────────
    // CHECK OVERLAPPING
    // EXCLUDE CURRENT CUSTOMER BOOKING
    // ─────────────────────────────────────────────

    const overlappingBooking =
      await orderBooking.findOne({
        _id: {
          $ne:
            existingCustomerBooking?._id,
        },

        apartmentId,

        eventId,

        fromDate: {
          $lte:
            parsedToDate,
        },

        toDate: {
          $gte:
            parsedFromDate,
        },
      });

    if (
      overlappingBooking
    ) {
      return res.status(409).json({
        success: false,
        message:
          `Already booked from ${overlappingBooking.fromDate.toDateString()} to ${overlappingBooking.toDate.toDateString()}`,
      });
    }

    // ─────────────────────────────────────────────
    // CALCULATIONS
    // ─────────────────────────────────────────────

    const apartmentAmount =
      (apartment.perDayRent ||
        0) *
      (daysOfApartment ||
        0);

    const eventAmount =
      (event.amount || 0) *
      (daysOfEvent || 0);

    let promoterTotal =
      0;

    const promotersWithAmount =
      (
        promoters || []
      ).map((p) => {

        const promoterAmount =
          (
            p.promoterPerDayCharge ||
            0
          ) *
          (
            daysOfEvent ||
            0
          );

        promoterTotal +=
          promoterAmount;

        return {
          ...p,
          promoterAmount,
        };
      });

    const subTotal =
      apartmentAmount +
      eventAmount +
      promoterTotal;

    let discountAmount =
      0;

    // 1 = Percentage
    if (
      discountType === 1
    ) {
      discountAmount =
        (subTotal *
          (
            discountPercentage ||
            0
          )) /
        100;
    }

    // 2 = Flat
    else if (
      discountType === 2
    ) {
      discountAmount =
        discountPercentage ||
        0;
    }

    const taxableAmount =
      subTotal -
      discountAmount;

    const gstAmount =
      (taxableAmount *
        18) /
      100;

    const totalAmount =
      taxableAmount +
      gstAmount;

    // ─────────────────────────────────────────────
    // UPDATE EXISTING CUSTOMER BOOKING
    // ─────────────────────────────────────────────

    if (
      existingCustomerBooking
    ) {

      existingCustomerBooking.fromDate =
        parsedFromDate;

      existingCustomerBooking.toDate =
        parsedToDate;

      existingCustomerBooking.daysOfEvent =
        daysOfEvent;

      existingCustomerBooking.daysOfApartment =
        daysOfApartment;

      existingCustomerBooking.promoterRequired =
        promoterRequired;

      existingCustomerBooking.promoterCount =
        promoterCount;

      existingCustomerBooking.promoters =
        promotersWithAmount;

      existingCustomerBooking.customerDetails =
        customerDetails;

      existingCustomerBooking.discountPercentage =
        discountPercentage;

      existingCustomerBooking.discountType =
        discountType;

      existingCustomerBooking.apartmentAmount =
        apartmentAmount;

      existingCustomerBooking.eventAmount =
        eventAmount;

      existingCustomerBooking.promoterTotal =
        promoterTotal;

      existingCustomerBooking.subTotal =
        subTotal;

      existingCustomerBooking.discountAmount =
        discountAmount;

      existingCustomerBooking.taxableAmount =
        taxableAmount;

      existingCustomerBooking.gstAmount =
        gstAmount;

      existingCustomerBooking.totalAmount =
        totalAmount;

      existingCustomerBooking.updatedBy =
        req.user?.name;

      await existingCustomerBooking.save();

      return res.status(200).json({
        success: true,
        message:
          "Booking updated successfully",
        // data:
        //   existingCustomerBooking,
      });
    }

    // ─────────────────────────────────────────────
    // CREATE NEW BOOKING
    // ─────────────────────────────────────────────

    const booking =
      await orderBooking.create({
        apartmentId,
        eventId,
        fromDate:
          parsedFromDate,
        toDate:
          parsedToDate,
        daysOfEvent,
        daysOfApartment,
        promoterRequired,
        promoterCount,
        promoters:
          promotersWithAmount,
        customerDetails,
        discountPercentage,
        discountType,
        apartmentAmount,
        eventAmount,
        promoterTotal,
        subTotal,
        discountAmount,
        taxableAmount,
        gstAmount,
        totalAmount,
        createdBy:
          req.user?.name,
        updatedBy:
          req.user?.name,
      });

    return res.status(201).json({
      success: true,
      message:
        "Booking created successfully",
      // data: booking,
    });
  });
// // list Api

// const listAllBookings = asyncHandler(async (req, res) => {
//   const {
//     apartmentId,
//     status,
//     fromDate,
//     toDate,
//     pageNumber,
//     count,
//   } = req.body || {};
 
//   // ── Pagination validation ──────────────────────────────────────────────────
//   if (!pageNumber || !count) {
//     return res.status(400).json({
//       success: false,
//       message: "pageNumber and count are required",
//     });
//   }
 
//   const page  = parseInt(pageNumber, 10);
//   const limit = parseInt(count, 10);
//   const skip  = (page - 1) * limit;
 
//   // ── Build filter ───────────────────────────────────────────────────────────
//   const filter = {};
 
//   if (apartmentId) {
//     filter.apartmentId = apartmentId;
//   }
 
//   // status: 0 / 1 / 2 … whatever values your schema uses
//   if (status !== undefined && status !== null) {
//     filter.status = status;
//   }
 
//   // Date range filters on fromDate field
//   if (fromDate || toDate) {
//     filter.fromDate = {};
//     if (fromDate) filter.fromDate.$gte = new Date(fromDate);
//     if (toDate)   filter.fromDate.$lte = new Date(toDate);
//   }
 
//   // ── Query ──────────────────────────────────────────────────────────────────
//   const [totalCount, bookings] = await Promise.all([
//     orderBooking.countDocuments(filter),
//     orderBooking
//       .find(filter)
//       .populate({ path: "apartmentId", select: "apartmentName" })
//       .populate({ path: "eventId",     select: "eventName"     })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean(),
//   ]);
 
//   // ── Flatten populated fields for easy frontend consumption ─────────────────
//   const formattedBookings = bookings.map((b) => ({
//     ...b,
//     apartmentId:   b.apartmentId?._id        || null,
//     apartmentName: b.apartmentId?.apartmentName || "",
//     eventId:       b.eventId?._id             || null,
//     eventName:     b.eventId?.eventName        || "",
//   }));
 
//   return res.status(200).json({
//     success: true,
//     message: "Bookings fetched successfully",
//     data: {
//       pageNumber: page,
//       count:      limit,
//       totalCount,
//       totalPages: Math.ceil(totalCount / limit),
//       bookings:   formattedBookings,
//     },
//   });
// });
// const listAllBookings = asyncHandler(async (req, res) => {
//   /*
//     ── Expected req.body ──────────────────────────────────────────────────────
//     {
//       "pageNumber"  : 1,
//       "count"       : 10,
//       "apartmentId" : "663f1a2b4c9d2e001f8a1234",   // optional
//       "status"      : 1,                              // optional (0/1/2)
//       "fromDate"    : "2025-01-01",                   // optional
//       "toDate"      : "2025-12-31",                   // optional
//       "searchKey"   : "luxury"                        // optional (searches apartmentName, eventName, totalAmount)
//     }
//   */

//   const {
//     apartmentId,
//     status,
//     fromDate,
//     toDate,
//     pageNumber,
//     count,
//     search,
//   } = req.body || {};

//   // ── Pagination validation ──────────────────────────────────────────────────
//   if (!pageNumber || !count) {
//     return res.status(400).json({
//       success: false,
//       message: "pageNumber and count are required",
//     });
//   }

//   const page  = parseInt(pageNumber, 10);
//   const limit = parseInt(count, 10);
//   const skip  = (page - 1) * limit;

//   // ── Build base filter ──────────────────────────────────────────────────────
//   const filter = {};

//   if (apartmentId) {
//     filter.apartmentId = apartmentId;
//   }

//   if (status !== undefined && status !== null && status !== "") {
//     filter.status = status;
//   }

//   // ── Date range filter ──────────────────────────────────────────────────────
//   if (fromDate || toDate) {
//     filter.fromDate = {};
//     if (fromDate) filter.fromDate.$gte = new Date(fromDate);
//     if (toDate)   filter.fromDate.$lte = new Date(toDate);
//   }

//   // ── Search key filter ──────────────────────────────────────────────────────
//   if (search && search.trim() !== "") {
//     const searchRegex    = new RegExp(search.trim(), "i");
//     const numericSearch  = parseFloat(search);
//     const amountCondition = !isNaN(numericSearch)
//       ? { totalAmount: numericSearch }
//       : null;

//     // Pre-query related collections for name-based matches
//     const [matchedApartments, matchedEvents] = await Promise.all([
//       Apartment.find({ apartmentName: searchRegex }, "_id").lean(),
//       EventBook.find({ eventName: searchRegex }, "_id").lean(),
//     ]);

//     const apartmentIds = matchedApartments.map((a) => a._id);
//     const eventIds     = matchedEvents.map((e) => e._id);

//     const orConditions = [];
//     if (apartmentIds.length) orConditions.push({ apartmentId: { $in: apartmentIds } });
//     if (eventIds.length)     orConditions.push({ eventId:     { $in: eventIds     } });
//     if (amountCondition)     orConditions.push(amountCondition);

//     // No match found in any collection → return empty early
//     if (!orConditions.length) {
//       return res.status(200).json({
//         success: true,
//         message: "Bookings fetched successfully",
//         data: {
//           pageNumber : page,
//           count      : limit,
//           totalCount : 0,
//           totalPages : 0,
//           bookings   : [],
//         },
//       });
//     }

//     filter.$or = orConditions;
//   }

//   // ── Query DB ───────────────────────────────────────────────────────────────
//   const [totalCount, bookings] = await Promise.all([
//     orderBooking.countDocuments(filter),
//     orderBooking
//       .find(filter)
//       .populate({ path: "apartmentId", select: "apartmentName" })
//       .populate({ path: "eventId",     select: "eventName"     })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean(),
//   ]);

//   // ── Flatten populated fields ───────────────────────────────────────────────
//   const formattedBookings = bookings.map((b) => ({
//     ...b,
//     apartmentId   : b.apartmentId?._id           || null,
//     apartmentName : b.apartmentId?.apartmentName || "",
//     eventId       : b.eventId?._id               || null,
//     eventName     : b.eventId?.eventName         || "",
//   }));

//   return res.status(200).json({
//     success : true,
//     message : "Bookings fetched successfully",
//     data    : {
//       pageNumber : page,
//       count      : limit,
//       totalCount,
//       totalPages : Math.ceil(totalCount / limit),
//       bookings   : formattedBookings,
//     },
//   });
// });
// ───────────────── DATE FORMAT FUNCTION ─────────────────
// FORMAT : DD-MM-YYYY

const parseDate = (dateString) => {

  if (!dateString) return null;

  const parts =
    dateString.split("-");

  if (parts.length !== 3) {
    return null;
  }

  const [day, month, year] =
    parts;

  const parsedDate =
    new Date(
      `${year}-${month}-${day}`
    );

  return isNaN(parsedDate)
    ? null
    : parsedDate;
};

// ───────────────── LIST BOOKINGS ─────────────────

const listAllBookings =asyncHandler(async (req, res) => {

    const {
      apartmentId,
      status,
      fromDate,
      toDate,
      pageNumber,
      count,
      search,
    } = req.body || {};

    // ───────────────── VALIDATION ─────────────────

    if (
      !pageNumber ||
      !count
    ) {
      return res.status(400).json({
        success: false,
        message:
          "pageNumber and count are required",
      });
    }

    // ───────────────── PAGINATION ─────────────────

    const page =
      parseInt(pageNumber);

    const limit =
      parseInt(count);

    const skip =
      (page - 1) * limit;

    // ───────────────── FILTER ─────────────────

    let filter = {};

    // apartmentId filter

    if (apartmentId) {

      filter.apartmentId =
        new mongoose.Types.ObjectId(
          apartmentId
        );
    }

    // status filter

    if (
      status !== undefined &&
      status !== null &&
      status !== ""
    ) {

      filter.status = status;
    }

    // ───────────────── DATE FILTER ─────────────────
    // FORMAT : DD-MM-YYYY

    if (
      fromDate ||
      toDate
    ) {

      filter.fromDate = {};

      // fromDate

      if (fromDate) {

        const startDate =
          parseDate(
            fromDate
          );

        if (!startDate) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid fromDate format. Use DD-MM-YYYY",
          });
        }

        filter.fromDate.$gte =
          startDate;
      }

      // toDate

      if (toDate) {

        const endDate =
          parseDate(
            toDate
          );

        if (!endDate) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid toDate format. Use DD-MM-YYYY",
          });
        }

        endDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.fromDate.$lte =
          endDate;
      }
    }

    // ───────────────── SEARCH FILTER ─────────────────
    // SEARCH apartmentName + eventName

    if (
      search &&
      search.trim() !== ""
    ) {

      const searchRegex =
        new RegExp(
          search.trim(),
          "i"
        );

      // apartment search

      const matchedApartments =
        await Apartment.find(
          {
            apartmentName:
              searchRegex,
          },
          "_id"
        ).lean();

      // event search

      const matchedEvents =
        await Event.find(
          {
            eventName:
              searchRegex,
          },
          "_id"
        ).lean();

      const apartmentIds =
        matchedApartments.map(
          (item) =>
            item._id
        );

      const eventIds =
        matchedEvents.map(
          (item) =>
            item._id
        );

      let orConditions =
        [];

      // apartment match

      if (
        apartmentIds.length >
        0
      ) {

        orConditions.push({
          apartmentId: {
            $in:
              apartmentIds,
          },
        });
      }

      // event match

      if (
        eventIds.length >
        0
      ) {

        orConditions.push({
          eventId: {
            $in: eventIds,
          },
        });
      }

      // no match

      if (
        orConditions.length ===
        0
      ) {

        return res.status(200).json({
          success: true,
          message:
            "Bookings fetched successfully",

          data: {

            pageNumber:
              page,

            count:
              limit,

            totalCount: 0,

            totalPages: 0,

            bookings: [],
          },
        });
      }

      filter.$or =
        orConditions;
    }

    // ───────────────── GET DATA ─────────────────

    const [
      totalCount,
      bookings,
    ] = await Promise.all([

      orderBooking.countDocuments(
        filter
      ),

      orderBooking
        .find(filter)

        .populate({
          path:
            "apartmentId",

          select:
            "apartmentName",
        })

        .populate({
          path:
            "eventId",

          select:
            "eventName",
        })

        .sort({
          createdAt: -1,
        })

        .skip(skip)

        .limit(limit)

        .lean(),
    ]);

    // ───────────────── FORMAT DATA ─────────────────

    const formattedBookings =
      bookings.map(
        (item) => ({

          ...item,

          apartmentId:
            item
              .apartmentId
              ?._id || null,

          apartmentName:
            item
              .apartmentId
              ?.apartmentName ||
            "",

          eventId:
            item
              .eventId
              ?._id || null,

          eventName:
            item
              .eventId
              ?.eventName ||
            "",
        })
      );

    // ───────────────── RESPONSE ─────────────────

    return res.status(200).json({

      success: true,

      message:
        "Bookings fetched successfully",

      data: {

        pageNumber:
          page,

        count:
          limit,

        totalCount,

        totalPages:
          Math.ceil(
            totalCount /
              limit
          ),

        bookings:
          formattedBookings,
      },
    });
  });


const apartmentEventGet = async (req, res) => {
  try {

    // GET ID FROM QUERY PARAMS
    const { apartmentId } = req.query;

    // VALIDATION
    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }
    // FIND APARTMENT
    const apartment = await Apartment.findById(apartmentId)
      .populate("createdBySession")
      .populate("lastUpdatedBySession");
    // FIND EVENT
    const events = await EventBook.find({
      status: 1,
    });
    // NOT FOUND
    if (!apartment) {
      return res.status(404).json({
        success: false,
        message: "Apartment not found",
      });
    }

    // RESPONSE
    return res.status(200).json({
      success: true,
      message: "Apartment fetched successfully",
      data: {
        apartment,
        events,
      },
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


// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  createBooking, listAllBookings, apartmentEventGet
};