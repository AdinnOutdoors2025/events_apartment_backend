// const Apartment = require("../../../models/Admin/ApartmentSchema/apartment");
// const orderBooking = require("../../../models/Admin/OrderSchema/eventOrderSchema");
// const User = require("../../../models/client/UserModule/UserSchema");
// const staffUser = require("../../../models/Admin/StaffAdminManagement/staffAdminManagement");
// const { successResponse, errorResponse } = require("../../../utils/response");

// const getOrderStatusCounts = async (filter = {}) => {
//   const statusCounts = await orderBooking.aggregate([
//     { $match: filter },
//     {
//       $group: {
//         _id: "$orderStatus",
//         count: { $sum: 1 },
//         totalAmount: { $sum: "$totalAmount" },
//       },
//     },
//     { $sort: { _id: 1 } },
//   ]);

//   const counts = {
//     Enquiry: { count: 0, totalAmount: 0 },
//     "Need Analysis": { count: 0, totalAmount: 0 },
//     "Proposal & Price Quote": { count: 0, totalAmount: 0 },
//     "Negotiation & Review": { count: 0, totalAmount: 0 },
//     "Close Won": { count: 0, totalAmount: 0 },
//     "Closed Loss": { count: 0, totalAmount: 0 },
//     "Project Code Creation": { count: 0, totalAmount: 0 },
//   };

//   statusCounts.forEach((item) => {
//     switch (item._id) {
//       case 1:
//         counts.Enquiry = {
//           count: item.count,
//           totalAmount: item.totalAmount || 0,
//         };
//         break;

//       case 2:
//         counts["Need Analysis"] = {
//           count: item.count,
//           totalAmount: item.totalAmount || 0,
//         };
//         break;

//       case 3:
//         counts["Proposal & Price Quote"] = {
//           count: item.count,
//           totalAmount: item.totalAmount || 0,
//         };
//         break;

//       case 4:
//         counts["Negotiation & Review"] = {
//           count: item.count,
//           totalAmount: item.totalAmount || 0,
//         };
//         break;

//       case 5:
//         counts["Close Won"] = {
//           count: item.count,
//           totalAmount: item.totalAmount || 0,
//         };
//         break;

//       case 6:
//         counts["Closed Loss"] = {
//           count: item.count,
//           totalAmount: item.totalAmount || 0,
//         };
//         break;

//       case 7:
//         counts["Project Code Creation"] = {
//           count: item.count,
//           totalAmount: item.totalAmount || 0,
//         };
//         break;
//     }
//   });

//   return counts;
// };

// const formatLastLogin = (date) => {
//   if (!date) return null;

//   const d = new Date(date);
//   const day = String(d.getDate()).padStart(2, "0");
//   const month = String(d.getMonth() + 1).padStart(2, "0");
//   const year = d.getFullYear();

//   let hours = d.getHours();
//   const minutes = String(d.getMinutes()).padStart(2, "0");
//   const ampm = hours >= 12 ? "PM" : "AM";

//   hours = hours % 12;
//   hours = hours ? hours : 12; // Convert 0 to 12

//   return `${day}.${month}.${year} ${hours}.${minutes}${ampm}`;
// };

// // Helper function to add date range condition for dateRanges
// const addDateRangeCondition = (filter, fromDate, toDate) => {
//   const startDateTime = new Date(fromDate);
//   startDateTime.setHours(0, 0, 0, 0);

//   const endDateTime = new Date(toDate);
//   endDateTime.setHours(23, 59, 59, 999);

//   filter.dateRanges = {
//     $elemMatch: {
//       fromDate: { $lte: endDateTime },
//       toDate: { $gte: startDateTime },
//     },
//   };
// };

// // Helper function to get date range for RentPay (using dateRanges)
// const getRentPayFilter = (fromDate, toDate) => {
//   const filter = {};

//   if (fromDate && toDate) {
//     const startDateTime = new Date(fromDate);
//     startDateTime.setHours(0, 0, 0, 0);
//     const endDateTime = new Date(toDate);
//     endDateTime.setHours(23, 59, 59, 999);

