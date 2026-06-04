const mongoose = require("mongoose");
const orderBooking = require("../../../models/Admin/OrderSchema/eventOrderSchema");
const Apartment = require("../../../models/Admin/ApartmentSchema/apartment");
const EventBook = require("../../../models/Admin/EventHandling/eventRateSchema");
const StaffAdminUser = require("../../../models/Admin/StaffAdminManagement/staffAdminManagement");
const Admin = require("../../../models/Admin/adminUser");
require("dotenv").config();
// const asyncHandler = require("express-async-handler");
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
  const {
    id,
    apartmentId,
    eventId,
    fromDate,
    toDate,
    daysOfEvent,
    // daysOfApartment,
    promoterRequired,
    promoterCount,
    promoters,
    customerDetails,
    discountPercentage,
    discountType,
    orderNoteText,
    orderNoteFiles,
    sqfet,
    dailySchedule,
    items = [],
    gifts = [],
    order_notes,
  } = req.body;

  // ─────────────────────────────────────────────
  // FIND EXISTING BOOKING BY _id (if provided)
  // ─────────────────────────────────────────────

  let existingCustomerBooking = null;

  if (id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    existingCustomerBooking = await orderBooking.findById(id);

    if (!existingCustomerBooking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
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
    return res.status(400).json({
      success: false,
      message: "dailySchedule is required with at least one day schedule",
    });
  }

  // Validate each day's schedule
  for (const schedule of dailySchedule) {
    if (!schedule.days) {
      return res.status(400).json({
        success: false,
        message: "Each schedule must have a days",
      });
    }

    if (!schedule.fromTime) {
      return res.status(400).json({
        success: false,
        message: `fromTime is required for day ${schedule.days}`,
      });
    }

    if (!schedule.toTime) {
      return res.status(400).json({
        success: false,
        message: `toTime is required for day ${schedule.days}`,
      });
    }

    // Validate time format (HH:MM AM/PM)
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i;
    if (
      !timeRegex.test(schedule.fromTime) ||
      !timeRegex.test(schedule.toTime)
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid time format for day ${schedule.days}. Use format like "10:00 AM" or "2:00 PM"`,
      });
    }

    // Check that daysOfEvent matches the number of schedules
    if (daysOfEvent && schedule.days > daysOfEvent) {
      return res.status(400).json({
        success: false,
        message: `days ${schedule.days} exceeds daysOfEvent (${daysOfEvent})`,
      });
    }
  }

  // Check if the number of schedules matches daysOfEvent
  if (daysOfEvent && dailySchedule.length !== daysOfEvent) {
    return res.status(400).json({
      success: false,
      message: `Number of daily schedules (${dailySchedule.length}) must match daysOfEvent (${daysOfEvent})`,
    });
  }

  // Check for duplicate day numbers
  const dayNumbers = dailySchedule.map((s) => s.days);
  const hasDuplicates = new Set(dayNumbers).size !== dayNumbers.length;
  if (hasDuplicates) {
    return res.status(400).json({
      success: false,
      message: "Duplicate day numbers found in dailySchedule",
    });
  }

  // Check that day numbers are sequential starting from 1
  const sortedDays = [...dayNumbers].sort((a, b) => a - b);
  for (let i = 0; i < sortedDays.length; i++) {
    if (sortedDays[i] !== i + 1) {
      return res.status(400).json({
        success: false,
        message: `Day numbers must be sequential starting from 1. Missing day ${i + 1}`,
      });
    }
  }
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

  // Calculate total days
  const totalDays =
    Math.ceil((parsedToDate - parsedFromDate) / (1000 * 60 * 60 * 24)) + 1;

  // Validate daysOfEvent matches total days if not provided
  if (!daysOfEvent) {
    // If daysOfEvent not provided, use total days
    daysOfEvent = totalDays;
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

  // const existingCustomerBooking = await orderBooking.findOne({
  //   apartmentId,
  //   eventId,
  //   "customerDetails.contactPersonPhoneNumber": contactPersonPhoneNumber,
  // });

  // ─────────────────────────────────────────────
  // CHECK OVERLAPPING BOOKINGS
  // ─────────────────────────────────────────────

  const overlappingBooking = await orderBooking.findOne({
    _id: {
      $ne: existingCustomerBooking?._id,
    },
    apartmentId,
    // eventId,
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
    (apartment.perDayRent || 0) * (daysOfEvent || 0),
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
    // existingCustomerBooking.daysOfApartment = daysOfApartment;
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
    existingCustomerBooking.dailySchedule = dailySchedule;
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
    // daysOfApartment,
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
    dailySchedule,
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
    return res.status(200).json({
      success: true,
      message: "Bookings fetched successfully",
      data: {
        pageNumber: page,
        count: limit,
        totalCount: 0,
        totalPages: 0,
        bookings: [],
        statusCounts,
      },
    });
  }

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
    assignment: item.assignment
      ? {
          assignedUserId: item.assignment.assignedUserId || null,
          assignedUserName: item.assignment.assignedUserName || "",
          assignedById: item.assignment.assignedById || null,
          assignedByName: item.assignment.assignedByName || "",
          assignedAt: item.assignment.assignedAt || "",
        }
      : null,
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
      statusCounts,
    },
  });
});
// ─── apartment GET BOOKINGS ──────────────────────────────────────────────────
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
// ─── Status Update ──────────────────────────────────────────────────
const updateOrderStatusOnly = asyncHandler(async (req, res) => {
  const { orderId } = req.query;
  const {
    status,
    additionalNotes,
    // negotiationAmount,
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
  // const newStatus = Number(status);

  // CHECK IF STATUS IS ALREADY SAME
  // if (currentStatus === newStatus) {
  //   return res.status(400).json({
  //     success: false,
  //     message: `Order is already in ${getStatusText(currentStatus)} status`,
  //   });
  // }

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

  // if (!validTransitions[currentStatus]?.includes(newStatus)) {
  //   return res.status(400).json({
  //     success: false,
  //     message: `Invalid status transition from ${getStatusText(currentStatus)} to ${getStatusText(newStatus)}.`,
  //   });
  // }

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
      } = require("../../../../middleware/orderNoteFileUpload");

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
    resolvedStatusDocument = processUploadedDocument(
      uploadedStatusFile,
      statusDocument,
    );

    // Validate document structure if provided
    if (resolvedStatusDocument) {
      if (
        !resolvedStatusDocument.originalName ||
        !resolvedStatusDocument.fileName ||
        !resolvedStatusDocument.filePath
      ) {
        return res.status(400).json({
          success: false,
          message:
            "statusDocument must contain originalName, fileName, and filePath",
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
      } = require("../../../../middleware/orderNoteFileUpload");

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
  // PROCESS VOICE NOTE (Optional - for any status change)
  // ─────────────────────────────────────────────
  let resolvedVoiceNote = null;
  const uploadedVoiceFile = req.files?.voiceDocument?.[0];

  try {
    if (uploadedVoiceFile || voiceDocument) {
      resolvedVoiceNote = processVoiceNote(uploadedVoiceFile, voiceDocument);

      // Validate voice note structure if provided
      if (resolvedVoiceNote) {
        if (
          !resolvedVoiceNote.originalName ||
          !resolvedVoiceNote.fileName ||
          !resolvedVoiceNote.filePath ||
          !resolvedVoiceNote.mimeType
        ) {
          return res.status(400).json({
            success: false,
            message:
              "voiceNote must contain originalName, fileName, filePath, and mimeType",
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
    fromStatusText: getStatusText(currentStatus), // Add this line
    toStatus: newStatus,
    toStatusText: getStatusText(newStatus),
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
      } = require("../../../../middleware/orderNoteFileUpload");

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

    // Validate PO Document (mandatory for Close Won)
    if (!resolvedPoDocument) {
      return res.status(400).json({
        success: false,
        message: "poDocument is mandatory when moving to Close Won",
      });
    }

    if (
      !resolvedPoDocument.originalName ||
      !resolvedPoDocument.fileName ||
      !resolvedPoDocument.filePath
    ) {
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
  // else if (newStatus === 4) {
  //   // Handle negotiation amount if provided
  //   if (negotiationAmount !== undefined && negotiationAmount !== null) {
  //     const totalAmount = Number(order.totalAmount || 0);
  //     const negotiationAmt = Number(negotiationAmount);
  //     const finalAmount = totalAmount - negotiationAmt;

  //     if (finalAmount < 0) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Negotiation amount cannot be greater than total amount",
  //       });
  //     }

  //     historyEntry.negotiationAmount = negotiationAmt;
  //     historyEntry.finalAmount = finalAmount;

  //     order.negotiationAmount = negotiationAmt;
  //     order.finalAmount = finalAmount;
  //   }
  // }

  // ─────────────────────────────────────────────
  // HANDLE REOPENING LOGIC (Moving from terminal to active)
  // ─────────────────────────────────────────────

  // If moving from Closed Won (5) or Closed Loss (6) to any other status
  if (
    (currentStatus === 5 || currentStatus === 6) &&
    newStatus !== currentStatus
  ) {
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
      notes: additionalNotes || "",
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

// ─────────────────────────────────────────────
// SEND ORDER MAIL USING EXISTING ORDER DATA
// ─────────────────────────────────────────────
const sendOrderMail = asyncHandler(async (req, res) => {
  try {
    const { orderId } = req.query;

    // ─────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required",
      });
    }

    // ─────────────────────────────────────────────
    // GET ORDER DATA
    // ─────────────────────────────────────────────

    const orderData = await orderBooking.findOne({
      _id: orderId,
    });

    if (!orderData) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
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
        additionalNotes: orderData?.customerDetails?.additionalNotes || "",
        gstNumber: orderData?.customerDetails?.gstNumber || "",
        designation: orderData?.customerDetails?.designation || "",
      },

      // Order Details
      orderId: orderData?.orderId,
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
        apartmentName: orderData?.apartmentDetails?.apartmentName || "",
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
      promoters: orderData?.promoters || [], // This will include promoterGender, promoterPerDayCharge, promoterLanguage, promoterLookAndAppearance

      // Amount Summary (flattened)
      apartmentAmount: orderData?.apartmentAmount || 0,
      sqfetAmount: orderData?.sqfetAmount || 0,
      eventAmount: orderData?.eventAmount || 0,
      promoterTotal: orderData?.promoterTotal || 0,
      subTotal: orderData?.subTotal || 0,
      discountAmount: orderData?.discountAmount || 0,
      taxableAmount: orderData?.taxableAmount || 0,
      gstAmount: orderData?.gstAmount || 0,
      totalAmount: orderData?.totalAmount || 0,

      // PO Document
      poDocument: orderData?.poDocument || null,
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

// const assignBookingUser = async (req, res) => {
//   try {
//     const { orderId, userId, assignedToType } = req.body;

//     // Only Admin can assign
//     if (req.user.userType !== 1) {
//       return res.status(403).json({
//         success: false,
//         message: "Only Admin can assign bookings",
//       });
//     }

//     if (!orderId) {
//       return res.status(400).json({
//         success: false,
//         message: "orderId is required",
//       });
//     }

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: "userId is required",
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(orderId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid orderId",
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid userId",
//       });
//     }

//     const booking = await orderBooking.findById(orderId);

//     if (!booking) {
//       return res.status(404).json({
//         success: false,
//         message: "Booking not found",
//       });
//     }
//     // Check Already Assigned
//     if (booking.assignment?.assignedUserId) {
//       return res.status(400).json({
//         success: false,
//         message: `This booking is already assigned to ${booking.assignment.assignedUserName}`,
//       });
//     }
//     let assignedUser = null;
//     if (assignedToType === 1) {
//       assignedUser = await Admin.findById(userId);
//       console.log("Staff User for Assignment1:", staffUser);
//     } else if (assignedToType === 2) {
//       assignedUser = await StaffAdminUser.findById(userId);
//       console.log("Staff User for Assignment2:", staffUser);
//     }
//     console.log("Staff User for Assignment3:", assignedUser);

//     if (!assignedUser) {
//       return res.status(404).json({
//         success: false,
//         message: "Staff user not found",
//       });
//     }
//     const now = new Date();

//     const assignedAt = `${String(now.getDate()).padStart(2, "0")}-${String(
//       now.getMonth() + 1,
//     ).padStart(2, "0")}-${now.getFullYear()} ${String(now.getHours()).padStart(
//       2,
//       "0",
//     )}:${String(now.getMinutes()).padStart(
//       2,
//       "0",
//     )}:${String(now.getSeconds()).padStart(2, "0")}`;

//     booking.assignment = {
//       assignedToType: Number(assignedToType),
//       assignedUserId: assignedUser._id,
//       assignedUserName:
//         assignedUser.userName ||
//         assignedUser.name ||
//         assignedUser.adminName ||
//         "",
//       assignedById: req.user?.id,
//       assignedByName:
//         req.user?.userName || req.user?.name || req.user?.adminName || "",
//       assignedAt,
//     };

//     await booking.save();

//     return res.status(200).json({
//       success: true,
//       message: "Booking assigned successfully",
//       data: booking,
//     });
//   } catch (error) {
//     console.error("Assign Booking Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
const assignBookingUser = async (req, res) => {
  try {
    const { orderId, userId, assignedToType } = req.body;

    // Only Admin can assign
    if (req.user.userType !== 1) {
      return res.status(403).json({
        success: false,
        message: "Only Admin can assign bookings",
      });
    }

    // Validation
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    if (!assignedToType) {
      return res.status(400).json({
        success: false,
        message: "assignedToType is required",
      });
    }

    if (![1, 2].includes(Number(assignedToType))) {
      return res.status(400).json({
        success: false,
        message: "assignedToType must be 1 (Admin) or 2 (Staff Admin)",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid orderId",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    // Find Booking
    const booking = await orderBooking.findById(orderId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Prevent Reassignment
    if (booking.assignment?.assignedUserId) {
      return res.status(400).json({
        success: false,
        message: `This booking is already assigned to ${booking.assignment.assignedUserName}`,
      });
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
      return res.status(404).json({
        success: false,
        message: "Assigned user not found",
      });
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

    return res.status(200).json({
      success: true,
      message: "Booking assigned successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Assign Booking Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
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
