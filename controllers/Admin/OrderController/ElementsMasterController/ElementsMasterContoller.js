const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const ElementsMaster = require("../../../../models/Admin/OrderSchema/ElementsMasterSchema/elementsMasterSchema");
const ItemMaster = require("../../../../models/Admin/OrderSchema/ElementsMasterSchema/itemsMasterSchema");
const GiftMaster = require("../../../../models/Admin/OrderSchema/ElementsMasterSchema/elementsGiftSchema");
const OrderElements = require("../../../../models/Admin/OrderSchema/ElementsOverAllSchema/elementsOverAllSchema");
const {
  successResponse,
  errorResponse,
} = require("../../../../utils/response");

const createCategoryElement = async (req, res) => {
  try {
    const { id, state, category_name, description, status } = req.body;

    if (!state) {
      return errorResponse(res, "state is required");
    }
    if (!category_name) {
      return errorResponse(res, "Category name is required");
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
        return errorResponse(res, "Category name already exists");
      }
      element.status = status ?? element.status;
      element.category_name = category_name.trim();
      element.description = description || "";
      element.state = state || "";

      await element.save();

      return successResponse(res, "Element updated successfully", element);
    }
    // ================= CREATE =================
    const existingCategory = await ElementsMaster.findOne({
      category_name: {
        $regex: new RegExp(`^${category_name.trim()}$`, "i"),
      },
    });

    if (existingCategory) {
      return errorResponse(res, "Category name already exists");
    }

    const element = new ElementsMaster({
      status: status ?? 1,
      category_name: category_name.trim(),
      description,
      state,
    });

    await element.save();

    return successResponse(res, "Element created successfully", element);
  } catch (error) {
    return errorResponse(res, "error", error.message);
  }
};
const listCategoryElements = async (req, res) => {
  try {
    const elements = await ElementsMaster.find({}).sort({ createdAt: -1 });

    return successResponse(res, "Elements fetched successfully", elements);
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
      quantity,
      item_status,
      item_notes,
      state,
    } = req.body;

    if (!state) {
      return errorResponse(res, "State is required");
    }
    if (!item_name) {
      return errorResponse(res, "Item name is required");
    }
    
    if (item_type === 2 && !category_id) {
      return res.status(400).json({
        success: false,
        message: "category_id is required when item_type is 2",
      });
    }
    if (![1, 2].includes(Number(item_type))) {
      return errorResponse(res, "Invalid item type");
    }

    if (![1, 2, 3, 4, 5].includes(Number(amount_unit))) {
      return errorResponse(res, "Invalid amount unit");
    }
if (amount === undefined || amount === null || Number(amount) < 0) {
      return errorResponse(res, "Valid amount is required");
    }

    // quantity required only for sq.ft, feet, pieces
    if ([3, 4, 5].includes(Number(amount_unit))) {
      if (
        quantity === undefined ||
        quantity === null ||
        Number(quantity) <= 0
      ) {
        return errorResponse(
          res,
          "Quantity is required when amount unit is Sq.Ft, Feet or Pieces"
        );
      }
    }

    if (category_id && !mongoose.Types.ObjectId.isValid(category_id)) {
      return errorResponse(res, "Invalid category id");
    }

    if (category_id) {
      const categoryExists = await ElementsMaster.findById(category_id);

      if (!categoryExists) {
        return errorResponse(res, "Selected category does not exist");
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
        return errorResponse(res, "Item name already exists");
      }

      item.item_name = item_name.trim();
      item.state = state;
      item.item_type = item_type;
      item.category_id = category_id || null;
      item.amount = amount;
      item.amount_unit = amount_unit;
       // quantity only for units 3,4,5
      item.quantity = [3, 4, 5].includes(Number(amount_unit))
        ? Number(quantity)
        : null;

      item.item_status =
        item_status !== undefined ? item_status : item.item_status;

      item.item_notes = item_notes || "";

      await item.save();

      return successResponse(res, "Item updated successfully", item);
    }
    // ================= CREATE =================
    const existingItem = await ItemMaster.findOne({
      item_name: {
        $regex: new RegExp(`^${item_name.trim()}$`, "i"),
      },
    });

    if (existingItem) {
      return errorResponse(res, "Item name already exists");
    }

    const item = new ItemMaster({
      item_name: item_name.trim(),
      item_type,
      state,
      category_id: category_id || null,
      amount,
      amount_unit,
      // quantity only for units 3,4,5
      quantity: [3, 4, 5].includes(Number(amount_unit))
        ? Number(quantity)
        : null,

      item_status: item_status ?? 1,
      item_notes,
    });

    await item.save();

    return successResponse(res, "Item created successfully", item);
  } catch (error) {
    console.error(error);
    return errorResponse(res, "Error while creating item", error.message);
  }
};
const elementsListItems = async (req, res) => {
  try {
    const items = await ItemMaster.find({})
      .populate("category_id")
      .sort({ createdAt: -1 });

    return successResponse(res, "Items fetched successfully", items);
  } catch (error) {
    return errorResponse(res, "Error", error.message);
  }
};
const saveGift = async (req, res) => {
  try {
    const { id,state, giftType, giftName, priceType, price, unit, notes, status } =
      req.body;

    // Gift Type Validation
    if (![1, 2].includes(Number(giftType))) {
      return errorResponse(res, "giftType must be 1 or 2");
    }

    // Price Type Validation
    if (Number(giftType) === 1 && ![1, 2].includes(Number(priceType))) {
      return errorResponse(res, "For giftType 1, priceType must be 1 or 2");
    }

    if (Number(giftType) === 2 && ![3, 4, 5].includes(Number(priceType))) {
      return errorResponse(res, "For giftType 2, priceType must be 3, 4 or 5");
    }

    // Common Validation
    if (!giftName?.trim()) {
      return errorResponse(res, "giftName is required");
    }

    if (!price || Number(price) <= 0) {
    }

    // priceType = 2 Validation
    if (Number(priceType) === 2) {
      if (!unit || Number(unit) <= 0) {
        return errorResponse(res, "unit is required");
      }
    }
    const existingItem = await GiftMaster.findOne({
      _id: { $ne: id },
      giftName: {
        $regex: new RegExp(`^${giftName.trim()}$`, "i"),
      },
    });

    if (existingItem) {
      return errorResponse(res, "Gift Name already exists");
    }
    const payload = {
      giftType,
      state,
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
        return errorResponse(res, "Invalid id");
      }

      const gift = await GiftMaster.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      });

      if (!gift) {
        return errorResponse(res, "Gift not found");
      }

      return successResponse(res, "Gift updated successfully", gift);
    }

    // CREATE
    const gift = await GiftMaster.create(payload);

    return successResponse(res, "Gift created successfully", gift);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