//     filter.dateRanges = {
//       $elemMatch: {
//         fromDate: { $lte: endDateTime },
//         toDate: { $gte: startDateTime },
//       },
//     };
//   } else if (fromDate) {
//     const startDateTime = new Date(fromDate);
//     startDateTime.setHours(0, 0, 0, 0);
//     const endDateTime = new Date(fromDate);
//     endDateTime.setHours(23, 59, 59, 999);

//     filter.dateRanges = {
//       $elemMatch: {
//         fromDate: { $lte: endDateTime },
//         toDate: { $gte: startDateTime },
//       },
//     };
//   } else if (toDate) {
//     const startDateTime = new Date(toDate);
//     startDateTime.setHours(0, 0, 0, 0);
//     const endDateTime = new Date(toDate);
//     endDateTime.setHours(23, 59, 59, 999);

//     filter.dateRanges = {
//       $elemMatch: {
//         fromDate: { $lte: endDateTime },
//         toDate: { $gte: startDateTime },
//       },
//     };
//   }

//   return filter;
// };
// const getLastStatusChange = (order) => {
//   if (!order.orderHistory || order.orderHistory.length === 0) {
//     return null;
//   }

//   // Sort orderHistory by changedAt (timestamp)
//   const sortedHistory = [...order.orderHistory].sort(
//     (a, b) => new Date(b.changedAt) - new Date(a.changedAt),
//   );

//   const lastChange = sortedHistory[0];

//   return {
//     orderId: order.orderId,
//     fromStatus: lastChange.fromStatus,
//     fromStatusText: lastChange.fromStatusText,
//     toStatus: lastChange.toStatus,
//     toStatusText: lastChange.toStatusText,
//     changedBy: lastChange.changedBy || null,
//     lastChangedAt: formatLastLogin(lastChange.changedAt),
//   };
// };

// const getLastAdditionalNote = (order) => {
//   if (!order.orderHistory || order.orderHistory.length === 0) {
//     return null;
//   }

//   // Collect all additional notes from all history entries
//   let allNotes = [];
//   order.orderHistory.forEach(historyEntry => {
//     if (historyEntry.additionalNotes && historyEntry.additionalNotes.length > 0) {
//       allNotes = allNotes.concat(historyEntry.additionalNotes);
//     }
//   });

//   if (allNotes.length === 0) {
//     return null;
//   }

//   // Sort all notes by uploadedAt (timestamp)
//   const sortedNotes = allNotes.sort(
//     (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt),
//   );
  
//   const latestNote = sortedNotes[0];
  
//   return {
//     orderId: order.orderId,
//     text: latestNote.text,
//     uploadedBy: latestNote.uploadedBy,
//     uploadedAt: formatLastLogin(latestNote.uploadedAt),
//   };
// };


// // Get last actual status change (excluding initial creation) - WITH DEBUGGING

// const getDashboard = async (req, res) => {
//   try {
//     const { fromDate, toDate } = req.body;

//     // Total Apartment Count
//     const totalApartmentCount = await Apartment.countDocuments();

//     // Active Events (events happening today)
//     const today = new Date();
//     const startOfDay = new Date(today);
//     startOfDay.setHours(0, 0, 0, 0);
//     const endOfDay = new Date(today);
//     endOfDay.setHours(23, 59, 59, 999);
//     const todayDateStr = today.toISOString().split("T")[0];

//     const activeEventFilter = {
//       $or: [
//         {
//           dateRanges: {
//             $elemMatch: {
//               fromDate: { $lte: endOfDay },
//               toDate: { $gte: startOfDay },
//             },
//           },
//         },
//         {
//           dateRanges: {
//             $elemMatch: {
//               "dailySchedule.date": todayDateStr,
//             },
//           },
//         },
//       ],
//     };

//     const activeEventSpace =
//       await orderBooking.countDocuments(activeEventFilter);

//     // Revenue Count (Close Won orders with date filtering)
//     let revenueFilter = { orderStatus: 5 };

//     if (fromDate || toDate) {
//       if (fromDate && toDate) {
//         addDateRangeCondition(revenueFilter, fromDate, toDate);
//       } else if (fromDate) {
//         addDateRangeCondition(revenueFilter, fromDate, fromDate);
//       } else if (toDate) {
//         addDateRangeCondition(revenueFilter, toDate, toDate);
//       }
//     }

