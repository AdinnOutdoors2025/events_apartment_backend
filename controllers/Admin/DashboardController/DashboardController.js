const Apartment = require("../../../models/Admin/ApartmentSchema/apartment");
const orderBooking = require("../../../models/Admin/OrderSchema/eventOrderSchema");
const User = require("../../../models/client/UserModule/UserSchema");
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
// Helper function to format date
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
  hours = hours ? hours : 12; // Convert 0 to 12

  return `${day}.${month}.${year} ${hours}.${minutes}${ampm}`;
};

const getDashboard = async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    // Total Apartment Count
    const totalApartmentCount = await Apartment.countDocuments();
    // Total Active Event Space
    // let activeEventFilter = {};
    // if (fromDate && toDate) {
    //   // Both dates provided: events active within the date range
    //   activeEventFilter = {
    //     fromDate: { $lte: new Date(toDate) },
    //     toDate: { $gte: new Date(fromDate) },
    //   };
    // } else if (fromDate) {
    //   // Only fromDate provided: events active on this specific date
    //   const startDate = new Date(fromDate);
    //   startDate.setHours(0, 0, 0, 0);
    //   const endDate = new Date(fromDate);
    //   endDate.setHours(23, 59, 59, 999);
    //   activeEventFilter = {
    //     fromDate: { $lte: endDate },
    //     toDate: { $gte: startDate },
    //   };
    // } else if (toDate) {
    //   // Only toDate provided: events ending on or before this date
    //   const endDate = new Date(toDate);
    //   endDate.setHours(23, 59, 59, 999);
    //   activeEventFilter = {
    //     toDate: { $lte: endDate },
    //   };
    // }
    // const activeEventSpace = await orderBooking.countDocuments(activeEventFilter);
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const activeEventFilter = {
      fromDate: { $lte: endOfDay }, // Event starts on or before today ends
      toDate: { $gte: startOfDay }, // Event ends on or after today starts
    };

    const activeEventSpace =
      await orderBooking.countDocuments(activeEventFilter);

    // Revenue Count
    let revenueFilter = {
      orderStatus: 5, // Base filter: only status 5
    };

    // Add date conditions to the existing filter (don't replace)
    if (fromDate && toDate) {
      revenueFilter.fromDate = { $lte: new Date(toDate) };
      revenueFilter.toDate = { $gte: new Date(fromDate) };
    } else if (fromDate) {
      const startDate = new Date(fromDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(fromDate);
      endDate.setHours(23, 59, 59, 999);

      revenueFilter.fromDate = { $lte: endDate };
      revenueFilter.toDate = { $gte: startDate };
    } else if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);

      revenueFilter.toDate = { $lte: endDate };
    }

    // Now this will only fetch orders with status 5 + date conditions
    const revenueData = await orderBooking.aggregate([
      {
        $match: revenueFilter,
      },
      {
        $group: {
          _id: null,
          eventRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);
    // apartmentRentPay & promoterCost
    let RentPayFilter = {};

    if (fromDate && toDate) {
      RentPayFilter = {
        fromDate: { $lte: new Date(toDate) },
        toDate: { $gte: new Date(fromDate) },
      };
    } else if (fromDate) {
      const startDate = new Date(fromDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(fromDate);
      endDate.setHours(23, 59, 59, 999);
      RentPayFilter = {
        fromDate: { $lte: endDate },
        toDate: { $gte: startDate },
      };
    } else if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      RentPayFilter = {
        toDate: { $lte: endDate },
      };
    }
    // Rest of your code remains the same...
    const RentPayData = await orderBooking.aggregate([
      {
        $match: RentPayFilter,
      },
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
      RentPayData.length > 0 ? RentPayData[0].apartmentRentPay : 0;
    const promoterCost =
      RentPayData.length > 0 ? RentPayData[0].promoterCost : 0;
    // 20 Percentage
    const netMargin = Math.floor(eventRevenue * 0.2);
    const orderPipeline = await getOrderStatusCounts();

    // const today = new Date();
    const upcomingEvents = await orderBooking
      .find({
        orderStatus: 1,
      })
      .select("apartmentDetails eventDetails orderStatus fromDate toDate") // Only include specific fields
      .sort({ eventDate: 1 });

    // Get the last logged in user only (most recent)
    const lastUser = await User.findOne(
      { lastLogin: { $exists: true, $ne: null } }, // User must have lastLogin
      { userName: 1, lastLogin: 1, _id: 0 }, // Select only userName and lastLogin
    ).sort({ lastLogin: -1 }); // Sort by most recent login and get first record

    // Format the last user activity
    const lastUserActivity = {
      User: {
        userName: lastUser.userName,
        lastLogin: formatLastLogin(lastUser.lastLogin),
      },
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
        lastUserActivity,
      },
      200,
    );
  } catch (error) {
    console.log(error);
    return errorResponse(res, error.message, null, 500);
  }
};

module.exports = {
  getDashboard,
};