const listGifts = async (req, res) => {
  try {
    const gifts = await GiftMaster.find({}).sort({ createdAt: -1 }).lean();

    return successResponse(res, "Gift created successfully", gifts);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const listItemsGroupedByCategory = async (req, res) => {
  try {
    const [items, gifts] = await Promise.all([
      ItemMaster.find({}).populate("category_id").sort({ createdAt: -1 }),

      GiftMaster.find({}).sort({ createdAt: -1 }).lean(),
    ]);

    const groupedData = {};

    items.forEach((item) => {
      const categoryKey = item.category_id
        ? item.category_id._id.toString()
        : "NO_CATEGORY";

      if (!groupedData[categoryKey]) {
        groupedData[categoryKey] = {
          category_id: item.category_id || null,
          category_name: item.category_id
            ? item.category_id.category_name
            : "Uncategorized",
          itemsData: [],
        };
      }

      groupedData[categoryKey].itemsData.push({
        _id: item._id,
        item_name: item.item_name,
        item_type: item.item_type,
        amount: item.amount,
        amount_unit: item.amount_unit,
        item_status: item.item_status,
        item_notes: item.item_notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
    });

    return successResponse(res, "Items and Gifts fetched successfully", {
      elementsDetails: Object.values(groupedData),
      giftsDetails: gifts,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
// // overAll elemets Save in Order Creation
// const saveElements = async (req, res) => {
//   try {
//     const { items = [], gifts = [], order_notes } = req.body;

//     // ── 1. At least one section must have entries ───────────────────────────
//     if (
//       (!Array.isArray(items) || items.length === 0) &&
//       (!Array.isArray(gifts) || gifts.length === 0)
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Provide at least one item or one gift",
//       });
//     }

//     // ── 2. Validate items array entries ─────────────────────────────────────
//     for (let i = 0; i < items.length; i++) {
//       const { item_id, quantity } = items[i];
//       if (!item_id) {
//         return res.status(400).json({
//           success: false,
//           message: `items[${i}]: item_id is required`,
//         });
//       }
//       if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
//         return res.status(400).json({
//           success: false,
//           message: `items[${i}]: quantity must be a positive integer`,
//         });
//       }
//     }

//     // ── 3. Validate gifts array entries ─────────────────────────────────────
//     for (let i = 0; i < gifts.length; i++) {
//       const { gift_id, quantity } = gifts[i];
//       if (!gift_id) {
//         return res.status(400).json({
//           success: false,
//           message: `gifts[${i}]: gift_id is required`,
//         });
//       }
//       if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
//         return res.status(400).json({
//           success: false,
//           message: `gifts[${i}]: quantity must be a positive integer`,
//         });
//       }
//     }

//     // ── 4. Fetch all Items from DB in one query ──────────────────────────────
//     let dbItemMap = {};
//     if (items.length > 0) {
//       const itemIds  = [...new Set(items.map((i) => i.item_id))];
//       const dbItems  = await ItemMaster.find({ _id: { $in: itemIds }, item_status: 1 });
//       dbItems.forEach((doc) => { dbItemMap[doc._id.toString()] = doc; });

//       // Verify every requested item was found
//       for (let i = 0; i < items.length; i++) {
//         if (!dbItemMap[items[i].item_id]) {
//           return res.status(404).json({
//             success: false,
//             message: `items[${i}]: item with id "${items[i].item_id}" not found or is disabled`,
//           });
//         }
//       }
//     }

//     // ── 5. Fetch all Gifts from DB in one query ──────────────────────────────
//     let dbGiftMap = {};
//     if (gifts.length > 0) {
//       const giftIds = [...new Set(gifts.map((g) => g.gift_id))];
//       const dbGifts = await GiftMaster.find({ _id: { $in: giftIds }, status: 1 });
//       dbGifts.forEach((doc) => { dbGiftMap[doc._id.toString()] = doc; });

//       // Verify every requested gift was found
//       for (let i = 0; i < gifts.length; i++) {
//         if (!dbGiftMap[gifts[i].gift_id]) {
//           return res.status(404).json({
//             success: false,
//             message: `gifts[${i}]: gift with id "${gifts[i].gift_id}" not found or is disabled`,
//           });
//         }
//       }
//     }

//     // ── 6. Build order items + accumulate items_total ────────────────────────
//     let items_total = 0;
//     const orderItems = items.map(({ item_id, quantity }) => {
//       const doc        = dbItemMap[item_id];
//       const parsedCount = Number(quantity);
//       const item_amount = doc.amount * parsedCount; // amount from DB only
//       items_total += item_amount;

//       return {
//         item_id:     doc._id,
//         item_name:   doc.item_name,    // DB snapshot
//         item_type:   doc.item_type,    // DB snapshot
//         quantity:       parsedCount,
//         unit_amount: doc.amount,       // DB snapshot
//         amount_unit: doc.amount_unit,  // DB snapshot
//         item_amount,                   // unit_amount × quantity
//       };
//     });

//     // ── 7. Build order gifts + accumulate gifts_total ────────────────────────
//     let gifts_total = 0;
//     const orderGifts = gifts.map(({ gift_id, quantity }) => {
//       const doc         = dbGiftMap[gift_id];
//       const parsedCount = Number(quantity);
//       const gift_amount = doc.price * parsedCount; // price from DB only
//       gifts_total += gift_amount;

//       return {
//         gift_id:    doc._id,
//         gift_name:  doc.giftName,    // DB snapshot
//         gift_type:  doc.giftType,    // DB snapshot
//         quantity:      parsedCount,
//         unit_price: doc.price,       // DB snapshot
//         price_type: doc.priceType,   // DB snapshot
//         gift_amount,                 // unit_price × quantity
//       };
//     });

//     // ── 8. Final total ───────────────────────────────────────────────────────
//     const total_amount = items_total + gifts_total;

//     // ── 9. Persist ───────────────────────────────────────────────────────────
//     const newOrder = await OrderElements.create({
//       items:        orderItems,
//       gifts:        orderGifts,
//       items_total,
//       gifts_total,
//       total_amount,
//       order_notes:  order_notes || "",
//     });

//     // ── 10. Respond ──────────────────────────────────────────────────────────
//     return res.status(201).json({
//       success: true,
//       message: "Order saved successfully",
//       data: {
//         _id:          newOrder._id,
//         items:        newOrder.items,
//         gifts:        newOrder.gifts,
//         items_total:  newOrder.items_total,
//         gifts_total:  newOrder.gifts_total,
//         total_amount: newOrder.total_amount,
//         order_status: newOrder.order_status,
//         order_notes:  newOrder.order_notes,
//         createdAt:    newOrder.createdAt,
//         updatedAt:    newOrder.updatedAt,
//       },
//     });
//   } catch (error) {
//     console.error("Save Order Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Internal server error",
//     });
//   }
// };

module.exports = {
  createCategoryElement,
  listCategoryElements,
  elementsCreateItem,
  elementsListItems,
  saveGift,
  listGifts,
  listItemsGroupedByCategory,
  // saveElements,
};
