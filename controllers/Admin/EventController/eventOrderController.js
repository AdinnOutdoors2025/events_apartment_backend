const orderBooking = require("../../../models/Admin/EventHandling/eventOrderSchema");
const Apartment = require("../../../models/Admin/apartment")
const EventBook = require("../../../models/Admin/EventHandling/eventRateSchema")
// ─── Helper ──────────────────────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

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
  } = req.body;

  // ─── 1. Fetch Apartment & Event docs ────────────────────────────────────────
  const [apartment, event] = await Promise.all([
    Apartment.findById(apartmentId),
    EventBook.findById(eventId),
  ]);

  if (!apartment) {
    return res.status(404).json({ success: false, message: "Apartment not found" });
  }
  if (!event) {
    return res.status(404).json({ success: false, message: "Event not found" });
  }

  // ─── 2. Apartment cost ───────────────────────────────────────────────────────
  // apartment.perDayRent × daysOfApartment
  const perDayRent = apartment.perDayRent ?? 0;
  const aptDays = daysOfApartment ?? 0;
  const apartmentAmount = perDayRent * aptDays;

  // ─── 3. Event cost ───────────────────────────────────────────────────────────
  // event.amount × daysOfEvent
  const eventRate = event.amount ?? 0;
  const evtDays = daysOfEvent ?? 0;
  const eventAmount = eventRate * evtDays;

  // ─── 4. Promoter cost ────────────────────────────────────────────────────────
  // Sum of (promoterPerDayCharge × daysOfEvent) for every promoter in the array
  // Result stored per-promoter as promoterAmount, and total as promoterTotal
  let promoterTotal = 0;
  const promotersWithAmount = (promoters ?? []).map((p) => {
    const charge = p.promoterPerDayCharge ?? 0;
    const promoterAmount = charge * evtDays;      // charged for event days
    promoterTotal += promoterAmount;
    return { ...p, promoterAmount };              // attach new key
  });

  // ─── 5. Subtotal ─────────────────────────────────────────────────────────────
  const subTotal = apartmentAmount + eventAmount + promoterTotal;

  // ─── 6. Discount ─────────────────────────────────────────────────────────────
  // discountType 1 → percentage   discountType 2 → flat amount
  const discountValue = discountPercentage ?? 0;
  let discountAmount = 0;

  if (discountType === 1) {
    // e.g. 10% of 8000 = 800
    discountAmount = (subTotal * discountValue) / 100;
  } else if (discountType === 2) {
    // flat rupee amount
    discountAmount = discountValue;
  }

  // ─── 7. Taxable amount (after discount) ─────────────────────────────────────
  const taxableAmount = subTotal - discountAmount;  // e.g. 8000 - 800 = 7200

  // ─── 8. GST @ 18 % ───────────────────────────────────────────────────────────
  const GST_RATE = 18;
  const gstAmount = (taxableAmount * GST_RATE) / 100;   // e.g. 7200 × 0.18 = 1296

  // ─── 9. Grand total ──────────────────────────────────────────────────────────
  const totalAmount = taxableAmount + gstAmount;          // e.g. 7200 + 1296 = 8496

  // ─── Calculated payload (stored in DB, NOT sent in response) ─────────────────
  const calculatedFields = {
    apartmentAmount,
    eventAmount,
    promoterTotal,
    subTotal,
    discountAmount,
    taxableAmount,
    gstAmount,
    totalAmount,
  };

  // ─── 10. Find existing booking ───────────────────────────────────────────────
  let booking = await orderBooking.findOne({ apartmentId, eventId });

  // ══════════════════════════════════════════════════════
  // UPDATE existing booking
  // ══════════════════════════════════════════════════════
  if (booking) {
    booking.updatedBy = req.user.name;
    booking.fromDate = fromDate ?? booking.fromDate;
    booking.toDate = toDate ?? booking.toDate;
    booking.daysOfEvent = daysOfEvent ?? booking.daysOfEvent;
    booking.daysOfApartment = daysOfApartment ?? booking.daysOfApartment;
    booking.promoterRequired = promoterRequired ?? booking.promoterRequired;
    booking.promoterCount = promoterCount ?? booking.promoterCount;
    booking.promoters = promotersWithAmount.length
      ? promotersWithAmount
      : booking.promoters;
    booking.customerDetails = customerDetails ?? booking.customerDetails;
    booking.discountPercentage = discountValue;
    booking.discountType = discountType ?? booking.discountType;

    // calculated
    Object.assign(booking, calculatedFields);

    await booking.save();

    // ── Response: success flag only, no data ────────────────────────────────
    return res.status(200).json({
      success: true,
      message: "Booking updated successfully",
    });
  }

  // ══════════════════════════════════════════════════════
  // CREATE new booking
  // ══════════════════════════════════════════════════════
  booking = new orderBooking({
    apartmentId,
    eventId,
    fromDate,
    toDate,
    daysOfEvent,
    daysOfApartment,
    promoterRequired,
    promoterCount,
    promoters: promotersWithAmount,
    customerDetails,
    updatedBy: req.user.name,
    discountPercentage: discountValue,
    discountType: discountType ?? 1,

    // calculated
    ...calculatedFields,
  });

  await booking.save();

  return res.status(201).json({
    success: true,
    message: "Booking created successfully",
  });
});
// list Api
const getAllBookings = asyncHandler(async (req, res) => {

  const {
    apartmentId,
    status,
    fromDate,
    toDate,
    pageNumber,
    count,
  } = req.body || {};

  // VALIDATION
  if (!pageNumber || !count) {
    return res.status(400).json({
      success: false,
      message:
        "pageNumber and count are required",
    });
  }

  // PAGINATION
  const page =
    parseInt(pageNumber);

  const limit =
    parseInt(count);

  const skip =
    (page - 1) * limit;

  const filter = {};

  // FILTERS
  if (apartmentId) {
    filter.apartmentId =
      apartmentId;
  }

  // HANDLE 0 AND 1
  if (
    status !== undefined &&
    status !== null
  ) {
    filter.status =
      status;
  }

  // DATE FILTER
  if (fromDate) {
    filter.fromDate = {
      $gte: new Date(fromDate),
    };
  }

  if (toDate) {
    filter.toDate = {
      $lte: new Date(toDate),
    };
  }

  // TOTAL COUNT
  const totalCount =
    await orderBooking.countDocuments(
      filter
    );

  // GET BOOKINGS
  const bookings =
    await orderBooking
      .find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit);

  return res.status(200).json({
    success: true,
    message:
      "Bookings fetched successfully",

    data: {
      pageNumber: page,
      count: limit,
      totalCount,
      totalPages: Math.ceil(
        totalCount / limit
      ),
      bookings,
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
  createBooking, getAllBookings, apartmentEventGet
};