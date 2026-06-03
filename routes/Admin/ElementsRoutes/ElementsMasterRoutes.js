const express = require("express");
const router = express.Router();
const {createCategoryElement,listCategoryElements,elementsCreateItem,elementsListItems } =  require('../../../controllers/Admin/ElementsMasterController/ElementsMasterContoller')
const protect = require("../../../middleware/authMiddleware");


router.post("/createCategory", protect,createCategoryElement);
router.post("/listCategory", protect,listCategoryElements);
router.post("/createItem", protect,elementsCreateItem);
router.post("/listItem", protect,elementsListItems);
module.exports = router;