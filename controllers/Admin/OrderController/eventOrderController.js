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

async function generateAdminOrderId() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const prefix = `${year}${month}${day}`;

  // Find the highest order number for today's prefix
  const lastOrder = await orderBooking
    .findOne({
      orderId: { $regex: `^${prefix}ORD#` },
    })
    .sort({ orderId: -1 })
    .limit(1);

  let nextNumber = 1;
  if (lastOrder) {
    // Extract the number from orderId (e.g., "20260615ORD#2" -> 2)
    const match = lastOrder.orderId.match(/#(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  // Ensure the orderId doesn't already exist (rare case)
  let orderId = `${prefix}ORD#${nextNumber}`;
  let exists = await orderBooking.findOne({ orderId });
  while (exists) {
    nextNumber++;
    orderId = `${prefix}ORD#${nextNumber}`;
    exists = await orderBooking.findOne({ orderId });
  }

  return orderId;
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
      dateRanges,
      totalDaysOfEvent,
      promoterRequired,
      stageRequired,
      promoterCount,
      promoters,
      customerDetails,
      discountType,
      discountPercentage,
      sqfet,
      items = [],
      gifts = [],
      orderNoteText,
      orderNoteFiles,
    } = req.body;

    // ─────────────────────────────────────────────
    // VALIDATE ITEMS & GIFTS
    // ─────────────────────────────────────────────

    let items_total = 0;
    let gifts_total = 0;
    let itemsAndGiftsTotal = 0;
    let orderItems = [];
    let orderGifts = [];

    // Process items if provided
    if (items && items.length > 0) {
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

      const itemIds = [...new Set(items.map((i) => i.item_id))];
      const dbItems = await ItemMaster.find({
        _id: { $in: itemIds },
        item_status: 1,
      });
      const dbItemMap = {};
      dbItems.forEach((doc) => {
        dbItemMap[doc._id.toString()] = doc;
      });

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

      const giftIds = [...new Set(gifts.map((g) => g.gift_id))];
      const dbGifts = await GiftMaster.find({
        _id: { $in: giftIds },
        status: 1,
      });
      const dbGiftMap = {};
      dbGifts.forEach((doc) => {
        dbGiftMap[doc._id.toString()] = doc;
      });

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
    // VALIDATE DATE RANGES
    // ─────────────────────────────────────────────

    if (!dateRanges || !Array.isArray(dateRanges) || dateRanges.length === 0) {
      return errorResponse(
        res,
        "dateRanges is required with at least one entry",
        null,
        400,
      );
    }

    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i;
    const parsedDateRanges = [];
    let computedTotalDays = 0;

    for (let r = 0; r < dateRanges.length; r++) {
      const range = dateRanges[r];

      // ── Validate fromDate / toDate ──
      if (!range.fromDate) {
        return errorResponse(
          res,
          `dateRanges[${r}]: fromDate is required`,
          null,
          400,
        );
      }
      if (!range.toDate) {
        return errorResponse(
          res,
          `dateRanges[${r}]: toDate is required`,
          null,
          400,
        );
      }

      const parsedFrom = new Date(range.fromDate);
      const parsedTo = new Date(range.toDate);

      if (isNaN(parsedFrom.getTime())) {
        return errorResponse(
          res,
          `dateRanges[${r}]: invalid fromDate`,
          null,
          400,
        );
      }
      if (isNaN(parsedTo.getTime())) {
        return errorResponse(
          res,
          `dateRanges[${r}]: invalid toDate`,
          null,
          400,
        );
      }
      if (parsedTo < parsedFrom) {
        return errorResponse(
          res,
          `dateRanges[${r}]: toDate must be on or after fromDate`,
          null,
          400,
        );
      }

      // ── Validate daysOfEvent ──
      if (!range.daysOfEvent || Number(range.daysOfEvent) < 1) {
        return errorResponse(
          res,
          `dateRanges[${r}]: daysOfEvent must be at least 1`,
          null,
          400,
        );
      }
      const rangeDays = Number(range.daysOfEvent);
      computedTotalDays += rangeDays;

      // ── Validate dailySchedule ──
      const schedule = range.dailySchedule;
      if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
        return errorResponse(
          res,
          `dateRanges[${r}]: dailySchedule is required with at least one entry`,
          null,
          400,
        );
      }

      // Number of schedule entries must match daysOfEvent for this range
      if (schedule.length !== rangeDays) {
        return errorResponse(
          res,
          `dateRanges[${r}]: number of dailySchedule entries (${schedule.length}) must match daysOfEvent (${rangeDays})`,
          null,
          400,
        );
      }

      // Validate each schedule entry inside this range
      const scheduleDates = [];
      for (let s = 0; s < schedule.length; s++) {
        const slot = schedule[s];

        if (!slot.date) {
          return errorResponse(
            res,
            `dateRanges[${r}].dailySchedule[${s}]: date is required (YYYY-MM-DD)`,
            null,
            400,
          );
        }
        if (!slot.fromTime) {
          return errorResponse(
            res,
            `dateRanges[${r}].dailySchedule[${s}]: fromTime is required`,
            null,
            400,
          );
        }
        if (!slot.toTime) {
          return errorResponse(
            res,
            `dateRanges[${r}].dailySchedule[${s}]: toTime is required`,
            null,
            400,
          );
        }

        // Validate time format
        if (!timeRegex.test(slot.fromTime) || !timeRegex.test(slot.toTime)) {
          return errorResponse(
            res,
            `dateRanges[${r}].dailySchedule[${s}]: invalid time format for date ${slot.date}. Use "10:00 AM" or "2:00 PM"`,
            null,
            400,
          );
        }

        // Ensure the schedule date falls within the range's fromDate–toDate
        const slotDate = new Date(slot.date);
        if (isNaN(slotDate.getTime())) {
          return errorResponse(
            res,
            `dateRanges[${r}].dailySchedule[${s}]: invalid date "${slot.date}"`,
            null,
            400,
          );
        }
        if (slotDate < parsedFrom || slotDate > parsedTo) {
          return errorResponse(
            res,
            `dateRanges[${r}].dailySchedule[${s}]: date "${slot.date}" is outside the range ${range.fromDate} – ${range.toDate}`,
            null,
            400,
          );
        }

        scheduleDates.push(slot.date);
      }

      // No duplicate dates within the same range
      if (new Set(scheduleDates).size !== scheduleDates.length) {
        return errorResponse(
          res,
          `dateRanges[${r}]: duplicate dates found in dailySchedule`,
          null,
          400,
        );
      }

      parsedDateRanges.push({
        fromDate: parsedFrom,
        toDate: parsedTo,
        daysOfEvent: rangeDays,
        dailySchedule: schedule,
      });
    }

    // ── Validate that dateRanges do not overlap each other ──
    for (let i = 0; i < parsedDateRanges.length; i++) {
      for (let j = i + 1; j < parsedDateRanges.length; j++) {
        const a = parsedDateRanges[i];
        const b = parsedDateRanges[j];
        if (a.fromDate <= b.toDate && b.fromDate <= a.toDate) {
          return errorResponse(
            res,
            `dateRanges[${i}] and dateRanges[${j}] overlap each other`,
            null,
            400,
          );
        }
      }
    }

    // ── Validate totalDaysOfEvent matches sum of individual daysOfEvent ──
    if (totalDaysOfEvent && Number(totalDaysOfEvent) !== computedTotalDays) {
      return errorResponse(
        res,
        `totalDaysOfEvent (${totalDaysOfEvent}) does not match the sum of daysOfEvent across all dateRanges (${computedTotalDays})`,
        null,
        400,
      );
    }

    const finalTotalDaysOfEvent = computedTotalDays;

    // ─────────────────────────────────────────────
    // ORDER NOTE
    // ─────────────────────────────────────────────

    // const uploadedFiles = req.files?.orderNoteFiles || [];

    // const orderNote = {
    //   text: orderNoteText || "",
    //   files: uploadedFiles.map((file) => ({
    //     originalName: file.originalname,
    //     fileName: file.filename,
    //     filePath: file.path,
    //     mimeType: file.mimetype,
    //     size: file.size,
    //     fileType: getFileCategory(file.mimetype),
    //   })),
    // };

    // if (!uploadedFiles.length && orderNoteText) {
    //   orderNote.files = [];
    // }
const processOrderNoteFile = async (uploadedFile) => {
  const {
    getFileUrl,
  } = require("../../../middleware/orderNoteFileUpload");

  let durationInSeconds = null;
  let formattedDuration = null;

  if (uploadedFile.mimetype.startsWith("audio/")) {
    try {
      const mm = require("music-metadata");

      const metadata = await mm.parseFile(uploadedFile.path);

      if (metadata.format.duration) {
        durationInSeconds = metadata.format.duration;
        formattedDuration = formatDuration(durationInSeconds);
      }
    } catch (err) {
      console.warn(
        "Could not extract audio duration:",
        err.message
      );
    }
  }

  return {
    originalName: uploadedFile.originalname,
    fileName:
      uploadedFile.filename ||
      uploadedFile.key?.split("/").pop(),
    filePath: getFileUrl(req, uploadedFile),
    mimeType: uploadedFile.mimetype,
    size: uploadedFile.size,
    fileType: getFileCategory(uploadedFile.mimetype),
    duration: formattedDuration,
    durationInSeconds,
    uploadedAt: new Date(),
    uploadedBy: req.user.name,
  };
};

const uploadedFile = req.files?.orderNoteFiles?.[0];

const orderNote = {
  text: orderNoteText || "",
  files: uploadedFile
    ? await processOrderNoteFile(uploadedFile)
    : null,
};
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
    // CHECK OVERLAPPING BOOKINGS IN DB
    // Each dateRange in the new request must not conflict with any
    // existing booking's dateRanges for the same apartment.
    // ─────────────────────────────────────────────

    for (let r = 0; r < parsedDateRanges.length; r++) {
      const { fromDate: rFrom, toDate: rTo } = parsedDateRanges[r];

      const overlappingBooking = await orderBooking.findOne({
        _id: { $ne: existingCustomerBooking?._id },
        apartmentId,
        dateRanges: {
          $elemMatch: {
            fromDate: { $lte: rTo },
            toDate: { $gte: rFrom },
          },
        },
      });

      if (overlappingBooking) {
        const conflictRange = overlappingBooking.dateRanges.find(
          (dr) => new Date(dr.fromDate) <= rTo && new Date(dr.toDate) >= rFrom,
        );
        return errorResponse(
          res,
          `Already booking for` +
            (conflictRange
              ? ` (${new Date(conflictRange.fromDate).toDateString()} – ${new Date(conflictRange.toDate).toDateString()})`
              : ""),
          null,
          409,
        );
      }
    }

    // ─────────────────────────────────────────────
    // CALCULATE AMOUNTS
    // Uses finalTotalDaysOfEvent (sum of all range daysOfEvent)
    // ─────────────────────────────────────────────

    const apartmentAmount = Math.floor(
      (apartment.PerDayRent || 0) * (sqfet || 1) * (finalTotalDaysOfEvent || 0),
    );

    const eventAmount = Math.floor(
      (event.amount || 0) * (finalTotalDaysOfEvent || 0),
    );
  // let promoterTotal = 0;
  // const promotersWithAmount = (promoters || []).map((p) => {
  //   const promoterAmount = Math.floor(
  //     (p.promoterPerDayCharge || 0) * (eventDays || 0),
  //   );
  //   promoterTotal += promoterAmount;
  //   return {
  //     ...p,
  //     promoterAmount,
  //   };
  // });
    let promoterTotal = 0;
    const PROMOTER_PER_DAY_CHARGE =
      Number(process.env.PROMOTER_PER_DAY_CHARGE) || 1500;

    const promotersWithAmount = (promoters || []).map((p) => {
      const promoterAmount = Math.floor(
        PROMOTER_PER_DAY_CHARGE * (p.promoterDays || 0),
      );
      promoterTotal += promoterAmount;
      return {
        ...p,
        promoterPerDayCharge: PROMOTER_PER_DAY_CHARGE,
        promoterAmount,
      };
    });

    const subTotal = Math.floor(
      apartmentAmount + eventAmount + promoterTotal + itemsAndGiftsTotal,
    );

    let discountAmount = 0;
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
      existingCustomerBooking.dateRanges = parsedDateRanges;
      existingCustomerBooking.totalDaysOfEvent = finalTotalDaysOfEvent;
      existingCustomerBooking.sqfet = sqfet;
      existingCustomerBooking.promoterRequired = promoterRequired;
      existingCustomerBooking.stageRequired = stageRequired;
      existingCustomerBooking.promoterCount = promoterCount;
      existingCustomerBooking.promoters = promotersWithAmount;
      existingCustomerBooking.customerDetails = customerDetails;
      existingCustomerBooking.discountPercentage = discountPercentage;
      existingCustomerBooking.discountType = discountType;
      existingCustomerBooking.apartmentAmount = apartmentAmount;
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

      if (orderItems.length > 0) existingCustomerBooking.items = orderItems;
      if (orderGifts.length > 0) existingCustomerBooking.gifts = orderGifts;
      existingCustomerBooking.items_total = items_total;
      existingCustomerBooking.gifts_total = gifts_total;
      existingCustomerBooking.itemsAndGiftsTotal = itemsAndGiftsTotal;

      existingCustomerBooking.updatedBy = req.user?.name;
      existingCustomerBooking.userType = req.user?.userType;

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

      // ── NEW fields ──
      dateRanges: parsedDateRanges,
      totalDaysOfEvent: finalTotalDaysOfEvent,

      sqfet,
      promoterRequired,
      stageRequired,
      promoterCount,
      promoters: promotersWithAmount,
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
      totalAmount: finalTotalAmount,
      orderNote,
      items: orderItems,
      gifts: orderGifts,
      items_total,
      gifts_total,
      itemsAndGiftsTotal,
      orderStatus: 1,
      orderHistory: [initialHistoryEntry],
      createdBy: req.user?.name,
      updatedBy: req.user?.name,
      userType: req.user?.userType,
    });

    return successResponse(res, "Booking created successfully", "Success", 201);
  } catch (error) {
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
// Helper function to get status text
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

  // ─── DATE FILTER - CORRECTED VERSION ─────────────────────────────────────────────────────────
  if (fromDate || toDate) {
    const dateConditions = [];

    // Handle fromDate (single date or start date)
    if (fromDate && !toDate) {
      // Only fromDate provided - find bookings that include this specific date
      const parts = fromDate.split("-");
      if (!parts || parts.length !== 3) {
        return { error: "Invalid fromDate format. Use DD-MM-YYYY" };
      }
      const [dd, mm, yyyy] = parts;
      const startOfDay = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
        0,
        0,
        0,
        0,
      );
      const endOfDay = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
        23,
        59,
        59,
        999,
      );

      if (isNaN(startOfDay.getTime())) {
        return { error: "Invalid fromDate format. Use DD-MM-YYYY" };
      }

      // Check if any date range in the array includes this specific date
      dateConditions.push({
        dateRanges: {
          $elemMatch: {
            fromDate: { $lte: endOfDay },
            toDate: { $gte: startOfDay },
          },
        },
      });
    }
    // Handle toDate only
    else if (!fromDate && toDate) {
      // Only toDate provided - find bookings that include this specific date
      const parts = toDate.split("-");
      if (!parts || parts.length !== 3) {
        return { error: "Invalid toDate format. Use DD-MM-YYYY" };
      }
      const [dd, mm, yyyy] = parts;
      const startOfDay = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
        0,
        0,
        0,
        0,
      );
      const endOfDay = new Date(
        Number(yyyy),
        Number(mm) - 1,
        Number(dd),
        23,
        59,
        59,
        999,
      );

      if (isNaN(endOfDay.getTime())) {
        return { error: "Invalid toDate format. Use DD-MM-YYYY" };
      }

      dateConditions.push({
        dateRanges: {
          $elemMatch: {
            fromDate: { $lte: endOfDay },
            toDate: { $gte: startOfDay },
          },
        },
      });
    }
    // Handle both fromDate and toDate (date range)
    else if (fromDate && toDate) {
      // Parse fromDate
      const fromParts = fromDate.split("-");
      if (!fromParts || fromParts.length !== 3) {
        return { error: "Invalid fromDate format. Use DD-MM-YYYY" };
      }
      const [fromDD, fromMM, fromYYYY] = fromParts;
      const fromDateObj = new Date(
        Number(fromYYYY),
        Number(fromMM) - 1,
        Number(fromDD),
        0,
        0,
        0,
        0,
      );

      if (isNaN(fromDateObj.getTime())) {
        return { error: "Invalid fromDate format. Use DD-MM-YYYY" };
      }

      // Parse toDate
      const toParts = toDate.split("-");
      if (!toParts || toParts.length !== 3) {
        return { error: "Invalid toDate format. Use DD-MM-YYYY" };
      }
      const [toDD, toMM, toYYYY] = toParts;
      const toDateObj = new Date(
        Number(toYYYY),
        Number(toMM) - 1,
        Number(toDD),
        23,
        59,
        59,
        999,
      );

      if (isNaN(toDateObj.getTime())) {
        return { error: "Invalid toDate format. Use DD-MM-YYYY" };
      }

      // Find bookings that overlap with the date range
      dateConditions.push({
        dateRanges: {
          $elemMatch: {
            fromDate: { $lte: toDateObj },
            toDate: { $gte: fromDateObj },
          },
        },
      });
    }

    // Apply the date conditions
    if (dateConditions.length > 0) {
      filter.$and = dateConditions;
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (search && search.trim() !== "") {
    const searchRegex = new RegExp(search.trim(), "i");
    const matchedApartments = await Apartment.find(
      { ApartmentName: searchRegex },
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

    if (filter.$and) {
      filter.$and.push({ $or: orConditions });
    } else {
      filter.$or = orConditions;
    }
  }

  return { filter };
};
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
// const listAllBookings = asyncHandler(async (req, res) => {
//   try {
//     const { pageNumber, count } = req.body || {};
//     if (!pageNumber || !count) {
//       return errorResponse(res, "pageNumber and count are required", null, 400);
//     }
//     const page = parseInt(pageNumber);
//     const limit = parseInt(count);
//     const skip = (page - 1) * limit;
//     const filterResult = await buildBookingFilters(req.body);
//     if (filterResult.error) {
//       return errorResponse(res, filterResult.error, null, 400);
//     }
//     const filter = filterResult.filter;
//     // =====================================================
//     // ROLE BASED FILTER
//     // Admin (userType = 1) -> Show All Bookings
//     // Staff (userType = 2) -> Show Only Assigned Bookings
//     // =====================================================
//     // if (req.user?.userType === 2) {
//     //   filter["assignment.assignedUserId"] = new mongoose.Types.ObjectId(
//     //     req.user.id,
//     //   );
//     // }
//     // Get status counts
//     const statusCounts = await getOrderStatusCounts(filter);

//     if (filterResult.noMatch) {
//       return successResponse(
//         res,
//         "Bookings fetched successfully",
//         {
//           pageNumber: page,
//           count: limit,
//           totalCount: 0,
//           totalPages: 0,
//           bookings: [],
//           statusCounts,
//         },
//         200,
//       );
//     }

//     const [totalCount, bookings] = await Promise.all([
//       orderBooking.countDocuments(filter),
//       orderBooking
//         .find(filter)
//         .populate({ path: "apartmentId", select: "ApartmentName" })
//         .populate({ path: "eventId", select: "eventName" })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//     ]);
//     // FIXED: Properly remove unwanted fields using destructuring
//     const formattedBookings = bookings.map((item) => {
//       // Destructure to exclude unwanted fields
//       const {
//         items,
//         gifts,
//         items_total,
//         gifts_total,
//         dailySchedule,
//         promoters,
//         eventDetails,
//         apartmentAmount,
//         eventAmount,
//         promoterTotal,
//         itemsAndGiftsTotal,
//         subTotal,
//         discountAmount,
//         taxableAmount,
//         gstAmount,
//         orderHistory,
//         customerDetails,
//         apartmentDetails,
//         discountType,
//         discountPercentage,
//         finalAmount,
//         sqfet,
//         poDocument,
//         document,
//         voiceNote,
//         orderNote,
//         promoterRequired,
//         stageRequired,
//         promoterCount,
//         ...rest
//       } = item;

//       return {
//         ...rest,
//         orderStatusText: getStatusText(item.orderStatus),
//         apartmentId: item.apartmentId?._id || null,
//         apartmentName: item.apartmentId?.ApartmentName || "",
//         eventId: item.eventId?._id || null,
//         eventName: item.eventId?.eventName || "",

//         customerDetails: {
//           brandOrCompanyName: customerDetails?.brandOrCompanyName || "",
//         },
//         assignment: item.assignment
//           ? {
//               assignedToType: item.assignment.assignedToType || null,
//               assignedUserId: item.assignment.assignedUserId || null,
//               assignedUserName: item.assignment.assignedUserName || "",
//               assignedById: item.assignment.assignedById || null,
//               assignedByName: item.assignment.assignedByName || "",
//               assignedAt: item.assignment.assignedAt || "",
//             }
//           : null,
//       };
//     });
//     return successResponse(
//       res,
//       "Bookings fetched successfully",
//       {
//         pageNumber: page,
//         count: limit,
//         totalCount,
//         totalPages: Math.ceil(totalCount / limit),
//         bookings: formattedBookings,
//         statusCounts,
//       },
//       200,
//     );
//   } catch (error) {
//     return errorResponse(
//       res,
//       "An unexpected error occurred: " + error.message,
//       null,
//       500,
//     );
//   }
// });
// ─── apartment GET BOOKINGS ──────────────────────────────────────────────────
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
    let filter = filterResult.filter;
    
    // =====================================================
    // ROLE BASED FILTER
    // Admin (userType = 1) -> Show All Bookings
    // Staff (userType = 2) -> Show:
    //   1. All bookings with orderStatus = 1 (Initial/Open)
    //   2. Bookings assigned to this specific staff member (regardless of status)
    // =====================================================
    
    if (req.user?.userType === 2) {
      // Staff member: Show orders with status 1 OR assigned to them
      filter = {
        $and: [
          filter, // Apply existing filters from buildBookingFilters
          {
            $or: [
              { orderStatus: 1 }, // All initial/open orders
              {
                "assignment.assignedUserId": new mongoose.Types.ObjectId(req.user.id),
                "assignment.assignedToType": 2 // Ensure it's assigned to staff
              }
            ]
          }
        ]
      };
    }
    // Admin (userType === 1) gets the original filter without restrictions
    
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

      // For staff members, only show assignment details if they are the assigned user
      let assignmentData = null;
      if (item.assignment) {
        if (req.user?.userType === 1) {
          // Admin sees full assignment details
          assignmentData = {
            assignedToType: item.assignment.assignedToType || null,
            assignedUserId: item.assignment.assignedUserId || null,
            assignedUserName: item.assignment.assignedUserName || "",
            assignedById: item.assignment.assignedById || null,
            assignedByName: item.assignment.assignedByName || "",
            assignedAt: item.assignment.assignedAt || "",
          };
        } else if (req.user?.userType === 2) {
          // Staff only sees assignment details if they are the assigned user
          const isAssignedToThisStaff = item.assignment.assignedUserId && 
            item.assignment.assignedUserId.toString() === req.user.id;
          
          if (isAssignedToThisStaff || item.orderStatus === 1) {
            // Show assignment details for their assigned orders or initial orders
            assignmentData = {
              assignedToType: item.assignment.assignedToType || null,
              assignedUserId: item.assignment.assignedUserId || null,
              assignedUserName: item.assignment.assignedUserName || "",
              assignedById: item.assignment.assignedById || null,
              assignedByName: item.assignment.assignedByName || "",
              assignedAt: item.assignment.assignedAt || "",
            };
          }
          // If orderStatus is 1 and not assigned to them, don't show assignment details
        }
      }

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
        assignment: assignmentData,
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
const apartmentEventGet = async (req, res) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return errorResponse(res, "apartmentId is required", null, 400);
    }

    const [apartment, events, items, gifts, existingBookings] =
      await Promise.all([
        Apartment.findById(apartmentId),
        EventBook.find({ status: 1 }).sort({ createdAt: -1 }),
        ItemMaster.find({}).populate("category_id").sort({ createdAt: -1 }),
        GiftMaster.find({}).sort({ createdAt: -1 }).lean(),
        // ── NEW: fetch all bookings for this apartment ──
        orderBooking
          .find(
            { apartmentId: new mongoose.Types.ObjectId(apartmentId) },
            { dateRanges: 1, orderId: 1, orderStatus: 1, _id: 1 }, // only needed fields
          )
          .lean(),
      ]);

    if (!apartment) {
      return errorResponse(res, "Apartment not found", null, 404);
    }

    // ─── BOOKED DATE RANGES ───────────────────────────────────────────────
    // Flatten all dateRanges from all bookings into one array
    const bookedDateRanges = existingBookings.flatMap((booking) =>
      (booking.dateRanges || []).map((range) => ({
        bookingId: booking._id,
        orderId: booking.orderId,
        orderStatus: booking.orderStatus,
        fromDate: range.fromDate,
        toDate: range.toDate,
        daysOfEvent: range.daysOfEvent,
      })),
    );
    // ─────────────────────────────────────────────────────────────────────

    // ================= SQ FEET CHARGES =================
    const sqFeetAmount = [
      { size: "10x10", charge: apartment.PerDayRent },
      { size: "10x20", charge: apartment.PerDayRent * 2 },
      { size: "10x30", charge: apartment.PerDayRent * 3 },
    ];

    // ================= GROUP ITEMS BY CATEGORY =================
    const groupedData = {};
    items.forEach((item) => {
      const categoryKey = item.category_id
        ? item.category_id._id.toString()
        : "NO_CATEGORY";

      if (!groupedData[categoryKey]) {
        groupedData[categoryKey] = {
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
      if (gift.giftType === 1) groupedGifts.normalGifts.push(gift);
      else if (gift.giftType === 2) groupedGifts.liveCounterGifts.push(gift);
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
        bookedDateRanges, // ── NEW
      },
      200,
    );
  } catch (error) {
    return errorResponse(res, "Internal server error", null, 400);
  }
};
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
      finalDiscoundAmount,
    } = req.body;

    // VALIDATIONS
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

    // HELPER: Normalize notes to objects (handles both string and object formats)
    const normalizeNote = (note) => {
      if (typeof note === "string") {
        return {
          text: note,
          uploadedBy: req.user?.name || "Admin",
          uploadedAt: new Date(),
        };
      }
      if (typeof note === "object" && note !== null) {
        return {
          text: note.text || null,
          uploadedBy: note.uploadedBy || req.user?.name || "Admin",
          uploadedAt: note.uploadedAt || new Date(),
        };
      }
      return null;
    };

    const normalizeNotesArray = (notes) => {
      if (!notes) return [];
      if (!Array.isArray(notes)) {
        notes = [notes];
      }
      return notes.map((note) => normalizeNote(note)).filter((n) => n !== null);
    };

    // NORMALIZE additionalNotes from request
    let normalizedNotes = normalizeNotesArray(additionalNotes);

    // HELPER: Parse field
    const parseField = (field) => {
      if (!field) return null;
      if (typeof field === "string") {
        try {
          return JSON.parse(field);
        } catch (e) {
          return null;
        }
      }
      if (typeof field === "object") return field;
      return null;
    };

    // HELPER: Process uploaded document
    const processUploadedDocument = (uploadedFile, documentData) => {
      if (uploadedFile) {
        const {
          getFileUrl,
        } = require("../../../middleware/orderNoteFileUpload");
        return {
          originalName: uploadedFile.originalname,
          fileName: uploadedFile.filename || uploadedFile.key?.split("/").pop(),
          filePath: getFileUrl(req, uploadedFile),
          mimeType: uploadedFile.mimetype,
          size: uploadedFile.size,
          fileType: getFileCategory(uploadedFile.mimetype),
          uploadedAt: new Date(),
          uploadedBy: req.user.name,
        };
      } else if (documentData) {
        return parseField(documentData);
      }
      return null;
    };

    // PROCESS STATUS DOCUMENT
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

    // PROCESS VOICE NOTE
    // let resolvedVoiceNote = null;
    // const uploadedVoiceFile = req.files?.voiceDocument?.[0];

    // try {
    //   if (uploadedVoiceFile || voiceDocument) {
    //     const processVoiceNote = (uploadedFile, voiceNoteData) => {
    //       if (uploadedFile) {
    //         const {
    //           getFileUrl,
    //         } = require("../../../middleware/orderNoteFileUpload");

    //         if (!uploadedFile.mimetype.startsWith("audio/")) {
    //           throw new Error("Uploaded file is not an audio file");
    //         }

    //         return {
    //           originalName: uploadedFile.originalname,
    //           fileName:
    //             uploadedFile.filename || uploadedFile.key?.split("/").pop(),
    //           filePath: getFileUrl(req, uploadedFile),
    //           mimeType: uploadedFile.mimetype,
    //           size: uploadedFile.size,
    //           fileType: "audio",
    //           duration: null,
    //           uploadedAt: new Date(),
    //           uploadedBy: req.user.name,
    //         };
    //       } else if (voiceNoteData) {
    //         const resolved = parseField(voiceNoteData);
    //         if (resolved && !resolved.mimeType?.startsWith("audio/")) {
    //           throw new Error("Voice note must be an audio file");
    //         }
    //         return resolved;
    //       }
    //       return null;
    //     };

    //     resolvedVoiceNote = processVoiceNote(uploadedVoiceFile, voiceDocument);

    //     if (resolvedVoiceNote) {
    //       if (
    //         !resolvedVoiceNote.originalName ||
    //         !resolvedVoiceNote.fileName ||
    //         !resolvedVoiceNote.filePath ||
    //         !resolvedVoiceNote.mimeType
    //       ) {
    //         return errorResponse(
    //           res,
    //           "voiceNote must contain originalName, fileName, filePath, and mimeType",
    //           null,
    //           400,
    //         );
    //       }
    //     }
    //   }
    // } catch (error) {
    //   return errorResponse(res, error.message, null, 400);
    // }

