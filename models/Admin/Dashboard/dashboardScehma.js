// models/Admin/Dashboard/dashboardFilterSchema.js

const mongoose = require("mongoose");

const dashboardFilterSchema = new mongoose.Schema(
  {
    fromDate: {
      type: Date,
    },
    toDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "DashboardFilter",
  dashboardFilterSchema
);