//     const revenueData = await orderBooking.aggregate([
//       { $match: revenueFilter },
//       {
//         $group: {
//           _id: null,
//           eventRevenue: { $sum: "$totalAmount" },
//         },
//       },
//     ]);

//     // Apartment Rent Pay & Promoter Cost
//     const rentPayFilter = getRentPayFilter(fromDate, toDate);

//     const rentPayData = await orderBooking.aggregate([
//       { $match: rentPayFilter },
//       {
//         $group: {
//           _id: null,
//           apartmentRentPay: { $sum: "$apartmentAmount" },
//           promoterCost: { $sum: "$promoterTotal" },
//         },
//       },
//     ]);

//     const eventRevenue =
//       revenueData.length > 0 ? revenueData[0].eventRevenue : 0;
//     const apartmentRentPay =
//       rentPayData.length > 0 ? rentPayData[0].apartmentRentPay : 0;
//     const promoterCost =
//       rentPayData.length > 0 ? rentPayData[0].promoterCost : 0;

//     // Net Margin (20% of event revenue)
//     const netMargin = Math.floor(eventRevenue * 0.2);

//     // Order Pipeline Status Counts (with date filtering)

//     const orderPipeline = await getOrderStatusCounts();

//     // Upcoming Events
//     const upcomingEvents = await orderBooking
//       .find({
//         orderStatus: 1,
//       })
//       .select("apartmentDetails eventDetails orderStatus dateRanges") // Only include specific fields
//       .sort({ eventDate: 1 });

//     const [lastUser, lastStaffUser, lastBooking, lastApartment] =
//       await Promise.all([
//         User.findOne(
//           { lastLogin: { $exists: true, $ne: null } },
//           { userName: 1, lastLogin: 1, _id: 0 },
//         ).sort({ lastLogin: -1 }),
//         staffUser
//           .findOne(
//             { lastLogin: { $exists: true, $ne: null } },
//             { userName: 1, lastLogin: 1, _id: 0 },
//           )
//           .sort({ lastLogin: -1 }),
//         orderBooking
//           .findOne()
//           .sort({ createdAt: -1 })
//           .populate({ path: "eventId", select: "eventName eventDate" })
//           .populate({ path: "apartmentId", select: "ApartmentName" })
//           .lean(),
//         Apartment.findOne()
//           .sort({ createdAt: -1 }) // Sort by creation date, newest first
//           .select(
//             "ApartmentName location city state pincode status createdAt updatedAt",
//           )
//           .lean(),
//       ]);
//     // Format last booking details with event name, date, and time
//     // Format last booking details with event name, date, and time
//     let lastBookingDetails = null;
//     let lastStatusChange = null;
//     let lastAdditionalNote = null;
//     if (lastBooking) {
//       // Get the first date range or event date
//       let eventDate = null;

//       if (lastBooking.dateRanges && lastBooking.dateRanges.length > 0) {
//         const firstDateRange = lastBooking.dateRanges[0];
//         eventDate = firstDateRange.fromDate;
//       } else if (lastBooking.eventId?.eventDate) {
//         eventDate = lastBooking.eventId.eventDate;
//       }
//       lastStatusChange = getLastStatusChange(lastBooking);
//        lastAdditionalNote = getLastAdditionalNote(lastBooking);
//       lastBookingDetails = {
//         orderId: lastBooking.orderId,
//         eventName: lastBooking.eventId?.eventName || "",
//         apartmentName: lastBooking.apartmentId?.ApartmentName || "",
//         updatedBy: lastBooking.updatedBy,
//         orderStatus: lastBooking.orderStatus,
//         lastLogin: formatLastLogin(lastBooking.createdAt), // Add lastLogin based on booking creation date
//       };
//     }

//     // Format last apartment onboarding details
//     let lastApartmentDetails = null;
//     if (lastApartment) {
//       lastApartmentDetails = {
//         apartmentId: lastApartment._id,
//         apartmentName: lastApartment.ApartmentName || "",

