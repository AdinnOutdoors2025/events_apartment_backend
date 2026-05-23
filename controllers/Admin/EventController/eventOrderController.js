const mongoose = require("mongoose");
const orderBooking = require("../../../models/Admin/EventHandling/eventOrderSchema");
const Apartment = require("../../../models/Admin/ApartmentSchema/apartment")
const EventBook = require("../../../models/Admin/EventHandling/eventRateSchema")
// ─── Helper ──────────────────────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);


// Format: 20260503ORD#1
async function generateAdminOrderId() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const prefix = `${year}${month}${day}`;

  const start = new Date(year, today.getMonth(), today.getDate());
  const end = new Date(year, today.getMonth(), today.getDate() + 1);
  const count = await orderBooking.countDocuments({ createdAt: { $gte: start, $lt: end } });

  return `${prefix}ORD#${count + 1}`;
}
// ✅ NEW: Helper to categorize file type
function getFileCategory(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) return "excel";
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) return "word";
  return "other";
}
// ─── CREATE / UPDATE Booking ──────────────────────────────────────────────────

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
    sqfet
  } = req.body;

  // ─────────────────────────────────────────────
  // ORDER NOTE
  // ─────────────────────────────────────────────

  const uploadedFiles =
    req.files?.orderNoteFiles || [];

  const orderNote = {

    text:
      req.body.orderNoteText || "",

    files:
      uploadedFiles.map((file) => ({

        originalName:
          file.originalname,

        fileName:
          file.filename,

        filePath:
          file.path,

        mimeType:
          file.mimetype,

        size:
          file.size,

        fileType:
          getFileCategory(
            file.mimetype
          ),
      })),
  };

  // ─────────────────────────────────────────────
  // VALIDATE APARTMENT ID
  // ─────────────────────────────────────────────

  if (
    !apartmentId ||
    !mongoose.Types.ObjectId.isValid(
      apartmentId
    )
  ) {

    return res.status(400).json({

      success: false,

      message:
        !apartmentId
          ? "apartmentId is required"
          : "Invalid apartmentId",
    });
  }

  // ─────────────────────────────────────────────
  // VALIDATE EVENT ID
  // ─────────────────────────────────────────────

  if (
    !eventId ||
    !mongoose.Types.ObjectId.isValid(
      eventId
    )
  ) {

    return res.status(400).json({

      success: false,

      message:
        !eventId
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

      message:
        !fromDate
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
    ).lean(),

    EventBook.findById(
      eventId
    ).lean(),
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
  // STORE SNAPSHOT DETAILS
  // ─────────────────────────────────────────────

  const apartmentDetails = {

    _id:
      apartment._id,

    apartmentName:
      apartment.apartmentName,

    apartmentAddress:
      apartment.apartmentAddress,

    city:
      apartment.city,

    location:
      apartment.location,

    perDayRent:
      apartment.perDayRent,

    contactPersonName:
      apartment.contactPersonName,

    contactPersonPhone:
      apartment.contactPersonPhone,
  };

  const eventDetails = {

    _id:
      event._id,

    eventName:
      event.eventName,

    amount:
      event.amount,

    description:
      event.description,
  };

  // ─────────────────────────────────────────────
  // FIND EXISTING CUSTOMER BOOKING
  // ─────────────────────────────────────────────

  const existingCustomerBooking =
    await orderBooking.findOne({

      apartmentId,

      eventId,

      "customerDetails.contactPersonPhoneNumber":
        contactPersonPhoneNumber,
    });

  // ─────────────────────────────────────────────
  // CHECK OVERLAPPING BOOKINGS
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

  if (overlappingBooking) {

    return res.status(409).json({

      success: false,

      message:
        `Already booked from ${overlappingBooking.fromDate.toDateString()} to ${overlappingBooking.toDate.toDateString()}`,
    });
  }

  // ─────────────────────────────────────────────
  // CALCULATIONS
  // ─────────────────────────────────────────────

  // const apartmentAmount =

  //   (apartment.perDayRent || 0) * (daysOfApartment || 0);

  // const eventAmount =

  //   (event.amount || 0) *

  //   (daysOfEvent || 0);

  // let promoterTotal = 0;

  // const promotersWithAmount =

  //   (promoters || []).map((p) => {

  //     const promoterAmount =

  //       (p.promoterPerDayCharge || 0) *

  //       (daysOfEvent || 0);

  //     promoterTotal +=
  //       promoterAmount;

  //     return {

  //       ...p,

  //       promoterAmount,
  //     };
  //   });

  // const subTotal =

  //   apartmentAmount +

  //   eventAmount +

  //   promoterTotal;

  // let discountAmount = 0;

  // // 1 = Percentage

  // if (
  //   discountType === 1
  // ) {

  //   discountAmount =

  //     (subTotal *

  //       (
  //         discountPercentage || 0
  //       )) / 100;
  // }

  // // 2 = Flat

  // else if (
  //   discountType === 2
  // ) {

  //   discountAmount =
  //     discountPercentage || 0;
  // }

  // const taxableAmount =

  //   subTotal -

  //   discountAmount;

  // const gstAmount =

  //   (taxableAmount * 18) / 100;

  // const totalAmount =

  //   taxableAmount +

  //   gstAmount;
const apartmentAmount = Math.floor(
  (apartment.perDayRent || 0) * (daysOfApartment || 0)
);
const sqfetAmount = Math.floor(
  (apartment.perDayRent || 0) * (sqfet || 0)
);

const eventAmount = Math.floor(
  (event.amount || 0) * (daysOfEvent || 0)
);

let promoterTotal = 0;

const promotersWithAmount = (promoters || []).map((p) => {
  const promoterAmount = Math.floor(
    (p.promoterPerDayCharge || 0) * (daysOfEvent || 0)
  );

  promoterTotal += promoterAmount;

  return {
    ...p,
    promoterAmount,
  };
});

const subTotal = Math.floor(apartmentAmount + eventAmount + promoterTotal + sqfetAmount);

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

    existingCustomerBooking.sqfet =
      sqfet;

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

    existingCustomerBooking.sqfetAmount =
      sqfetAmount;

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

    existingCustomerBooking.apartmentDetails =
      apartmentDetails;

    existingCustomerBooking.eventDetails =
      eventDetails;

    existingCustomerBooking.orderNote =
      orderNote;

    existingCustomerBooking.updatedBy =
      req.user?.name;

    await existingCustomerBooking.save();

    return res.status(200).json({

      success: true,

      message:
        "Booking updated successfully",
    });
  }

  // ─────────────────────────────────────────────
  // GENERATE ORDER ID
  // ─────────────────────────────────────────────

  const orderId =
    await generateAdminOrderId();

  // ─────────────────────────────────────────────
  // CREATE BOOKING
  // ─────────────────────────────────────────────

  const booking =
    await orderBooking.create({

      orderId,

      apartmentId,

      eventId,

      apartmentDetails,

      eventDetails,

      fromDate:
        parsedFromDate,

      toDate:
        parsedToDate,

      daysOfEvent,

      daysOfApartment,
      sqfet,
      promoterRequired,

      promoterCount,

      promoters:
        promotersWithAmount,

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

      status: 2,

      createdBy:
        req.user?.name,

      updatedBy:
        req.user?.name,
    });

  return res.status(201).json({

    success: true,

    message:
      "Booking created successfully",
  });

});

