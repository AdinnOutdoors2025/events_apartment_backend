const mongoose = require("mongoose");
const orderBooking = require("../../../models/Admin/OrderSchema/eventOrderSchema");
const Apartment = require("../../../models/Admin/ApartmentSchema/apartment");
const EventBook = require("../../../models/Admin/EventHandling/eventRateSchema");
const ItemMaster = require("../../../models/Admin/OrderSchema/ElementsMasterSchema/itemsMasterSchema");
const GiftMaster = require("../../../models/Admin/OrderSchema/ElementsMasterSchema/elementsGiftSchema");
const StaffAdminUser = require("../../../models/Admin/StaffAdminManagement/staffAdminManagement");
const Admin = require("../../../models/Admin/adminUser");
const { successResponse, errorResponse } = require("../../../utils/response");
require("dotenv").config();

const axios = require("axios");
// ─── Helper Functions ──────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
// ─── Order ID Generation ──────────────────────────────────────────────────
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
// ─── Save BOOKINGS ──────────────────────────────────────────────────
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

const createBooking = asyncHandler(async (req, res) => {
  try {
    const {
      id,
      apartmentId,
      eventId,
      fromDate,
      toDate,
      daysOfEvent,
      promoterRequired,
      stageRequired,
      promoterCount,
      promoters,
      customerDetails,
      discountType,
      discountPercentage,
      sqfet,
      dailySchedule,
      items = [],
      gifts = [],
      orderNoteText,
      orderNoteFiles,
    } = req.body;

    // ─────────────────────────────────────────────
    // VALIDATE ITEMS & GIFTS
    // ─────────────────────────────────────────────

    // Note: items and gifts are optional now
    let items_total = 0;
    let gifts_total = 0;
    let itemsAndGiftsTotal = 0;
    let orderItems = [];
    let orderGifts = [];

    // Process items if provided
    if (items && items.length > 0) {
      // Validate items array entries
      for (let i = 0; i < items.length; i++) {
        const { item_id, quantity } = items[i];
        if (!item_id) {
          return errorResponse(
            res,
            `items[${i}]: item_id is required`,
            null,
            400,
          );
        }
        if (
          !quantity ||
          !Number.isInteger(Number(quantity)) ||
          Number(quantity) < 1
        ) {
          return errorResponse(
            res,
            `items[${i}]: quantity must be a positive integer`,
            null,
            400,
          );
        }
      }

      // Fetch all Items from DB
      const itemIds = [...new Set(items.map((i) => i.item_id))];
      const dbItems = await ItemMaster.find({
        _id: { $in: itemIds },
        item_status: 1,
      });
      const dbItemMap = {};
      dbItems.forEach((doc) => {
        dbItemMap[doc._id.toString()] = doc;
      });

      // Verify every requested item was found
      for (let i = 0; i < items.length; i++) {
        if (!dbItemMap[items[i].item_id]) {
          return errorResponse(
            res,
            `items[${i}]: item with id "${items[i].item_id}" not found or is disabled`,
            null,
            404,
          );
        }
      }

      // Build order items + accumulate items_total
      orderItems = items.map(({ item_id, quantity }) => {
        const doc = dbItemMap[item_id];
        const parsedCount = Number(quantity);
        const item_amount = doc.amount * parsedCount;
        items_total += item_amount;

        return {
          item_id: doc._id,
          item_name: doc.item_name,
          state: doc.state,
          item_type: doc.item_type,
          quantity: parsedCount,
          unit_amount: doc.amount,
          amount_unit: doc.amount_unit,
          item_amount,
        };
      });
    }

    // Process gifts if provided
    if (gifts && gifts.length > 0) {
      // Validate gifts array entries
      for (let i = 0; i < gifts.length; i++) {
        const { gift_id, quantity } = gifts[i];
        if (!gift_id) {
          return errorResponse(
            res,
            `gifts[${i}]: gift_id is required`,
            null,
            400,
          );
        }
        if (
          !quantity ||
          !Number.isInteger(Number(quantity)) ||
          Number(quantity) < 1
        ) {
          return errorResponse(
            res,
            `gifts[${i}]: quantity must be a positive integer`,
            null,
            400,
          );
        }
      }

      // Fetch all Gifts from DB
      const giftIds = [...new Set(gifts.map((g) => g.gift_id))];
      const dbGifts = await GiftMaster.find({
        _id: { $in: giftIds },
        status: 1,
      });
      const dbGiftMap = {};
      dbGifts.forEach((doc) => {
        dbGiftMap[doc._id.toString()] = doc;
      });

      // Verify every requested gift was found
      for (let i = 0; i < gifts.length; i++) {
        if (!dbGiftMap[gifts[i].gift_id]) {
          return errorResponse(
            res,
            `gifts[${i}]: gift with id "${gifts[i].gift_id}" not found or is disabled`,
            null,
            404,
          );
        }
      }

      // Build order gifts + accumulate gifts_total
      orderGifts = gifts.map(({ gift_id, quantity }) => {
        const doc = dbGiftMap[gift_id];
        const parsedCount = Number(quantity);
        const gift_amount = doc.price * parsedCount;
        gifts_total += gift_amount;

        return {
          gift_id: doc._id,
          gift_name: doc.giftName,
          gift_type: doc.giftType,
          quantity: parsedCount,
          unit_price: doc.price,
          price_type: doc.priceType,
          gift_amount,
        };
      });
    }

    itemsAndGiftsTotal = items_total + gifts_total;

    // ─────────────────────────────────────────────
    // FIND EXISTING BOOKING BY _id (if provided)
    // ─────────────────────────────────────────────

    let existingCustomerBooking = null;

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, "Invalid booking id", null, 400);
      }

      existingCustomerBooking = await orderBooking.findById(id);

      if (!existingCustomerBooking) {
        return errorResponse(res, "Booking not found", null, 400);
      }
    }

    // ─────────────────────────────────────────────
    // VALIDATE DAILY SCHEDULE
    // ─────────────────────────────────────────────

    if (
      !dailySchedule ||
      !Array.isArray(dailySchedule) ||
      dailySchedule.length === 0
    ) {
      return errorResponse(
        res,
        "dailySchedule is required with at least one day schedule",
        null,
        400,
      );
    }

    // Validate each day's schedule
    for (const schedule of dailySchedule) {
      if (!schedule.days) {
        return errorResponse(res, "Each schedule must have a days", null, 400);
      }

      if (!schedule.fromTime) {
        return errorResponse(
          res,
          `fromTime is required for day ${schedule.days}`,
          null,
          400,
        );
      }

      if (!schedule.toTime) {
        return errorResponse(
          res,
          `toTime is required for day ${schedule.days}`,
          null,
          400,
        );
      }

      // Validate time format (HH:MM AM/PM)
      const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i;
      if (
        !timeRegex.test(schedule.fromTime) ||
        !timeRegex.test(schedule.toTime)
      ) {
        return errorResponse(
          res,
          `Invalid time format for day ${schedule.days}. Use format like "10:00 AM" or "2:00 PM"`,
          null,
          400,
        );
      }

      // Check that daysOfEvent matches the number of schedules
      if (daysOfEvent && schedule.days > daysOfEvent) {
        return errorResponse(
          res,
          `days ${schedule.days} exceeds daysOfEvent (${daysOfEvent})`,
          null,
          400,
        );
      }
    }

    // Check if the number of schedules matches daysOfEvent
    if (daysOfEvent && dailySchedule.length !== daysOfEvent) {
      return errorResponse(
        res,
        `Number of daily schedules (${dailySchedule.length}) must match daysOfEvent (${daysOfEvent})`,
        null,
        400,
      );
    }

    // Check for duplicate day numbers
    const dayNumbers = dailySchedule.map((s) => s.days);
    const hasDuplicates = new Set(dayNumbers).size !== dayNumbers.length;
    if (hasDuplicates) {
      return errorResponse(
        res,
        "Duplicate day numbers found in dailySchedule",
        null,
        400,
      );
    }

    // Check that day numbers are sequential starting from 1
    const sortedDays = [...dayNumbers].sort((a, b) => a - b);
    for (let i = 0; i < sortedDays.length; i++) {
      if (sortedDays[i] !== i + 1) {
        return errorResponse(
          res,
          `Day numbers must be sequential starting from 1. Missing day ${i + 1}`,
          null,
          400,
        );
      }
    }

    // ─────────────────────────────────────────────
    // ORDER NOTE
    // ─────────────────────────────────────────────

    const uploadedFiles = req.files?.orderNoteFiles || [];

    const orderNote = {
      text: orderNoteText || "",
      files: uploadedFiles.map((file) => ({
        originalName: file.originalname,
        fileName: file.filename,
        filePath: file.path,
        mimeType: file.mimetype,
        size: file.size,
        fileType: getFileCategory(file.mimetype),
      })),
    };

    // If no files uploaded but order_notes text exists
    if (!uploadedFiles.length && orderNoteText) {
      orderNote.files = [];
    }

    // ─────────────────────────────────────────────
    // VALIDATE APARTMENT ID
    // ─────────────────────────────────────────────

    if (!apartmentId || !mongoose.Types.ObjectId.isValid(apartmentId)) {
      return errorResponse(
        res,
        !apartmentId ? "apartmentId is required" : "Invalid apartmentId",
        null,
        400,
      );
    }

    // ─────────────────────────────────────────────
    // VALIDATE EVENT ID
    // ─────────────────────────────────────────────

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return errorResponse(
        res,
        !eventId ? "eventId is required" : "Invalid eventId",
        null,
        400,
      );
    }

    // ─────────────────────────────────────────────
    // VALIDATE PHONE NUMBER
    // ─────────────────────────────────────────────

    const contactPersonPhoneNumber = customerDetails?.contactPersonPhoneNumber;
    if (!contactPersonPhoneNumber) {
      return errorResponse(
        res,
        "customerDetails.contactPersonPhoneNumber is required",
        null,
        400,
      );
    }

    // ─────────────────────────────────────────────
    // VALIDATE DATES
    // ─────────────────────────────────────────────

    if (!fromDate || !toDate) {
      return errorResponse(
        res,
        !fromDate ? "fromDate is required" : "toDate is required",
        null,
        400,
      );
    }

    const parsedFromDate = new Date(fromDate);
    const parsedToDate = new Date(toDate);

    if (isNaN(parsedFromDate.getTime())) {
      return errorResponse(res, "Invalid fromDate", null, 400);
    }

    if (isNaN(parsedToDate.getTime())) {
      return errorResponse(res, "Invalid toDate", null, 400);
    }

    if (parsedToDate < parsedFromDate) {
      return errorResponse(
        res,
        "toDate must be on or after fromDate",
        null,
        400,
      );
    }

    // Calculate total days
    const totalDays =
      Math.ceil((parsedToDate - parsedFromDate) / (1000 * 60 * 60 * 24)) + 1;

    // Use provided daysOfEvent or calculate from dates
    let eventDays = daysOfEvent;
    if (!eventDays) {
      eventDays = totalDays;
    }

    // ─────────────────────────────────────────────
    // FETCH APARTMENT & EVENT
    // ─────────────────────────────────────────────

    const [apartment, event] = await Promise.all([
      Apartment.findById(apartmentId).lean(),
      EventBook.findById(eventId).lean(),
    ]);

    if (!apartment) {
      return errorResponse(res, "Apartment not found", null, 400);
    }

    if (!event) {
      return errorResponse(res, "Event not found", null, 404);
    }

    // ─────────────────────────────────────────────
    // STORE SNAPSHOT DETAILS
    // ─────────────────────────────────────────────

    const apartmentDetails = {
      _id: apartment._id,
      apartmentName: apartment.ApartmentName,
      apartmentAddress: apartment.ApartmentAddress,
      city: apartment.City,
      location: apartment.Location,
      perDayRent: apartment.PerDayRent,
      contactPersonName: apartment.ContactPersonName,
      contactPersonPhone: apartment.ContactPersonPhone,
    };

    const eventDetails = {
      _id: event._id,
      eventName: event.eventName,
      amount: event.amount,
      description: event.description,
    };

    // ─────────────────────────────────────────────
    // CHECK OVERLAPPING BOOKINGS (excluding current booking)
    // ─────────────────────────────────────────────

    const overlappingBooking = await orderBooking.findOne({
      _id: { $ne: existingCustomerBooking?._id },
      apartmentId,
      fromDate: { $lte: parsedToDate },
      toDate: { $gte: parsedFromDate },
    });

    if (overlappingBooking) {
      return errorResponse(
        res,
        `Already booked from ${overlappingBooking.fromDate.toDateString()} to ${overlappingBooking.toDate.toDateString()}`,
        null,
        409,
      );
    }

    // ─────────────────────────────────────────────
    // CALCULATE AMOUNTS
    // ─────────────────────────────────────────────

    // const apartmentAmount = Math.floor(
    //   (apartment.perDayRent || 0) * (eventDays || 0),
    // );

    // const sqfetAmount = Math.floor((apartment.perDayRent || 0) * (sqfet || 0));
    const apartmentAmount = Math.floor(
      (apartment.PerDayRent || 0) * (sqfet || 1) * (eventDays || 0),
    );

    const eventAmount = Math.floor((event.amount || 0) * (eventDays || 0));

    let promoterTotal = 0;
    // OLD CODE
    // const promotersWithAmount = (promoters || []).map((p) => {
    //   const promoterAmount = Math.floor(
    //     (p.promoterPerDayCharge || 0) * (p.promoterDays || 0),
    //   );
    //   promoterTotal += promoterAmount;
    //   return {
    //     ...p,
    //     promoterAmount,
    //   };
    // });
    // NEW CODE
    const PROMOTER_PER_DAY_CHARGE =
      Number(process.env.PROMOTER_PER_DAY_CHARGE) || 1500;

    const promotersWithAmount = (promoters || []).map((p) => {
      const promoterAmount = Math.floor(
        PROMOTER_PER_DAY_CHARGE * (p.promoterDays || 0), // 👈 .env value, ignore p.promoterPerDayCharge
      );
      promoterTotal += promoterAmount;
      return {
        ...p,
        promoterPerDayCharge: PROMOTER_PER_DAY_CHARGE, // 👈 overwrite with .env value before saving
        promoterAmount,
      };
    });
    // Calculate subTotal including items and gifts
    const subTotal = Math.floor(
      apartmentAmount + eventAmount + promoterTotal + itemsAndGiftsTotal,
    );

    let discountAmount = 0;

    // discountType: 1 = Percentage, 2 = Flat
    if (discountType === 1) {
      discountAmount = Math.floor((subTotal * (discountPercentage || 0)) / 100);
    } else if (discountType === 2) {
      discountAmount = Math.floor(discountPercentage || 0);
    }

    const taxableAmount = Math.floor(subTotal - discountAmount);
    const gstAmount = Math.floor((taxableAmount * 18) / 100);
    const finalTotalAmount = Math.floor(taxableAmount + gstAmount);

    // ─────────────────────────────────────────────
    // UPDATE EXISTING BOOKING
    // ─────────────────────────────────────────────

    if (existingCustomerBooking) {
      existingCustomerBooking.fromDate = parsedFromDate;
      existingCustomerBooking.toDate = parsedToDate;
      existingCustomerBooking.daysOfEvent = eventDays;
      existingCustomerBooking.sqfet = sqfet;
      existingCustomerBooking.promoterRequired = promoterRequired;
      existingCustomerBooking.stageRequired = stageRequired;
      existingCustomerBooking.promoterCount = promoterCount;
      existingCustomerBooking.promoters = promotersWithAmount;
      existingCustomerBooking.customerDetails = customerDetails;
      existingCustomerBooking.discountPercentage = discountPercentage;
      existingCustomerBooking.discountType = discountType;
      existingCustomerBooking.apartmentAmount = apartmentAmount;
      // existingCustomerBooking.sqfetAmount = sqfetAmount;
      existingCustomerBooking.eventAmount = eventAmount;
      existingCustomerBooking.promoterTotal = promoterTotal;
      existingCustomerBooking.subTotal = subTotal;
      existingCustomerBooking.discountAmount = discountAmount;
      existingCustomerBooking.taxableAmount = taxableAmount;
      existingCustomerBooking.gstAmount = gstAmount;
      existingCustomerBooking.totalAmount = finalTotalAmount;
      existingCustomerBooking.apartmentDetails = apartmentDetails;
      existingCustomerBooking.eventDetails = eventDetails;
      existingCustomerBooking.orderNote = orderNote;
      existingCustomerBooking.dailySchedule = dailySchedule;

      // Add items and gifts to existing booking
      if (orderItems.length > 0) existingCustomerBooking.items = orderItems;
      if (orderGifts.length > 0) existingCustomerBooking.gifts = orderGifts;
      existingCustomerBooking.items_total = items_total;
      existingCustomerBooking.gifts_total = gifts_total;
      existingCustomerBooking.itemsAndGiftsTotal = itemsAndGiftsTotal;

      existingCustomerBooking.updatedBy = req.user?.name;

      await existingCustomerBooking.save();

      return successResponse(res, "Booking updated successfully");
    }

    // ─────────────────────────────────────────────
    // GENERATE ORDER ID
    // ─────────────────────────────────────────────

    const orderId = await generateAdminOrderId();

    // ─────────────────────────────────────────────
    // CREATE NEW BOOKING
    // ─────────────────────────────────────────────
    const initialHistoryEntry = {
      fromStatus: null,
      fromStatusText: null,
      toStatus: 1,
      toStatusText: "Enquiry",
      changedBy: req.user?.name || "Admin",
      changedAt: new Date(),
      additionalNotes: [],
      statusDocument: [],
      voiceDocument: [],
    };
    const booking = await orderBooking.create({
      orderId,
      apartmentId,
      eventId,
      apartmentDetails,
      eventDetails,
      fromDate: parsedFromDate,
      toDate: parsedToDate,
      daysOfEvent: eventDays,
      sqfet,
      promoterRequired,
      stageRequired,
      promoterCount,
      promoters: promotersWithAmount,
      customerDetails,
      discountPercentage,
      discountType,
      apartmentAmount,
      // sqfetAmount,
      eventAmount,
      promoterTotal,
      subTotal,
      discountAmount,
      taxableAmount,
      gstAmount,
      totalAmount: finalTotalAmount,
      orderNote,
      dailySchedule,
      items: orderItems,
      gifts: orderGifts,
      items_total: items_total,
      gifts_total: gifts_total,
      itemsAndGiftsTotal: itemsAndGiftsTotal,
      orderStatus: 1,
      orderHistory: [initialHistoryEntry],
      createdBy: req.user?.name,
      updatedBy: req.user?.name,
    });

    return successResponse(
      res,
      "Booking created successfully",
      "Success",
      201,
      // {
      //   _id: booking._id,
      //   orderId: booking.orderId,
      //   bookingDetails: {
      //     fromDate: booking.fromDate,
      //     toDate: booking.toDate,
      //     daysOfEvent: booking.daysOfEvent,
      //     subTotal,
      //     discountAmount,
      //     taxableAmount,
      //     gstAmount,
      //     totalAmount: finalTotalAmount,
      //   },
      //   itemsDetails: {
      //     items_total,
      //     items: orderItems,
      //   },
      //   giftsDetails: {
      //     gifts_total,
      //     gifts: orderGifts,
      //   },
      // },
    );
  } catch (error) {
    // Global error handler for any unexpected errors
    console.error("Unexpected error in createBooking:", error);
    return errorResponse(
      res,
      "An unexpected error occurred: " + error.message,
      null,
      500,
    );
  }
});
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
// Helper function to get status text
const getStatusText = (status) => {
  switch (Number(status)) {
    case 1:
      return "Enquiry";
    case 2:
      return "Need Analysis";
    case 3:
      return "Proposal & Price Quote";
    case 4:
      return "Negotiation & Review";
    case 5:
      return "Close Won";
    case 6:
      return "Closed Loss";
    case 7:
      return "Project Code Creation";
    default:
      return "Unknown";
  }
};