//         createdAt: lastApartment.createdAt,
//         lastLogin: formatLastLogin(lastApartment.createdAt), // Format like "15.06.2026 4.26PM"
//       };
//     }
//     const lastUserActivity = {
//       User: lastUser
//         ? {
//             userName: lastUser.userName,
//             lastLogin: formatLastLogin(lastUser.lastLogin),
//           }
//         : null,
//       staffUser: lastStaffUser
//         ? {
//             userName: lastStaffUser.userName,
//             lastLogin: formatLastLogin(lastStaffUser.lastLogin),
//           }
//         : null,
//       lastBooking: lastBookingDetails,
//       lastStatusChange: lastStatusChange,
//         lastAdditionalNote: lastAdditionalNote,
//       lastApartment: lastApartmentDetails,
//     };
//     return successResponse(
//       res,
//       "Dashboard fetched successfully",
//       {
//         totalApartmentCount,
//         activeEventSpace,
//         eventRevenue,
//         apartmentRentPay,
//         promoterCost,
//         netMargin,
//         orderPipeline,
//         upcomingEvents,
//         lastUserActivity: lastUserActivity || {
//           message: "No user activity found",
//         },
//       },
//       200,
//     );
//   } catch (error) {
//     console.error("Dashboard error:", error);
//     return errorResponse(res, error.message, null, 500);
//   }
// };

// module.exports = {
//   getDashboard,
// };


const Apartment = require("../../../models/Admin/ApartmentSchema/apartment");
const orderBooking = require("../../../models/Admin/OrderSchema/eventOrderSchema");
const User = require("../../../models/client/UserModule/UserSchema");
const staffUser = require("../../../models/Admin/StaffAdminManagement/staffAdminManagement");
const { successResponse, errorResponse } = require("../../../utils/response");

const getOrderStatusCounts = async (filter = {}) => {
  const statusCounts = await orderBooking.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$orderStatus",
        count: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const counts = {
    Enquiry: { count: 0, totalAmount: 0 },
    "Need Analysis": { count: 0, totalAmount: 0 },
    "Proposal & Price Quote": { count: 0, totalAmount: 0 },
    "Negotiation & Review": { count: 0, totalAmount: 0 },
    "Close Won": { count: 0, totalAmount: 0 },
    "Closed Loss": { count: 0, totalAmount: 0 },
    "Project Code Creation": { count: 0, totalAmount: 0 },
  };

  statusCounts.forEach((item) => {
    switch (item._id) {
      case 1:
        counts.Enquiry = {
          count: item.count,
          totalAmount: item.totalAmount || 0,
        };
        break;
      case 2:
        counts["Need Analysis"] = {
          count: item.count,
          totalAmount: item.totalAmount || 0,
        };
        break;
      case 3:
        counts["Proposal & Price Quote"] = {
          count: item.count,
          totalAmount: item.totalAmount || 0,
        };
        break;
      case 4:
        counts["Negotiation & Review"] = {
          count: item.count,
          totalAmount: item.totalAmount || 0,
        };
        break;
      case 5:
        counts["Close Won"] = {
          count: item.count,
          totalAmount: item.totalAmount || 0,
        };
        break;
      case 6:
        counts["Closed Loss"] = {
          count: item.count,
          totalAmount: item.totalAmount || 0,
        };
        break;
      case 7:
        counts["Project Code Creation"] = {
          count: item.count,
          totalAmount: item.totalAmount || 0,
        };
        break;
    }
  });

  return counts;
};