// ───────────────── LIST BOOKINGS ─────────────────
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

const buildBookingFilters = async (
  body
) => {

  const {
    apartmentId,
    status,
    fromDate,
    toDate,
    search,
  } = body;

  let filter = {};

  // ───────────────── APARTMENT FILTER ─────────────────

  if (apartmentId) {

    filter.apartmentId =
      new mongoose.Types.ObjectId(
        apartmentId
      );
  }

  // ───────────────── STATUS FILTER ─────────────────

// STATUS = 1 → ALL DATA
// STATUS = 2,3,4,5 → PARTICULAR STATUS DATA

if (
  status !== undefined &&
  status !== null &&
  status !== ""
) {

  const statusValue =
    Number(status);

  // IF STATUS IS NOT 1
  // APPLY FILTER

  if (statusValue !== 1) {

    filter.status =
      statusValue;
  }
}

  // ───────────────── DATE FILTER ─────────────────
  // FORMAT : DD-MM-YYYY

  if (
    fromDate ||
    toDate
  ) {

    filter.fromDate = {};

    // FROM DATE

    if (fromDate) {

      const startDate =
        parseDate(
          fromDate
        );

      if (!startDate) {

        return {
          error:
            "Invalid fromDate format. Use DD-MM-YYYY",
        };
      }

      filter.fromDate.$gte =
        startDate;
    }

    // TO DATE

    if (toDate) {

      const endDate =
        parseDate(
          toDate
        );

      if (!endDate) {

        return {
          error:
            "Invalid toDate format. Use DD-MM-YYYY",
        };
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

    // APARTMENT SEARCH

    const matchedApartments =
      await Apartment.find(
        {
          apartmentName:
            searchRegex,
        },
        "_id"
      ).lean();

    // EVENT SEARCH

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

    // APARTMENT MATCH

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

    // EVENT MATCH

    if (
      eventIds.length >
      0
    ) {

      orConditions.push({
        eventId: {
          $in:
            eventIds,
        },
      });
    }

    // NO MATCH

    if (
      orConditions.length ===
      0
    ) {

      return {
        noMatch: true,
        filter,
      };
    }

    filter.$or =
      orConditions;
  }

  return {
    filter,
  };
};

const listAllBookings = asyncHandler(
    async (req, res) => {

      const {
        pageNumber,
        count,
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
        parseInt(
          pageNumber
        );

      const limit =
        parseInt(
          count
        );

      const skip =
        (page - 1) *
        limit;

      // ───────────────── FILTER ─────────────────

      const filterResult =
        await buildBookingFilters(
          req.body
        );

      // DATE ERROR

      if (
        filterResult.error
      ) {

        return res.status(400).json({
          success: false,
          message:
            filterResult.error,
        });
      }

      // NO SEARCH MATCH

      if (
        filterResult.noMatch
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

      const filter =
        filterResult.filter;

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
    }
  );


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