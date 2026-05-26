const Quotation = require("../../../models/Admin/EventHandling/eventElementsQuotation");
const mongoose = require("mongoose");
const createQuotation = async (req, res) => {
  try {
    const {
      quotationId,
      stateCode,
      item,
    } = req.body;

    // VALIDATION
    if (!stateCode) {
      return res.status(400).json({
        success: false,
        message: "State code is required",
      });
    }

    if (!item) {
      return res.status(400).json({
        success: false,
        message: "Item data is required",
      });
    }

    // ─────────────────────────────────────
    // UPDATE PARTICULAR ITEM
    // ─────────────────────────────────────

    if (quotationId) {
      // VALID OBJECT ID
      if (
        !mongoose.Types.ObjectId.isValid(
          quotationId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid quotationId",
        });
      }

      // FIND QUOTATION
      const quotation =
        await Quotation.findById(
          quotationId
        );

      if (!quotation) {
        return res.status(404).json({
          success: false,
          message: "Quotation not found",
        });
      }

      // CHECK ITEM EXIST
      const itemIndex =
        quotation.items.findIndex(
          (val) =>
            val.elementId ===
            item.elementId
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

        const day = String(
          now.getDate()
        ).padStart(2, "0");

        const month = String(
          now.getMonth() + 1
        ).padStart(2, "0");

        const year =
          now.getFullYear();

        const newItem = {
          ...item,

          elementId:
            `${stateCode}-ITEM-${day}${month}${year}-${quotation.items.length + 1}`,
        };

        quotation.items.push(newItem);
      }

      // UPDATE STATE CODE
      quotation.stateCode =
        stateCode;

      // SAVE
      await quotation.save();

      return res.status(200).json({
        success: true,
        message:
          "Quotation Updated Successfully",
      });
    }

    // ─────────────────────────────────────
    // CREATE NEW QUOTATION
    // ─────────────────────────────────────

    const now = new Date();

    const day = String(
      now.getDate()
    ).padStart(2, "0");

    const month = String(
      now.getMonth() + 1
    ).padStart(2, "0");

    const year = now.getFullYear();

    const newItem = {
      ...item,

      elementId:
        `${stateCode}-ITEM-${day}${month}${year}-1`,
    };

    const quotation =
      await Quotation.create({
        stateCode,
        items: [newItem],
      });

    return res.status(201).json({
      success: true,
      message:
        "Quotation Created Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const listQuotation = async (req, res) => {
  try {
    const quotations = await Quotation.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: quotations.length,
      data: quotations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  createQuotation,
  listQuotation,
};
