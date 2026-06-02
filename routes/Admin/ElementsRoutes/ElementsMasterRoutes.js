const express = require("express");
const router = express.Router();
const {createElement,createItem } =  require('../../../controllers/Admin/ElementsMasterController/ElementsMasterContoller')
const protect = require("../../../middleware/authMiddleware");


router.post("/createCategory", protect,createElement);
router.post("/createItem", protect,createItem);
module.exports = router;