const Quotation = require("../../../models/Admin/EventHandling/eventElementsQuotation");
const mongoose = require("mongoose");
const { successResponse, errorResponse } = require("../../../utils/response");
const createQuotation = async (req, res) => {
  try {
    const { quotationId, stateCode, item } = req.body;

    // VALIDATION
    if (!stateCode) {
      return errorResponse(res, "State code is required", 400);
    }

    if (!item) {
      return errorResponse(res, "Item data is required", 400);
    }

    // ─────────────────────────────────────
    // UPDATE PARTICULAR ITEM
    // ─────────────────────────────────────

    if (quotationId) {
      // VALID OBJECT ID
      if (!mongoose.Types.ObjectId.isValid(quotationId)) {
        return errorResponse(res, "Invalid quotationId", 400);
      }

      // FIND QUOTATION
      const quotation = await Quotation.findById(quotationId);

      if (!quotation) {
        return errorResponse(res, "Quotation not found", 404);
      }

      // CHECK ITEM EXIST
      const itemIndex = quotation.items.findIndex(
        (val) => val.elementId === item.elementId,
      );

      // UPDATE EXISTING ITEM
      if (itemIndex !== -1) {
        quotation.items[itemIndex] = {
          ...quotation.items[itemIndex]._doc,
          ...item,
        };
      } else {
        // CREATE NEW ITEM

        const now = new Date();

        const day = String(now.getDate()).padStart(2, "0");

        const month = String(now.getMonth() + 1).padStart(2, "0");

        const year = now.getFullYear();

        const newItem = {
          ...item,

          elementId: `${stateCode}-ITEM-${day}${month}${year}-${quotation.items.length + 1}`,
        };

        quotation.items.push(newItem);
      }

      // UPDATE STATE CODE
      quotation.stateCode = stateCode;

      // SAVE
      await quotation.save();

      return successResponse(res, "Quotation Updated Successfully");
    }

    // ─────────────────────────────────────
    // CREATE NEW QUOTATION
    // ─────────────────────────────────────

    const now = new Date();

    const day = String(now.getDate()).padStart(2, "0");

    const month = String(now.getMonth() + 1).padStart(2, "0");

    const year = now.getFullYear();

    const newItem = {
      ...item,

      elementId: `${stateCode}-ITEM-${day}${month}${year}-1`,
    };

    const quotation = await Quotation.create({
      stateCode,
      items: [newItem],
    });

    return successResponse(res, "Quotation Created Successfully", 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const listQuotation = async (req, res) => {
  try {
    const quotations = await Quotation.find().sort({ createdAt: -1 });

    return successResponse(res, "Quotations fetched successfully", {
      count: quotations.length,
      quotations,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
module.exports = {
  createQuotation,
  listQuotation,
};