const formatLastLogin = (date) => {
  if (!date) return null;

  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${day}.${month}.${year} ${hours}.${minutes}${ampm}`;
};

// Helper function to add date range condition for dateRanges
const addDateRangeCondition = (filter, fromDate, toDate) => {
  const startDateTime = new Date(fromDate);
  startDateTime.setHours(0, 0, 0, 0);

  const endDateTime = new Date(toDate);
  endDateTime.setHours(23, 59, 59, 999);

  filter.dateRanges = {
    $elemMatch: {
      fromDate: { $lte: endDateTime },
      toDate: { $gte: startDateTime },
    },
  };
};

// Helper function to get date range for RentPay (using dateRanges)
const getRentPayFilter = (fromDate, toDate) => {
  const filter = {};

  if (fromDate && toDate) {
    const startDateTime = new Date(fromDate);
    startDateTime.setHours(0, 0, 0, 0);
    const endDateTime = new Date(toDate);
    endDateTime.setHours(23, 59, 59, 999);

    filter.dateRanges = {
      $elemMatch: {
        fromDate: { $lte: endDateTime },
        toDate: { $gte: startDateTime },
      },
    };
  } else if (fromDate) {
    const startDateTime = new Date(fromDate);
    startDateTime.setHours(0, 0, 0, 0);
    const endDateTime = new Date(fromDate);
    endDateTime.setHours(23, 59, 59, 999);

    filter.dateRanges = {
      $elemMatch: {
        fromDate: { $lte: endDateTime },
        toDate: { $gte: startDateTime },
      },
    };
  } else if (toDate) {
    const startDateTime = new Date(toDate);
    startDateTime.setHours(0, 0, 0, 0);
    const endDateTime = new Date(toDate);
    endDateTime.setHours(23, 59, 59, 999);

    filter.dateRanges = {
      $elemMatch: {
        fromDate: { $lte: endDateTime },
        toDate: { $gte: startDateTime },
      },
    };
  }

  return filter;
};

// Get last status change across ALL orders (excluding toStatus === 1)
const getGlobalLastStatusChange = async () => {
  const result = await orderBooking.aggregate([
    { $unwind: "$orderHistory" },
    { $match: { "orderHistory.toStatus": { $ne: 1 } } },
    { $sort: { "orderHistory.changedAt": -1 } },
    { $limit: 1 },
    {
      $project: {
        _id: 0,
        orderId: 1,
        fromStatus: "$orderHistory.fromStatus",
        fromStatusText: "$orderHistory.fromStatusText",
        toStatus: "$orderHistory.toStatus",
        toStatusText: "$orderHistory.toStatusText",
        changedBy: "$orderHistory.changedBy",
        lastChangedAt: "$orderHistory.changedAt",
      },
    },
  ]);

  if (!result || result.length === 0) return null;

  const item = result[0];
  return {
    orderId: item.orderId,
    fromStatus: item.fromStatus,
    fromStatusText: item.fromStatusText,
    toStatus: item.toStatus,
    toStatusText: item.toStatusText,
    changedBy: item.changedBy || null,
    lastChangedAt: formatLastLogin(item.lastChangedAt),
  };
};

// Get last additional note across ALL orders
const getGlobalLastAdditionalNote = async () => {
  const result = await orderBooking.aggregate([
    { $unwind: "$orderHistory" },
    { $unwind: "$orderHistory.additionalNotes" },
    { $sort: { "orderHistory.additionalNotes.uploadedAt": -1 } },
    { $limit: 1 },
    {
      $project: {
        _id: 0,
        orderId: 1,
        text: "$orderHistory.additionalNotes.text",
        uploadedBy: "$orderHistory.additionalNotes.uploadedBy",
        uploadedAt: "$orderHistory.additionalNotes.uploadedAt",
      },
    },
  ]);

  if (!result || result.length === 0) return null;

  const item = result[0];
  return {
    orderId: item.orderId,
    text: item.text,
    uploadedBy: item.uploadedBy,
    uploadedAt: formatLastLogin(item.uploadedAt),
  };
};

const getDashboard = async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;

    // Total Apartment Count
    const totalApartmentCount = await Apartment.countDocuments();

    // Active Events (events happening today)
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    const todayDateStr = today.toISOString().split("T")[0];

    const activeEventFilter = {
      $or: [
        {
          dateRanges: {
            $elemMatch: {
              fromDate: { $lte: endOfDay },
              toDate: { $gte: startOfDay },
            },
          },
        },
        {
          dateRanges: {
            $elemMatch: {
              "dailySchedule.date": todayDateStr,
            },
          },
        },
      ],
    };

    const activeEventSpace =
      await orderBooking.countDocuments(activeEventFilter);

    // Revenue Count (Close Won orders with date filtering)
    let revenueFilter = { orderStatus: 5 };

    if (fromDate || toDate) {
      if (fromDate && toDate) {
        addDateRangeCondition(revenueFilter, fromDate, toDate);
      } else if (fromDate) {
        addDateRangeCondition(revenueFilter, fromDate, fromDate);
      } else if (toDate) {
        addDateRangeCondition(revenueFilter, toDate, toDate);
      }
    }

    const revenueData = await orderBooking.aggregate([
      { $match: revenueFilter },
      {
        $group: {
          _id: null,
          eventRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    // Apartment Rent Pay & Promoter Cost
    const rentPayFilter = getRentPayFilter(fromDate, toDate);

    const rentPayData = await orderBooking.aggregate([
      { $match: rentPayFilter },
      {
        $group: {
          _id: null,
          apartmentRentPay: { $sum: "$apartmentAmount" },
          promoterCost: { $sum: "$promoterTotal" },
        },
      },
    ]);

    const eventRevenue =
      revenueData.length > 0 ? revenueData[0].eventRevenue : 0;
    const apartmentRentPay =
      rentPayData.length > 0 ? rentPayData[0].apartmentRentPay : 0;
    const promoterCost =
      rentPayData.length > 0 ? rentPayData[0].promoterCost : 0;

    // Net Margin (20% of event revenue)
    const netMargin = Math.floor(eventRevenue * 0.2);

    // Order Pipeline Status Counts
    const orderPipeline = await getOrderStatusCounts();

    // Upcoming Events
    const upcomingEvents = await orderBooking
      .find({ orderStatus: 1 })
      .select("apartmentDetails eventDetails orderStatus dateRanges")
      .sort({ eventDate: 1 });

    const [
      lastUser,
      lastStaffUser,
      lastBooking,
      lastApartment,
      lastStatusChange,
      lastAdditionalNote,
    ] = await Promise.all([
      User.findOne(
        { lastLogin: { $exists: true, $ne: null } },
        { userName: 1, lastLogin: 1, _id: 0 },
      ).sort({ lastLogin: -1 }),
      staffUser
        .findOne(
          { lastLogin: { $exists: true, $ne: null } },
          { userName: 1, lastLogin: 1, _id: 0 },
        )
        .sort({ lastLogin: -1 }),
      orderBooking
        .findOne()
        .sort({ createdAt: -1 })
        .populate({ path: "eventId", select: "eventName eventDate" })
        .populate({ path: "apartmentId", select: "ApartmentName" })
        .select(
          "orderId eventId apartmentId updatedBy orderStatus createdAt dateRanges",
        )
        .lean(),
      Apartment.findOne()
        .sort({ createdAt: -1 })
        .select(
          "ApartmentName location city state pincode status createdAt updatedAt",
        )
        .lean(),
      getGlobalLastStatusChange(),   // Separate query across all orders
      getGlobalLastAdditionalNote(), // Separate query across all orders
    ]);

    // Format last booking details
    let lastBookingDetails = null;
    if (lastBooking) {
      lastBookingDetails = {
        orderId: lastBooking.orderId,
        eventName: lastBooking.eventId?.eventName || "",
        apartmentName: lastBooking.apartmentId?.ApartmentName || "",
        updatedBy: lastBooking.updatedBy,
        orderStatus: lastBooking.orderStatus,
        lastLogin: formatLastLogin(lastBooking.createdAt),
      };
    }

    // Format last apartment onboarding details
    let lastApartmentDetails = null;
    if (lastApartment) {
      lastApartmentDetails = {
        apartmentId: lastApartment._id,
        apartmentName: lastApartment.ApartmentName || "",
        createdAt: lastApartment.createdAt,
        lastLogin: formatLastLogin(lastApartment.createdAt),
      };
    }

    const lastUserActivity = {
      User: lastUser
        ? {
            userName: lastUser.userName,
            lastLogin: formatLastLogin(lastUser.lastLogin),
          }
        : null,
      staffUser: lastStaffUser
        ? {
            userName: lastStaffUser.userName,
            lastLogin: formatLastLogin(lastStaffUser.lastLogin),
          }
        : null,
      lastBooking: lastBookingDetails,
      lastStatusChange: lastStatusChange,
      lastAdditionalNote: lastAdditionalNote,
      lastApartment: lastApartmentDetails,
    };

    return successResponse(
      res,
      "Dashboard fetched successfully",
      {
        totalApartmentCount,
        activeEventSpace,
        eventRevenue,
        apartmentRentPay,
        promoterCost,
        netMargin,
        orderPipeline,
        upcomingEvents,
        lastUserActivity: lastUserActivity || {
          message: "No user activity found",
        },
      },
      200,
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  getDashboard,
};