const getOrderStatusCounts = async (filter = {}) => {
  const statusCounts = await orderBooking.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$orderStatus",
        count: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" }, // Sum of totalAmount for each status
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Initialize counts and amounts for all statuses (1-6)
  const counts = {
    Enquiry: {
      count: 0,
      totalAmount: 0,
    },
    "Need Analysis": {
      count: 0,
      totalAmount: 0,
    },
    "Proposal & Price Quote": {
      count: 0,
      totalAmount: 0,
    },
    "Negotiation & Review": {
      count: 0,
      totalAmount: 0,
    },
    "Close Won": {
      count: 0,
      totalAmount: 0,
    },
    "Closed Loss": {
      count: 0,
      totalAmount: 0,
    },
    "Project Code Creation": {
      count: 0,
      totalAmount: 0,
    },
  };

  statusCounts.forEach((item) => {
    switch (item._id) {
      case 1:
        counts.Enquiry.count = item.count;
        counts.Enquiry.totalAmount = item.totalAmount || 0;
        break;
      case 2:
        counts["Need Analysis"].count = item.count;
        counts["Need Analysis"].totalAmount = item.totalAmount || 0;
        break;
      case 3:
        counts["Proposal & Price Quote"].count = item.count;
        counts["Proposal & Price Quote"].totalAmount = item.totalAmount || 0;
        break;
      case 4:
        counts["Negotiation & Review"].count = item.count;
        counts["Negotiation & Review"].totalAmount = item.totalAmount || 0;
        break;
      case 5:
        counts["Close Won"].count = item.count;
        counts["Close Won"].totalAmount = item.totalAmount || 0;
        break;
      case 6:
        counts["Closed Loss"].count = item.count;
        counts["Closed Loss"].totalAmount = item.totalAmount || 0;
        break;
      case 7:
        counts["Project Code Creation"].count = item.count;
        counts["Project Code Creation"].totalAmount = item.totalAmount || 0;
        break;
    }
  });

  return counts;
};
const listAllBookings = asyncHandler(async (req, res) => {
  try {
    const { pageNumber, count } = req.body || {};
    if (!pageNumber || !count) {
      return errorResponse(res, "pageNumber and count are required", null, 400);
    }
    const page = parseInt(pageNumber);
    const limit = parseInt(count);
    const skip = (page - 1) * limit;
    const filterResult = await buildBookingFilters(req.body);
    if (filterResult.error) {
      return errorResponse(res, filterResult.error, null, 400);
    }
    const filter = filterResult.filter;
    // =====================================================
    // ROLE BASED FILTER
    // Admin (userType = 1) -> Show All Bookings
    // Staff (userType = 2) -> Show Only Assigned Bookings
    // =====================================================
    if (req.user?.userType === 2) {
      filter["assignment.assignedUserId"] = new mongoose.Types.ObjectId(
        req.user.id,
      );
    }
    // Get status counts
    const statusCounts = await getOrderStatusCounts(filter);

    if (filterResult.noMatch) {
      return successResponse(
        res,
        "Bookings fetched successfully",
        {
          pageNumber: page,
          count: limit,
          totalCount: 0,
          totalPages: 0,
          bookings: [],
          statusCounts,
        },
        200,
      );
    }

    const [totalCount, bookings] = await Promise.all([
      orderBooking.countDocuments(filter),
      orderBooking
        .find(filter)
        .populate({ path: "apartmentId", select: "ApartmentName" })
        .populate({ path: "eventId", select: "eventName" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);
    // FIXED: Properly remove unwanted fields using destructuring
    const formattedBookings = bookings.map((item) => {
      // Destructure to exclude unwanted fields
      const {
        items,
        gifts,
        items_total,
        gifts_total,
        dailySchedule,
        promoters,
        eventDetails,
        apartmentAmount,
        eventAmount,
        promoterTotal,
        itemsAndGiftsTotal,
        subTotal,
        discountAmount,
        taxableAmount,
        gstAmount,
        orderHistory,
        customerDetails,
        apartmentDetails,
        discountType,
        discountPercentage,
        finalAmount,
        sqfet,
        poDocument,
        document,
        voiceNote,
        orderNote,
        promoterRequired,
        stageRequired,
        promoterCount,
        ...rest
      } = item;

      return {
        ...rest,
        orderStatusText: getStatusText(item.orderStatus),
        apartmentId: item.apartmentId?._id || null,
        apartmentName: item.apartmentId?.ApartmentName || "",
        eventId: item.eventId?._id || null,
        eventName: item.eventId?.eventName || "",

        customerDetails: {
          brandOrCompanyName: customerDetails?.brandOrCompanyName || "",
        },
        assignment: item.assignment
          ? {
              assignedUserId: item.assignment.assignedUserId || null,
              assignedUserName: item.assignment.assignedUserName || "",
              assignedById: item.assignment.assignedById || null,
              assignedByName: item.assignment.assignedByName || "",
              assignedAt: item.assignment.assignedAt || "",
            }
          : null,
      };
    });
    return successResponse(
      res,
      "Bookings fetched successfully",
      {
        pageNumber: page,
        count: limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        bookings: formattedBookings,
        statusCounts,
      },
      200,
    );
  } catch (error) {
    return errorResponse(
      res,
      "An unexpected error occurred: " + error.message,
      null,
      500,
    );
  }
});
// ─── apartment GET BOOKINGS ──────────────────────────────────────────────────

const apartmentEventGet = async (req, res) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return errorResponse(res, "apartmentId is required", null, 400);
    }

    const [apartment, events, items, gifts] = await Promise.all([
      Apartment.findById(apartmentId),
      EventBook.find({ status: 1 }).sort({ createdAt: -1 }),
      ItemMaster.find({}).populate("category_id").sort({ createdAt: -1 }),
      GiftMaster.find({}).sort({ createdAt: -1 }).lean(),
    ]);

    if (!apartment) {
      return errorResponse(res, "Apartment not found", null, 404);
    }
    // ================= SQ FEET CHARGES =================
    const sqFeetAmount = [
      {
        size: "10x10",
        charge: apartment.PerDayRent,
      },
      {
        size: "10x20",
        charge: apartment.PerDayRent * 2,
      },
      {
        size: "10x30",
        charge: apartment.PerDayRent * 3,
      },
    ];

    const groupedData = {};

    items.forEach((item) => {
      const categoryKey = item.category_id
        ? item.category_id._id.toString()
        : "NO_CATEGORY";

      if (!groupedData[categoryKey]) {
        groupedData[categoryKey] = {
          // category_id: item.category_id || null,
          category_name: item.category_id
            ? item.category_id.category_name
            : "Uncategorized",
          itemsData: [],
        };
      }

      groupedData[categoryKey].itemsData.push({
        _id: item._id,
        state: item.state,
        item_name: item.item_name,
        item_type: item.item_type,
        amount: item.amount,

        amount_unit: item.amount_unit,
        quantity: item.quantity,
        item_status: item.item_status,
        item_notes: item.item_notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
    });

    // ================= GROUP GIFTS BY TYPE =================
    const groupedGifts = {
      normalGifts: [], // giftType 1
      liveCounterGifts: [], // giftType 2
    };

    gifts.forEach((gift) => {
      if (gift.giftType === 1) {
        groupedGifts.normalGifts.push(gift);
      } else if (gift.giftType === 2) {
        groupedGifts.liveCounterGifts.push(gift);
      }
    });
    return successResponse(
      res,
      "Apartment, Events, Items and Gifts fetched successfully",
      {
        apartment: {
          ...apartment.toObject(),
          sqFeetAmount,
        },
        events,
        elementsDetails: Object.values(groupedData),
        giftsDetails: groupedGifts,
      },
      200,
    );
  } catch (error) {
    return errorResponse(res, "Internal server error", null, 400);
  }
};

// ─── Status Update ──────────────────────────────────────────────────
const updateOrderStatusOnly = asyncHandler(async (req, res) => {
  try {
    const { orderId } = req.query;
    const {
      status,
      additionalNotes,
      closeLossReason,
      poDocument,
      statusDocument,
      voiceDocument,
    } = req.body;
    // ─────────────────────────────────────────────
    // VALIDATIONS
    // ─────────────────────────────────────────────
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return errorResponse(
        res,
        !orderId ? "orderId is required" : "Invalid orderId",
        null,
        400,
      );
    }

    if (status === undefined || status === null) {
      return errorResponse(res, "status is required", null, 400);
    }

    const newStatus = Number(status);
    if (![1, 2, 3, 4, 5, 6].includes(newStatus)) {
      return errorResponse(
        res,
        "Invalid status value. Allowed values: 1,2,3,4,5,6",
        null,
        400,
      );
    }

    // FIND ORDER
    const order = await orderBooking.findById(orderId);
    if (!order) {
      return errorResponse(res, "Order not found", null, 400);
    }

    const currentStatus = order.orderStatus;

    // ─────────────────────────────────────────────
    // HELPER: Safely convert any value to array
    // ─────────────────────────────────────────────
    const toNotesArray = (value) => {
      if (Array.isArray(value)) return value;
      if (value && typeof value === "string" && value.trim() !== "")
        return [value.trim()];
      return [];
    };

    // ─────────────────────────────────────────────
    // NORMALIZE additionalNotes TO ARRAY
    // ─────────────────────────────────────────────
    let normalizedNotes = [];
    if (additionalNotes) {
      if (Array.isArray(additionalNotes)) {
        normalizedNotes = additionalNotes.filter(
          (n) => n && String(n).trim() !== "",
        );
      } else if (
        typeof additionalNotes === "string" &&
        additionalNotes.trim() !== ""
      ) {
        normalizedNotes = [additionalNotes.trim()];
      }
    }

    // ─────────────────────────────────────────────
    // HELPER: Process uploaded document
    // ─────────────────────────────────────────────
    const processUploadedDocument = (uploadedFile, documentData) => {
      let resolvedDocument = null;

      if (uploadedFile) {
        const {
          getFileUrl,
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
        resolvedDocument = documentData;
      }

      return resolvedDocument;
    };

    // ─────────────────────────────────────────────
    // PROCESS STATUS DOCUMENT (Optional)
    // ─────────────────────────────────────────────
    let resolvedStatusDocument = null;
    const uploadedStatusFile = req.files?.statusDocument?.[0];

    if (uploadedStatusFile || statusDocument) {
      resolvedStatusDocument = processUploadedDocument(
        uploadedStatusFile,
        statusDocument,
      );

      if (resolvedStatusDocument) {
        if (
          !resolvedStatusDocument.originalName ||
          !resolvedStatusDocument.fileName ||
          !resolvedStatusDocument.filePath
        ) {
          return errorResponse(
            res,
            "statusDocument must contain originalName, fileName, and filePath",
            null,
            400,
          );
        }
      }
    }

    // ─────────────────────────────────────────────
    // HELPER: Process voice note
    // ─────────────────────────────────────────────
    const processVoiceNote = (uploadedFile, voiceNoteData) => {
      let resolvedVoiceNote = null;

      if (uploadedFile) {
        const {
          getFileUrl,
        } = require("../../../middleware/orderNoteFileUpload");

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
          duration: null,
          uploadedAt: new Date(),
        };
      } else if (voiceNoteData) {
        resolvedVoiceNote = voiceNoteData;

        if (
          resolvedVoiceNote &&
          !resolvedVoiceNote.mimeType?.startsWith("audio/")
        ) {
          throw new Error("Voice note must be an audio file");
        }
      }

      return resolvedVoiceNote;
    };

    // ─────────────────────────────────────────────
    // PROCESS VOICE NOTE (Optional)
    // ─────────────────────────────────────────────
    let resolvedVoiceNote = null;
    const uploadedVoiceFile = req.files?.voiceDocument?.[0];

    try {
      if (uploadedVoiceFile || voiceDocument) {
        resolvedVoiceNote = processVoiceNote(uploadedVoiceFile, voiceDocument);

        if (resolvedVoiceNote) {
          if (
            !resolvedVoiceNote.originalName ||
            !resolvedVoiceNote.fileName ||
            !resolvedVoiceNote.filePath ||
            !resolvedVoiceNote.mimeType
          ) {
            return errorResponse(
              res,
              "voiceNote must contain originalName, fileName, filePath, and mimeType",
              null,
              500,
            );
          }
        }
      }
    } catch (error) {
      return errorResponse(res, error.message, null, 500);
    }
  let resolvedPoDocument = null;
    if (newStatus === 5) {
      // let resolvedPoDocument = null;
      // const uploadedPoFile = req.files?.poDocument?.[0];

      // if (uploadedPoFile) {
      //   const {
      //     getFileUrl,
      //   } = require("../../../middleware/orderNoteFileUpload");

      //   resolvedPoDocument = {
      //     originalName: uploadedPoFile.originalname,
      //     fileName:
      //       uploadedPoFile.filename || uploadedPoFile.key?.split("/").pop(),
      //     filePath: getFileUrl(req, uploadedPoFile),
      //     mimeType: uploadedPoFile.mimetype,
      //     size: uploadedPoFile.size,
      //     fileType: getFileCategory(uploadedPoFile.mimetype),
      //     uploadedAt: new Date(),
      //   };
      // } else if (poDocument) {
      //   resolvedPoDocument = poDocument;
      // }

      // if (!resolvedPoDocument) {
      //   return errorResponse(
      //     res,
      //     "poDocument is mandatory when moving to Close Won",
      //     null,
      //     400,
      //   );
      // }

      // if (
      //   !resolvedPoDocument.originalName ||
      //   !resolvedPoDocument.fileName ||
      //   !resolvedPoDocument.filePath
      // ) {
      //   return errorResponse(
      //     res,
      //     "poDocument must contain originalName, fileName, and filePath",
      //     null,
      //     400,
      //   );
      // }
      // PROCESS PO DOCUMENT (Mandatory)
     
      const uploadedPoFile = req.files?.poDocument?.[0];

      if (uploadedPoFile) {
        const {
          getFileUrl,
        } = require("../../../middleware/orderNoteFileUpload");

        resolvedPoDocument = {
          originalName: uploadedPoFile.originalname,
          fileName:
            uploadedPoFile.filename || uploadedPoFile.key?.split("/").pop(),
          filePath: getFileUrl(req, uploadedPoFile),
          mimeType: uploadedPoFile.mimetype,
          size: uploadedPoFile.size,
          fileType: getFileCategory(uploadedPoFile.mimetype),
          uploadedAt: new Date(),
        };
      } else if (poDocument) {
        resolvedPoDocument = poDocument;
      }

      // Validation
      if (!resolvedPoDocument) {
        return errorResponse(
          res,
          "poDocument is mandatory when moving to Close Won",
          null,
          400,
        );
      }

      if (
        !resolvedPoDocument.originalName ||
        !resolvedPoDocument.fileName ||
        !resolvedPoDocument.filePath
      ) {
        return errorResponse(
          res,
          "poDocument must contain originalName, fileName, and filePath",
          null,
          400,
        );
      }
      // historyEntry.poDocument = resolvedPoDocument;
      // order.poDocument = resolvedPoDocument;
    }
    // ─────────────────────────────────────────────
    // ENSURE orderHistory EXISTS
    // ─────────────────────────────────────────────
    if (!order.orderHistory) order.orderHistory = [];

    // ─────────────────────────────────────────────
    // CHECK IF SAME TRANSITION ENTRY ALREADY EXISTS
    // If same fromStatus → toStatus: push notes & documents into it
    // ─────────────────────────────────────────────
    // const existingEntryIndex = order.orderHistory.findIndex(
    //   (h) => h.fromStatus === currentStatus && h.toStatus === newStatus,
    // );
    // ─────────────────────────────────────────────
    // CHECK IF SAME STATUS (fromStatus === newStatus)
    // Don't create new entry — push into the existing toStatus entry
    // ─────────────────────────────────────────────
    const isSameStatus = currentStatus === newStatus;

    const existingEntryIndex = order.orderHistory.findIndex((h) =>
      isSameStatus
        ? h.toStatus === newStatus
        : h.fromStatus === currentStatus && h.toStatus === newStatus,
    );

    if (existingEntryIndex !== -1) {
      const existingEntry = order.orderHistory[existingEntryIndex];

      // Push new notes into existing entry
      if (normalizedNotes.length > 0) {
        existingEntry.additionalNotes = [
          ...toNotesArray(existingEntry.additionalNotes),
          ...normalizedNotes,
        ];
      }
if (resolvedPoDocument) {
  if (!Array.isArray(existingEntry.poDocument)) {
    // Migrate old single object to array if needed
    existingEntry.poDocument = existingEntry.poDocument
      ? [existingEntry.poDocument]
      : [];
  }
  existingEntry.poDocument.push(resolvedPoDocument);
}
      // Push new statusDocument into existing entry's statusDocument array
      if (resolvedStatusDocument) {
        if (!Array.isArray(existingEntry.statusDocument)) {
          // Migrate old single object to array if needed
          existingEntry.statusDocument = existingEntry.statusDocument
            ? [existingEntry.statusDocument]
            : [];
        }
        existingEntry.statusDocument.push(resolvedStatusDocument);
      }

      // Push new voiceDocument into existing entry (keep latest)
      if (resolvedVoiceNote) {
        if (!Array.isArray(existingEntry.voiceDocument)) {
          // Migrate old single object to array if needed
          existingEntry.voiceDocument = existingEntry.voiceDocument
            ? [existingEntry.voiceDocument]
            : [];
        }
        existingEntry.voiceDocument.push(resolvedVoiceNote);
      }

      // Update order-level additionalNotes safely
      if (normalizedNotes.length > 0) {
        order.additionalNotes = [
          ...toNotesArray(order.additionalNotes),
          ...normalizedNotes,
        ];
      }
  if (newStatus === 5 && resolvedPoDocument) {
        order.poDocument = resolvedPoDocument;
      }
      order.markModified("orderHistory");
      await order.save();

      return successResponse(
        res,
        `Updated existing history entry for ${getStatusText(currentStatus)} → ${getStatusText(newStatus)}`,
        {
          orderId: order._id,
          orderNo: order.orderId,
          previousStatus: getStatusText(currentStatus),
          currentStatus: getStatusText(newStatus),
          hasAdditionalNotes: normalizedNotes.length > 0,
          hasDocument: !!resolvedStatusDocument,
          hasVoiceNote: !!resolvedVoiceNote,
          updatedAt: new Date(),
        },
        200,
      );
    }

    // ─────────────────────────────────────────────
    // NEW HISTORY ENTRY
    // ─────────────────────────────────────────────
    let historyEntry = {
      fromStatus: currentStatus,
      fromStatusText: getStatusText(currentStatus),
      toStatus: newStatus,
      toStatusText: getStatusText(newStatus),
      changedBy: req.user?.name || "Admin",
      changedAt: new Date(),
      additionalNotes: normalizedNotes,
      poDocument:resolvedPoDocument ? [resolvedPoDocument] : [],
      // statusDocument is now array
      statusDocument: resolvedStatusDocument ? [resolvedStatusDocument] : [],
      voiceDocument: resolvedVoiceNote,
    };

    // ─────────────────────────────────────────────
    // STATUS 5: Close Won — poDocument mandatory
    // ─────────────────────────────────────────────
   

    // ─────────────────────────────────────────────
    // STATUS 6: Closed Loss — closeLossReason mandatory
    // ─────────────────────────────────────────────
    if (newStatus === 6) {
      if (!closeLossReason || closeLossReason.trim() === "") {
        return errorResponse(
          res,
          "closeLossReason is required when moving to Closed Loss",
          null,
          400,
        );
      }

      historyEntry.closeLossReason = closeLossReason;
      order.closeLossReason = closeLossReason;
    }

    // ─────────────────────────────────────────────
    // HANDLE REOPENING LOGIC
    // ─────────────────────────────────────────────
    if (
      (currentStatus === 5 || currentStatus === 6) &&
      newStatus !== currentStatus
    ) {
      historyEntry.remarks = `Order reopened from ${getStatusText(currentStatus)} to ${getStatusText(newStatus)}`;
    }

    // ─────────────────────────────────────────────
    // COMMON UPDATES
    // ─────────────────────────────────────────────

    // Update order-level additionalNotes safely
    if (normalizedNotes.length > 0) {
      order.additionalNotes = [
        ...toNotesArray(order.additionalNotes),
        ...normalizedNotes,
      ];
    }

       // Update order-level poDocument for status 5
    if (newStatus === 5 && resolvedPoDocument) {
      order.poDocument = resolvedPoDocument;
    }
    // ─────────────────────────────────────────────
    // UPDATE ORDER
    // ─────────────────────────────────────────────
    order.orderStatus = newStatus;
    order.updatedBy = req.user?.name;
    order.orderHistory.push(historyEntry);

    await order.save();

    // ─────────────────────────────────────────────
    // RESPONSE
    // ─────────────────────────────────────────────

    return successResponse(
      res,
      `Order status updated from ${getStatusText(currentStatus)} to ${getStatusText(newStatus)} successfully`,
      {
        orderId: order._id,
        orderNo: order.orderId,
        previousStatus: getStatusText(currentStatus),
        currentStatus: getStatusText(newStatus),
        hasAdditionalNotes: normalizedNotes.length > 0,
        hasDocument: !!resolvedStatusDocument,
        hasVoiceNote: !!resolvedVoiceNote,
        updatedAt: new Date(),
      },
      200,
    );
  } catch (error) {
    return errorResponse(res, error.message, null, 500);
  }
});

// ─── GET SINGLE ORDER DETAILS ──────────────────────────────────

const getOrderDetails = asyncHandler(async (req, res) => {
  const { orderId } = req.query;

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return errorResponse(
      res,
      !orderId ? "orderId is required" : "Invalid orderId",
      null,
      400,
    );
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
    return errorResponse(res, "Order not found", null, 400);
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
  return successResponse(
    res,
    "Order fetched successfully",
    formattedOrder,
    200,
  );
});

// ─────────────────────────────────────────────
// SEND ORDER MAIL USING EXISTING ORDER DATA
// ─────────────────────────────────────────────
const getCloseWonPoDocument = (orderData) => {
  if (!orderData?.orderHistory) return null;
  
  const closeWonEntry = orderData.orderHistory.find(
    history => history.toStatus === 5 // Close Won status
  );
  
  return closeWonEntry?.poDocument || null;
};
const sendOrderMail = asyncHandler(async (req, res) => {
  try {
    const { orderId } = req.query;

    // ─────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────

    if (!orderId) {
      return errorResponse(res, "orderId is required", null, 400);
    }

    // ─────────────────────────────────────────────
    // GET ORDER DATA
    // ─────────────────────────────────────────────

    const orderData = await orderBooking.findOne({
      _id: orderId,
    });

    if (!orderData) {
      return errorResponse(res, "Order not found", null, 400);
    }

    if (orderData.isMailSent === true) {
      return res.status(400).json({
        success: false,
        message: "Mail has already been sent for this order",
        mailSentAt: orderData.mailSentAt,
        orderStatus: 7,
      });
    }
    // ─────────────────────────────────────────────
    // STATUS VALIDATION - MUST BE STATUS 5 TO SEND MAIL
    // ─────────────────────────────────────────────

    if (orderData.orderStatus !== 5) {
      const currentStatusText = getStatusText(orderData.orderStatus);
      return res.status(400).json({
        success: false,
        message: `Cannot send order email. Current status is "${currentStatusText}". Order must be in "Close Won" (Status 5) status to send email.`,
        currentStatus: orderData.orderStatus,
        currentStatusText: currentStatusText,
        requiredStatus: 5,
        requiredStatusText: "Close Won",
      });
    }
    // ─────────────────────────────────────────────
    // PHP MAIL API PAYLOAD
    // ─────────────────────────────────────────────

    const adminEmail = process.env.ADMIN_EMAIL || "srfsdev@adinn.co.in";
    const toMail = process.env.T0_EMail;
    const ccMail = process.env.CC_EMail;
    const mailPayload = {
      mailtype: "apartmentevent",

      userEmail: orderData?.customerDetails?.email || "",

      adminEmail: adminEmail,
      to: toMail,
      cc: ccMail,
      customerDetails: {
        // Customer Details (these come from customerDetails object)
        customerType: orderData?.customerDetails?.customerType || "",
        gstNumber: orderData?.customerDetails?.gstNumber || "",
        designation: orderData?.customerDetails?.designation || "",
        brandOrCompanyName:
          orderData?.customerDetails?.brandOrCompanyName || "",
        contactPersonName: orderData?.customerDetails?.contactPersonName || "",
        contactPersonPhoneNumber:
          orderData?.customerDetails?.contactPersonPhoneNumber || "",
        email: orderData?.customerDetails?.email || "",
        additionalNotes: orderData?.customerDetails?.customerAdditionalNotes || "",
        gstNumber: orderData?.customerDetails?.gstNumber || "",
        designation: orderData?.customerDetails?.designation || "",
      },

      // Order Details
      orderId: orderData?.orderId,
      daysOfEvent: orderData?.daysOfEvent,
      fromDate: orderData?.fromDate
        ? new Date(orderData.fromDate)
            .toLocaleDateString("en-GB")
            .replace(/\//g, "-")
        : null,
      toDate: orderData?.toDate
        ? new Date(orderData.toDate)
            .toLocaleDateString("en-GB")
            .replace(/\//g, "-")
        : null,

      // Apartment Details
      apartmentDetails: {
        apartmentName: orderData?.apartmentDetails?.ApartmentName || "",
        city: orderData?.apartmentDetails?.city || "",
        location: orderData?.apartmentDetails?.location || "",
        perDayRent: orderData?.apartmentDetails?.perDayRent || 0,
      },

      // Event Details
      eventDetails: {
        eventName: orderData?.eventDetails?.eventName || "",
        amount: orderData?.eventDetails?.amount || 0,
      },

      // Promoter Details (flattened)
      promoterRequired: orderData?.promoterRequired || 0,
      promoterCount: orderData?.promoterCount || 0,

      // Promoters array with all fields
      promoters: orderData?.promoters || [], // This will include promoterGender, promoterPerDayCharge, promoterLanguage, promoterLookAndAppearance,promoterDays

      // Amount Summary (flattened)
      apartmentAmount: orderData?.apartmentAmount || 0,
      // sqfetAmount: orderData?.sqfetAmount || 0,
      eventAmount: orderData?.eventAmount || 0,
      promoterTotal: orderData?.promoterTotal || 0,
      subTotal: orderData?.subTotal || 0,
      discountAmount: orderData?.discountAmount || 0,
      taxableAmount: orderData?.taxableAmount || 0,
      gstAmount: orderData?.gstAmount || 0,
      totalAmount: orderData?.totalAmount || 0,

      // PO Document
      // poDocument: orderData?.poDocument || null,
      poDocument: getCloseWonPoDocument(orderData) || null,
    };

    console.log("📧 PHP MAIL PAYLOAD:", JSON.stringify(mailPayload, null, 2));

    // ─────────────────────────────────────────────
    // SEND MAIL API
    // ─────────────────────────────────────────────

    const response = await axios.post(
      "https://adinndigital.com/api/apartmenteventmanagement/index_apartmenteventmanagement.php",
      mailPayload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log("✅ PHP Mail Sent:", response.data);

    // ─────────────────────────────────────────────
    // RESPONSE
    // ─────────────────────────────────────────────

    const isMailSuccess =
      response.data &&
      (response.data.success === true ||
        response.data.status === "success" ||
        response.status === 200);

    if (!isMailSuccess) {
      return res.status(500).json({
        success: false,
        message: "Mail API returned failure response",
        phpResponse: response.data,
      });
    }

    // ─────────────────────────────────────────────
    // UPDATE ORDER WITH MAIL SENT STATUS AND TIMESTAMP
    // ─────────────────────────────────────────────

    const updatedOrder = await orderBooking.findByIdAndUpdate(
      orderId,
      {
        $set: {
          isMailSent: true,
          mailSentAt: new Date(),
          orderStatus: 7,
        },
        $push: {
          orderHistory: {
            fromStatus: orderData.orderStatus,
            fromStatusText: getStatusText(orderData.orderStatus),
            toStatus: 7,
            toStatusText: getStatusText(7),
            changedBy: req.user?.name || "Admin",
            changedAt: new Date(),
            remarks: `Order confirmation email sent successfully to ${orderData?.customerDetails?.email}`,
            additionalNotes: `Mail sent at: ${new Date().toISOString()}`,
          },
        },
      },
      { new: true }, // Return updated document
    );

    console.log("📧 Order updated with mail sent status:", {
      isMailSent: updatedOrder.isMailSent,
      mailSentAt: updatedOrder.mailSentAt,
      orderId: updatedOrder.orderId,
    });

    // ─────────────────────────────────────────────
    // RESPONSE
    // ─────────────────────────────────────────────

    return res.status(200).json({
      success: true,
      message: "Mail sent successfully and order updated",
      data: {
        isMailSent: updatedOrder.isMailSent,
        mailSentAt: updatedOrder.mailSentAt,
        orderId: updatedOrder.orderId,
        orderStatus: 7,
      },
      phpResponse: response.data,
    });
  } catch (error) {
    console.log("❌ Send Mail Error:", error);
  }
});

const assignBookingUser = async (req, res) => {
  try {
    const { orderId, userId, assignedToType } = req.body;

    // Only Admin can assign
    if (req.user.userType !== 1) {
      return errorResponse(res, "Only Admin can assign bookings", null, 403);
    }

    // Validation
    if (!orderId) {
      return errorResponse(res, "orderId is required", null, 400);
    }

    if (!userId) {
      return errorResponse(res, "userId is required", null, 400);
    }

    if (!assignedToType) {
      return errorResponse(res, "assignedToType is required", null, 400);
    }

    if (![1, 2].includes(Number(assignedToType))) {
      return errorResponse(
        res,
        "assignedToType must be 1 (Admin) or 2 (Staff Admin)",
        null,
        400,
      );
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return errorResponse(res, "Invalid orderId", null, 400);
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return errorResponse(res, "Invalid userId", null, 400);
    }

    // Find Booking
    const booking = await orderBooking.findById(orderId);

    if (!booking) {
      return errorResponse(res, "Booking not found", null, 400);
    }

    // Prevent Reassignment
    if (booking.assignment?.assignedUserId) {
      return errorResponse(
        res,
        `This booking is already assigned to ${booking.assignment.assignedUserName}`,
        null,
        400,
      );
    }

    // Find User Based On Type
    let assignedUser = null;

    if (Number(assignedToType) === 1) {
      assignedUser = await Admin.findById(userId);
      console.log("Admin User:", assignedUser);
    } else if (Number(assignedToType) === 2) {
      assignedUser = await StaffAdminUser.findById(userId);
      console.log("Staff Admin User:", assignedUser);
    }

    if (!assignedUser) {
      return errorResponse(res, "Assigned user not found", null, 404);
    }

    // Format Date Time
    const now = new Date();

    const assignedAt = `${String(now.getDate()).padStart(2, "0")}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}-${now.getFullYear()} ${String(now.getHours()).padStart(
      2,
      "0",
    )}:${String(now.getMinutes()).padStart(
      2,
      "0",
    )}:${String(now.getSeconds()).padStart(2, "0")}`;

    // User Name Handling
    const assignedUserName =
      assignedUser.userName ||
      assignedUser.name ||
      assignedUser.adminName ||
      "";

    const assignedByName =
      req.user?.userName || req.user?.name || req.user?.adminName || "";

    // Save Assignment
    booking.assignment = {
      assignedToType: Number(assignedToType), // 1=Admin, 2=Staff Admin
      assignedUserId: assignedUser._id,
      assignedUserName,
      assignedById: req.user?.id,
      assignedByName,
      assignedAt,
    };

    await booking.save();

    return successResponse(res, "Booking assigned successfully", booking, 200);
  } catch (error) {
    return errorResponse(res, "Internal Server Error", null, 400);
  }
};

module.exports = {
  createBooking,
  listAllBookings,
  apartmentEventGet,
  getOrderDetails,
  updateOrderStatusOnly,
  sendOrderMail,
  assignBookingUser,
};
