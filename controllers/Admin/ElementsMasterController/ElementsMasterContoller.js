const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const ElementsMaster = require('../../../models/Admin/ElementsMasterSchema/elementsMasterSchema')
const ItemMaster = require('../../../models/Admin/ElementsMasterSchema/itemsMasterSchema')
const GiftMaster = require('../../../models/Admin/ElementsMasterSchema/elementsGiftSchema')
const { successResponse, errorResponse } = require("../../../utils/response");

const createCategoryElement = async (req, res) => {
  try {
    const {  id,category_name, description, status } = req.body;

    if (!category_name) {
        return errorResponse(res,"Category name is required")
      
    }
 // ================= UPDATE =================
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, "Invalid element id");
      }

      const element = await ElementsMaster.findById(id);

      if (!element) {
        return errorResponse(res, "Element not found");
      }

      const existingCategory = await ElementsMaster.findOne({
        _id: { $ne: id },
        category_name: {
          $regex: new RegExp(`^${category_name.trim()}$`, "i"),
        },
      });

      if (existingCategory) {
        return errorResponse(
          res,
          "Category name already exists"
        );
      }

      element.category_name = category_name.trim();
      element.description = description || "";
      element.status = status ?? element.status;

      await element.save();

      return successResponse(
        res,
        "Element updated successfully",
        element
      );
    }
     // ================= CREATE =================
    const existingCategory = await ElementsMaster.findOne({
      category_name: {
        $regex: new RegExp(`^${category_name.trim()}$`, "i"),
      },
    });

    if (existingCategory) {

        return errorResponse(res,"Category name already exists")
      
    }

    const element = new ElementsMaster({
      category_name: category_name.trim(),
      description,
      status: status ?? 1,
    });

    await element.save();

    return successResponse(res, "Element created successfully",element)


  } catch (error) {
    return errorResponse(res,"error",error.message)
  }
};
const listCategoryElements = async (req, res) => {
  try {
    const elements = await ElementsMaster.find({})
      .sort({ createdAt: -1 });

    return successResponse(
      res,
      "Elements fetched successfully",
      elements
    );
  } catch (error) {
    return errorResponse(res, "Error", error.message);
  }
};
const elementsCreateItem = async (req, res) => {
  try {
    const {
      id,
      item_name,
      item_type,
      category_id,
      amount,
      amount_unit,
      item_status,
      item_notes,
    } = req.body;

    if (!item_name) {
      return errorResponse(res, "Item name is required");
    }

    if (![1, 2].includes(Number(item_type))) {
      return errorResponse(res, "Invalid item type");
    }

    if (![1, 2].includes(Number(amount_unit))) {
      return errorResponse(res, "Invalid amount unit");
    }

    
    if (
      category_id &&
      !mongoose.Types.ObjectId.isValid(category_id)
    ) {
      return errorResponse(res, "Invalid category id");
    }

    
    if (category_id) {
      const categoryExists = await ElementsMaster.findById(category_id);

      if (!categoryExists) {
        return errorResponse(
          res,
          "Selected category does not exist"
        );
      }
    }
// ================= UPDATE =================
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(res, "Invalid item id");
      }

      const item = await ItemMaster.findById(id);

      if (!item) {
        return errorResponse(res, "Item not found");
      }

      const existingItem = await ItemMaster.findOne({
        _id: { $ne: id },
        item_name: {
          $regex: new RegExp(`^${item_name.trim()}$`, "i"),
        },
      });

      if (existingItem) {
        return errorResponse(
          res,
          "Item name already exists"
        );
      }

      item.item_name = item_name.trim();
      item.item_type = item_type;
      item.category_id = category_id || null;
      item.amount = amount;
      item.amount_unit = amount_unit;
      item.item_status = item_status ?? item.item_status;
      item.item_notes = item_notes || "";

      await item.save();

      return successResponse(
        res,
        "Item updated successfully",
        item
      );
    }
    // ================= CREATE =================
    const existingItem = await ItemMaster.findOne({
      item_name: {
        $regex: new RegExp(`^${item_name.trim()}$`, "i"),
      },
    });

    if (existingItem) {
      return errorResponse(
        res,
        "Item name already exists"
      );
    }

    const item = new ItemMaster({
      item_name: item_name.trim(),
      item_type,
      category_id: category_id || null,
      amount,
      amount_unit,
      item_status: item_status ?? 1,
      item_notes,
    });

    await item.save();

    return successResponse(
      res,
      "Item created successfully",
      item
    );

  } catch (error) {
    console.error(error);
    return errorResponse(
      res,
      "Error while creating item",
      error.message
    );
  }
};
const elementsListItems = async (req, res) => {
  try {
    const items = await ItemMaster.find({})
      .populate("category_id")
      .sort({ createdAt: -1 });

    return successResponse(
      res,
      "Items fetched successfully",
      items
    );
  } catch (error) {
    return errorResponse(res, "Error", error.message);
  }
};
const saveGift = async (req, res) => {
  try {
    const {
      id,
      giftType,
      giftName,
      priceType,
      price,
      unit,
      notes,
      status,
    } = req.body;

    // Gift Type Validation
    if (![1, 2].includes(Number(giftType))) {
      return res.status(400).json({
        success: false,
        message: "giftType must be 1 or 2",
      });
    }

    // Price Type Validation
    if (
      Number(giftType) === 1 &&
      ![1, 2].includes(Number(priceType))
    ) {
      return res.status(400).json({
        success: false,
        message:
          "For giftType 1, priceType must be 1 or 2",
      });
    }

    if (
      Number(giftType) === 2 &&
      ![3, 4, 5].includes(Number(priceType))
    ) {
      return res.status(400).json({
        success: false,
        message:
          "For giftType 2, priceType must be 3, 4 or 5",
      });
    }

    // Common Validation
    if (!giftName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "giftName is required",
      });
    }

    if (!price || Number(price) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required",
      });
    }

    // priceType = 2 Validation
    if (Number(priceType) === 2) {
      if (!unit || Number(unit) <= 0) {
        return res.status(400).json({
          success: false,
          message: "unit is required",
        });
      }

      
    }

    const payload = {
      giftType,
      giftName,
      priceType,
      price,
      unit: Number(priceType) === 2 ? unit : null,
      notes,
      status,
    };

    // UPDATE
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid id",
        });
      }

      const gift = await GiftMaster.findByIdAndUpdate(
        id,
        payload,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!gift) {
        return res.status(404).json({
          success: false,
          message: "Gift not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Gift updated successfully",
        data: gift,
      });
    }

    // CREATE
    const gift = await GiftMaster.create(payload);

    return res.status(201).json({
      success: true,
      message: "Gift created successfully",
      data: gift,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const listGifts = async (req, res) => {
  try {
    const gifts = await GiftMaster.find({})
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: gifts.length,
      data: gifts,
    });
  } catch (error) {
    console.error("List Gifts Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
module.exports = {
    createCategoryElement,
    listCategoryElements,
    elementsCreateItem,
    elementsListItems,
    saveGift,
    listGifts
}