// Helper function to format duration - removes decimals
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return null;
  
  // Remove decimal part (floor)
  const totalSeconds = Math.floor(seconds);
  
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  
  if (minutes > 0) {
    if (secs === 0) {
      return `${minutes} min`;
    } else {
      return `${minutes} min ${secs} sec`;
    }
  } else {
    return `${secs} sec`;
  }
};

// PROCESS VOICE NOTE
let resolvedVoiceNote = null;
const uploadedVoiceFile = req.files?.voiceDocument?.[0];

try {
  if (uploadedVoiceFile || voiceDocument) {
    const processVoiceNote = async (uploadedFile, voiceNoteData) => {
      if (uploadedFile) {
        const {
          getFileUrl,
        } = require("../../../middleware/orderNoteFileUpload");

        if (!uploadedFile.mimetype.startsWith("audio/")) {
          throw new Error("Uploaded file is not an audio file");
        }

        // Get audio duration
        let durationInSeconds = null;
        let formattedDuration = null;
        
        if (uploadedFile.path) {
          try {
            const mm = require('music-metadata');
            const metadata = await mm.parseFile(uploadedFile.path);
            if (metadata.format.duration) {
              durationInSeconds = metadata.format.duration;
              formattedDuration = formatDuration(durationInSeconds);
            }
          } catch (err) {
            console.warn('Could not extract audio duration:', err.message);
          }
        }

        return {
          originalName: uploadedFile.originalname,
          fileName: uploadedFile.filename || uploadedFile.key?.split("/").pop(),
          filePath: getFileUrl(req, uploadedFile),
          mimeType: uploadedFile.mimetype,
          size: uploadedFile.size,
          fileType: "audio",
          duration: formattedDuration, 
          durationInSeconds: durationInSeconds, 
          uploadedAt: new Date(),
          uploadedBy: req.user.name,
        };
      } else if (voiceNoteData) {
        const resolved = parseField(voiceNoteData);
        if (resolved && !resolved.mimeType?.startsWith("audio/")) {
          throw new Error("Voice note must be an audio file");
        }
        return resolved;
      }
      return null;
    };

    resolvedVoiceNote = await processVoiceNote(uploadedVoiceFile, voiceDocument);

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
          400,
        );
      }
    }
  }
} catch (error) {
  return errorResponse(res, error.message, null, 400);
}



    let resolvedPoDocument = null;
    let previousTotalAmount = null;
    let finalDiscoundAmountValue = null;
    let discountApplied = false;

    if (newStatus === 5) {
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
          uploadedBy: req.user.name,
        };
      } else if (poDocument) {
        resolvedPoDocument = parseField(poDocument);
      }

      if (!resolvedPoDocument) {
        return errorResponse(
          res,
          "poDocument is mandatory when moving to Close Won",
          null,
          400,
        );
      }

      if (finalDiscoundAmount !== undefined && finalDiscoundAmount !== null) {
        const parsedAmount = Number(finalDiscoundAmount);
        if (!isNaN(parsedAmount) && parsedAmount > 0) {
          finalDiscoundAmountValue = parsedAmount;
          discountApplied = true;
          previousTotalAmount = order.totalAmount;
          order.finalDiscoundAmount = finalDiscoundAmountValue;
          order.totalAmount = order.totalAmount - finalDiscoundAmountValue;

          if (order.totalAmount < 0) {
            return errorResponse(
              res,
              "Final discount amount cannot exceed the total amount",
              null,
              400,
            );
          }
        }
      }

      if (!discountApplied) {
        previousTotalAmount = order.totalAmount;
      }
    }

    // ENSURE orderHistory EXISTS
    if (!order.orderHistory) order.orderHistory = [];

    const isSameStatus = currentStatus === newStatus;
    const existingEntryIndex = order.orderHistory.findIndex((h) =>
      isSameStatus
        ? h.toStatus === newStatus
        : h.fromStatus === currentStatus && h.toStatus === newStatus,
    );

    // Helper to safely add notes to history entry
    const addNotesToHistory = (historyEntry, notes) => {
      if (!historyEntry.additionalNotes) {
        historyEntry.additionalNotes = [];
      }
      if (!Array.isArray(historyEntry.additionalNotes)) {
        historyEntry.additionalNotes = [historyEntry.additionalNotes];
      }
      historyEntry.additionalNotes.push(...notes);
    };

    if (existingEntryIndex !== -1) {
      const existingEntry = order.orderHistory[existingEntryIndex];

      if (normalizedNotes.length > 0) {
        addNotesToHistory(existingEntry, normalizedNotes);
      }

      if (resolvedPoDocument) {
        if (!Array.isArray(existingEntry.poDocument)) {
          existingEntry.poDocument = existingEntry.poDocument
            ? [existingEntry.poDocument]
            : [];
        }
        existingEntry.poDocument.push(resolvedPoDocument);
      }

      if (resolvedStatusDocument) {
        if (!Array.isArray(existingEntry.statusDocument)) {
          existingEntry.statusDocument = existingEntry.statusDocument
            ? [existingEntry.statusDocument]
            : [];
        }
        existingEntry.statusDocument.push(resolvedStatusDocument);
      }

      if (resolvedVoiceNote) {
        if (!Array.isArray(existingEntry.voiceDocument)) {
          existingEntry.voiceDocument = existingEntry.voiceDocument
            ? [existingEntry.voiceDocument]
            : [];
        }
        existingEntry.voiceDocument.push(resolvedVoiceNote);
      }

      if (normalizedNotes.length > 0) {
        if (!order.additionalNotes) order.additionalNotes = [];
        if (!Array.isArray(order.additionalNotes)) {
          order.additionalNotes = [order.additionalNotes];
        }
        order.additionalNotes.push(...normalizedNotes);
      }

      if (newStatus === 5) {
        existingEntry.finalDiscoundAmount = order.finalDiscoundAmount;
        existingEntry.previousTotalAmount = previousTotalAmount;
        existingEntry.updatedTotalAmount = order.totalAmount;
        existingEntry.discountApplied = true;
        existingEntry.updatedBy = req.user?.name || "Admin";
        existingEntry.updatedAt = new Date();
      }

      order.updatedBy = req.user?.name || "Admin";
      order.updatedAt = new Date();
      order.markModified("orderHistory");
      await order.save();

      return successResponse(
        res,
        `Updated existing history entry`,
        {
          orderId: order._id,
          orderNo: order.orderId,
          previousStatus: getStatusText(currentStatus),
          currentStatus: getStatusText(newStatus),
          updatedBy: order.updatedBy,
          updatedAt: new Date(),
        },
        200,
      );
    }

    // NEW HISTORY ENTRY
    const historyEntry = {
      fromStatus: currentStatus,
      fromStatusText: getStatusText(currentStatus),
      toStatus: newStatus,
      toStatusText: getStatusText(newStatus),
      changedBy: req.user?.name || "Admin",
      changedAt: new Date(),
      additionalNotes: normalizedNotes,
      poDocument: resolvedPoDocument ? [resolvedPoDocument] : [],
      statusDocument: resolvedStatusDocument ? [resolvedStatusDocument] : [],
      voiceDocument: resolvedVoiceNote ? [resolvedVoiceNote] : [],
    };

    if (newStatus === 5) {
      Object.assign(historyEntry, {
        finalDiscoundAmount: order.finalDiscoundAmount,
        previousTotalAmount: previousTotalAmount,
        updatedTotalAmount: order.totalAmount,
        discountApplied: true,
        updatedBy: req.user?.name || "Admin",
        updatedAt: new Date(),
      });
    }

    if (newStatus === 6) {
      if (!closeLossReason || closeLossReason.trim() === "") {
        return errorResponse(res, "closeLossReason is required", null, 400);
      }
      historyEntry.closeLossReason = closeLossReason;
      order.closeLossReason = closeLossReason;
    }

    if (normalizedNotes.length > 0) {
      if (!order.additionalNotes) order.additionalNotes = [];
      if (!Array.isArray(order.additionalNotes)) {
        order.additionalNotes = [order.additionalNotes];
      }
      order.additionalNotes.push(...normalizedNotes);
    }

    order.orderStatus = newStatus;
    order.updatedBy = req.user?.name || "Admin";
    order.updatedAt = new Date();
    order.orderHistory.push(historyEntry);

    await order.save();

    return successResponse(
      res,
      "Order status updated successfully",
      {
        orderId: order._id,
        orderNo: order.orderId,
        previousStatus: getStatusText(currentStatus),
        currentStatus: getStatusText(newStatus),
        updatedBy: order.updatedBy,
        updatedAt: order.updatedAt,
      },
      200,
    );
  } catch (error) {
    console.error("Error:", error);
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
    (history) => history.toStatus === 5, // Close Won status
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
        additionalNotes:
          orderData?.customerDetails?.customerAdditionalNotes || "",
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

    // Check if user has permission to assign (Admin or Staff Admin)
    if (!req.user || ![1, 2].includes(Number(req.user.userType))) {
      return errorResponse(
        res,
        "Only Admin or Staff Admin can assign bookings",
        null,
        403,
      );
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

    const assignedToTypeNum = Number(assignedToType);
    if (![1, 2].includes(assignedToTypeNum)) {
      return errorResponse(
        res,
        "assignedToType must be 1 (Admin) or 2 (Staff Admin)",
        null,
        400,
      );
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return errorResponse(res, "Invalid orderId", null, 400);
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return errorResponse(res, "Invalid userId", null, 400);
    }

    // Find Booking
    const booking = await orderBooking.findById(orderId);
    if (!booking) {
      return errorResponse(res, "Booking not found", null, 404);
    }

    // Check if already assigned
    if (booking.assignment && booking.assignment.assignedUserId) {
      return errorResponse(
        res,
        `This booking is already assigned to ${booking.assignment.assignedUserName}`,
        null,
        400,
      );
    }

    // Find the user to assign
    let assignedUser = null;

    try {
      if (assignedToTypeNum === 1) {
        // Assign to Admin
        assignedUser = await Admin.findById(userId);
      } else if (assignedToTypeNum === 2) {
        // Assign to Staff Admin
        assignedUser = await StaffAdminUser.findById(userId);
      }
    } catch (err) {
      return errorResponse(res, "Error finding assigned user", null, 500);
    }

    if (!assignedUser) {
      return errorResponse(
        res,
        `User not found with ID: ${userId} and type: ${assignedToTypeNum === 1 ? "Admin" : "Staff Admin"}`,
        null,
        404,
      );
    }

    // Get user name (try different possible field names)
    const assignedUserName =
      assignedUser.userName ||
      assignedUser.name ||
      assignedUser.adminName ||
      assignedUser.fullName ||
      "Unknown User";

    const assignedByName =
      req.user?.userName || req.user?.name || req.user?.adminName || "Admin";

    // Create assignment object
    const assignmentData = {
      assignedToType: assignedToTypeNum,
      assignedUserId: assignedUser._id,
      assignedUserName: assignedUserName,
      assignedById: req.user?._id || req.user?.id,
      assignedByName: assignedByName,
      assignedByType: Number(req.user.userType),
      assignedAt: new Date(),
    };

    // Save assignment to booking
    booking.assignment = assignmentData;
    await booking.save();

    return successResponse(
      res,
      "Booking assigned successfully",
      {
        orderId: booking._id,
        orderNo: booking.orderId,
        assignment: booking.assignment,
      },
      200,
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Internal Server Error",
      null,
      500,
    );
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
