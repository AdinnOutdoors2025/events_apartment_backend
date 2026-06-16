const EventRate = require("../../../models/Admin/EventHandling/eventRateSchema");
const { successResponse, errorResponse } = require("../../../utils/response");
exports.saveEventRate = async (req, res) => {
  try {
    const { id, eventName, amount } = req.body;

    if (!eventName) {
      return errorResponse(res, "eventName is required",null, 400);
    }

    if (amount === undefined || amount === null) {
      return errorResponse(res, "amount is required",null, 400);
    }

    let saveData;

    // ─────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────
    if (id) {
      saveData = await EventRate.findByIdAndUpdate(
        id,
        {
          eventName: eventName.trim(),
          amount,
        },
        {
          new: true,
        },
      );

      if (!saveData) {
        return errorResponse(res, "Event Rate not found",null, 404);
      }

      return successResponse(res, "Event Rate updated successfully", saveData);
    }

    // ─────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────
    saveData = await EventRate.create({
      eventName: eventName.trim(),
      amount,
    });

    return successResponse(res, "Event Rate saved successfully", {
      saveData,
      updatedBy: req.user?.name || "Admin",
    });
  } catch (error) {
    return errorResponse(res, "Internal Server Error", 500);
  }
};

// ====================== LIST EVENT RATE ======================

exports.listEventRate = async (req, res) => {
  try {
    // GET ONLY STATUS 1 EVENTS
    const eventList = await EventRate.find({
      status: 1,
    }).sort({
      createdAt: -1,
    });

    return successResponse(res, "Event Rate list fetched successfully", {
      totalCount: eventList.length,
      eventList,
    });
  } catch (error) {
    console.log(error);
    return errorResponse(res, "Internal Server Error", 500);
  }
};
