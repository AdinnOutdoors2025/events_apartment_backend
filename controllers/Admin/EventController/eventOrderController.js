
const orderBooking = require("../../../models/Admin/EventHandling/eventOrderSchema");
const Apartment = require("../../../models/Admin/apartment")
const EventBook = require("../../../models/Admin/EventHandling/eventRateSchema")
// ─── Helper ──────────────────────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ─── CREATE Booking ──────────────────────────────────────────────────────────
/**
 * POST /api/promoter-bookings
 *
 * Validates that promoters.length === promoterCount before saving.
 */
const createBooking =
  asyncHandler(
    async (req, res) => {

      const {
        apartmentId,
        eventId,
        fromDate,
        toDate,
        daysOfEvent,
        promoterRequired,
        promoterCount,
        promoters,
        customerDetails,
        discountPercentage,
      } = req.body;

      // FIND EXISTING BOOKING
      let booking =
        await orderBooking.findOne({
          apartmentId,
          eventId,
        });

      // ======================
      // UPDATE EXISTING
      // ======================

      if (booking) {

        booking.fromDate =
          fromDate ||
          booking.fromDate;

        booking.toDate =
          toDate ||
          booking.toDate;

        booking.daysOfEvent =
          daysOfEvent ||
          booking.daysOfEvent;

        booking.promoterRequired =
          promoterRequired ??
          booking.promoterRequired;

        booking.promoterCount =
          promoterCount ||
          booking.promoterCount;

        booking.promoters =
          promoters ||
          booking.promoters;

        booking.customerDetails =
          customerDetails ||
          booking.customerDetails;

        booking.discountPercentage =
          discountPercentage ??
          booking.discountPercentage;
        updatedBy: req.user.name,
          await booking.save();

        return res.status(200).json({
          success: true,
          message:
            "Booking updated successfully",

          data: booking,
          updatedBy: req.user.name,
        });
      }

      // ======================
      // CREATE NEW
      // ======================

      booking =
        new orderBooking({
          apartmentId,
          eventId,
          fromDate,
          toDate,
          daysOfEvent,
          promoterRequired,
          promoterCount,
          promoters,
          customerDetails,
          updatedBy: req.user.name,
          discountPercentage:
            discountPercentage ??
            0,
        });

      await booking.save();

      return res.status(201).json({
        success: true,
        message:
          "Booking created successfully",

        data: booking,
      });
    }
  );

// list Api
const getAllBookings =
  asyncHandler(
    async (req, res) => {

      const {
        apartmentId,
        status,
        fromDate,
        toDate,
      } = req.body || {};

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

      if (fromDate) {
        filter.fromDate = {
          $gte: new Date(
            fromDate
          ),
        };
      }

      if (toDate) {
        filter.toDate = {
          $lte: new Date(
            toDate
          ),
        };
      }

      // GET BOOKINGS
      const bookings =
        await orderBooking
          .find(filter)
          .sort({
            createdAt: -1,
          });

      return res.status(200).json({
        success: true,
        message:
          "Bookings fetched successfully",

        count:
          bookings.length,

        data: bookings,
      });
    }
  );

const getApartmentOrder = async (req, res) => {
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
  createBooking, getAllBookings, getApartmentOrder
};