const express = require("express");
const router = express.Router();
const {createCategoryElement,listCategoryElements,elementsCreateItem,elementsListItems,saveGift,listGifts,listItemsGroupedByCategory } =  require('../../../../controllers/Admin/OrderController/ElementsMasterController/ElementsMasterContoller')
const protect = require("../../../../middleware/authMiddleware");


router.post("/createCategory", protect,createCategoryElement);
router.post("/listCategory", protect,listCategoryElements);
router.post("/createItem", protect,elementsCreateItem);
router.post("/listItem", protect,elementsListItems);
router.post("/gifts-save", protect,saveGift);
router.post("/gifts-list", protect,listGifts);
router.post("/category-items-list", protect,listItemsGroupedByCategory);
// router.post("/order-elements-save", protect,saveElements);
module.exports = router;