const fs = require("fs");
const mongoose = require("mongoose");
const Apartment = require("../../../models/Admin/ApartmentSchema/apartment");
const UploadSession = require("../../../models/Admin/ApartmentSchema/uploadSession");
const readExcelFile = require("../../../utils/excelHelper");
const ApartmentFilters = require("../../../middleware/ApartmentFilters");
const { successResponse, errorResponse } = require("../../../utils/response");

// ─────────────────────────────────────────────
// HELPER — PARSE BANK DETAILS
// ─────────────────────────────────────────────

const parseBankDetails = (raw) => {
  if (!raw?.toString().trim()) return [];

  const str = raw
    .toString()
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .trim();

  const getValue = (field, nextField) => {
    let regex;
    if (nextField) {
      regex = new RegExp(`${field}\\s*:\\s*(.*?)\\s*(?=${nextField}\\s*:|$)`, "i");
    } else {
      regex = new RegExp(`${field}\\s*:\\s*(.*)$`, "i");
    }
    const match = str.match(regex);
    return match?.[1]?.trim() || "";
  };

  return [{
    accountName: getValue("accountName", "bankName"),
    bankName: getValue("bankName", "accountNumber"),
    accountNumber: getValue("accountNumber", "ifscCode"),
    ifscCode: getValue("ifscCode", "phoneNumber"),
    phoneNumber: getValue("phoneNumber", "upiId"),
    upiId: getValue("upiId"),
  }];
};

// ─────────────────────────────────────────────
// HELPER — PARSE EVENTS HISTORY
// ─────────────────────────────────────────────

const parseEventsHistory = (raw) => {
  if (!raw?.toString().trim()) return [];

  const str = raw
    .toString()
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .trim();

  const getValue = (field, nextField) => {
    let regex;
    if (nextField) {
      regex = new RegExp(`${field}\\s*:\\s*(.*?)\\s*(?=${nextField}\\s*:|$)`, "i");
    } else {
      regex = new RegExp(`${field}\\s*:\\s*(.*)$`, "i");
    }
    const match = str.match(regex);
    return match?.[1]?.trim() || "";
  };

  return [{
    eventName: getValue("EventName", "EventDate"),
    eventDate: getValue("EventDate", "Remark"),
    remarks: getValue("Remark"),
  }];
};

// ─────────────────────────────────────────────
// HELPER — CHECK IF ANY FIELD CHANGED
// ─────────────────────────────────────────────

const hasDataChanged = (existing, incoming, bankDetails, existingEventsHistory) => {
  const scalarFields = [
    "apartmentName", "apartmentAddress", "city", "location",
    "jioLocation", "permissionStatus", "rating", "photo",
    "apartmentSummary", "contactPersonName", "contactPersonPhone",
    "email", "startingTGValues", "residencyCount", "approxPeopleCount", "perDayRent",
  ];

  const scalarChanged = scalarFields.some(
    (f) => String(existing[f] ?? "") !== String(incoming[f] ?? "")
  );

  const eb = existing.bankDetails?.[0] || {};
  const ib = bankDetails?.[0] || {};
  const bankChanged =
    String(eb.accountName ?? "") !== String(ib.accountName ?? "") ||
    String(eb.bankName ?? "") !== String(ib.bankName ?? "") ||
    String(eb.accountNumber ?? "") !== String(ib.accountNumber ?? "") ||
    String(eb.ifscCode ?? "") !== String(ib.ifscCode ?? "") ||
    String(eb.phoneNumber ?? "") !== String(ib.phoneNumber ?? "") ||
    String(eb.upiId ?? "") !== String(ib.upiId ?? "");

  const ee = existing.existingEventsHistory?.[0] || {};
  const ie = existingEventsHistory?.[0] || {};
  const eventChanged =
    String(ee.eventName ?? "") !== String(ie.eventName ?? "") ||
    String(ee.eventDate ?? "") !== String(ie.eventDate ?? "") ||
    String(ee.remarks ?? "") !== String(ie.remarks ?? "");

  return scalarChanged || bankChanged || eventChanged;
};

// ─────────────────────────────────────────────
// 1. UPLOAD EXCEL
// ─────────────────────────────────────────────

const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload excel file",
      });
    }

    const data = readExcelFile(req.file.path);

    const insertedData = [];
    const updatedData = [];
    const skippedData = [];
    const insertedApartmentIds = [];
    const updatedApartmentIds = [];
    const skippedApartmentIds = [];

    const processedApartmentId = new Set();

    // CREATE SESSION FIRST
    const session = await UploadSession.create({
      fileName: req.file.originalname,
      totalRows: data.length,
    });

    // ── LOOP ROWS ──
    for (const item of data) {
      try {
        // CLEAN SCALAR FIELDS
        const apartmentId = item.apartmentId?.toString().trim().toLowerCase();
        const apartmentName = item.apartmentName?.toString().trim();
        const apartmentAddress = item.apartmentAddress?.toString().trim();
        const city = item.city?.toString().trim();
        const location = item.location?.toString().trim();
        const jioLocation = item.jioLocation?.toString().trim() || "";
        const permissionStatus = item.permissionStatus?.toString().trim() || "";
        const rating = item.rating?.toString().trim() || "";
        const photo = item.photo?.toString().trim() || "";
        const apartmentSummary = item.apartmentSummary?.toString().trim();
        const contactPersonName = item.contactPersonName?.toString().trim();
        const contactPersonPhone = item.contactPersonPhone?.toString().trim();
        const email = item.email?.toString().trim().toLowerCase();
        const startingTGValues = Number(item.startingTGValues || 0);
        const residencyCount = Number(item.residencyCount);
        const approxPeopleCount = Number(item.approxPeopleCount || 0);
        const perDayRent = Number(item.perDayRent);

        const bankDetails = parseBankDetails(item.bankDetails);
        const existingEventsHistory = parseEventsHistory(item.existingEventsHistory);

        // REQUIRED FIELD VALIDATION
        if (
          !apartmentId || !apartmentName || !apartmentAddress ||
          !city || !location || !apartmentSummary ||
          !contactPersonName || !contactPersonPhone || !email ||
          isNaN(residencyCount) || isNaN(perDayRent)
        ) {
          skippedData.push({ row: item, message: "Missing required fields" });
          continue;
        }

        // DUPLICATE INSIDE SAME EXCEL
        if (processedApartmentId.has(apartmentId)) {
          skippedData.push({
            row: item,
            message: `Duplicate ApartmentId "${apartmentId}" found in same Excel`,
          });
          skippedApartmentIds.push(apartmentId);
          continue;
        }

        processedApartmentId.add(apartmentId);

        // CHECK DB
        const existingApartment = await Apartment.findOne({ apartmentId });

        const incomingData = {
          apartmentName, apartmentAddress, city, location,
          jioLocation, permissionStatus, rating, photo,
          apartmentSummary, contactPersonName, contactPersonPhone,
          email, startingTGValues, residencyCount, approxPeopleCount, perDayRent,
        };

        if (existingApartment) {
          // ── EXISTS → CHECK IF CHANGED ──
          if (hasDataChanged(existingApartment, incomingData, bankDetails, existingEventsHistory)) {
            await Apartment.findOneAndUpdate(
              { apartmentId },
              {
                $set: {
                  ...incomingData,
                  bankDetails,
                  existingEventsHistory,
                  lastUpdatedBySession: session._id,
                  skippedBySession: null, // Clear skipped flag on update
                },
              },
              { new: true }
            );

            updatedApartmentIds.push(apartmentId);
            updatedData.push({ apartmentId, message: "Record updated successfully" });
          } else {
            // ── NO CHANGE → MARK AS SKIPPED ──
            await Apartment.findOneAndUpdate(
              { apartmentId },
              {
                $set: {
                  skippedBySession: session._id,
                },
              }
            );

            skippedApartmentIds.push(apartmentId);
            skippedData.push({
              row: item,
              message: `ApartmentId "${apartmentId}" already exists with same data — no update needed`,
            });
          }
          continue;
        }

        // ── NEW RECORD → INSERT ──
        const newApartment = await Apartment.create({
          ...incomingData,
          apartmentId,
          updatedBy: req.user.name,
          bankDetails,
          existingEventsHistory,
          createdBySession: session._id,
          lastUpdatedBySession: session._id,
        });

        insertedApartmentIds.push(apartmentId);
        insertedData.push({
          id: newApartment._id,
          apartmentId: newApartment.apartmentId,
          message: "Record inserted successfully",
        });

      } catch (err) {
        skippedData.push({ row: item, message: err.message });
      }
    }

    // ── UPDATE SESSION WITH FINAL COUNTS ──
    await UploadSession.findByIdAndUpdate(session._id, {
      $set: {
        insertedCount: insertedData.length,
        updatedCount: updatedData.length,
        skippedCount: skippedData.length,
        insertedApartmentIds,
        updatedApartmentIds,
        skippedApartmentIds,
        skippedData,
      },
    });

    // DELETE UPLOADED FILE
    try {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (fileError) {
      console.error("Error deleting file:", fileError);
    }

    return successResponse(res, "Excel Upload Completed", {
      sessionId: session._id,
      fileName: req.file.originalname,
      totalRows: data.length,
      updatedBy: req.user.name,
      insertedCount: insertedData.length,
      updatedCount: updatedData.length,
      skippedCount: skippedData.length,
      insertedData,
      updatedData,
      skippedData,
      summary: {
        totalInserted: insertedData.length,
        totalUpdated: updatedData.length,
        totalSkipped: skippedData.length,
      },
    });

  } catch (error) {
    console.error("Main error:", error);

    try {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (fileError) {
      console.error("Error deleting file:", fileError);
    }

    return errorResponse(res, "Error Uploading File", error.message);
  }
};

// ─────────────────────────────────────────────
// 2. GET ALL UPLOAD SESSIONS
// ─────────────────────────────────────────────

const getUploadSessions = async (req, res) => {
  try {
    const pageNumber = parseInt(req.body.pageNumber) || 1;
    const count = parseInt(req.body.count) || 10;
    const skip = (pageNumber - 1) * count;

    const sessions = await UploadSession.aggregate([
      { $sort: { updatedAt: -1 } },
      { $group: { _id: "$fileName", session: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$session" } },
      { $sort: { updatedAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: count }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const totalCount = sessions[0].totalCount[0]?.count || 0;

    const formattedSessions = sessions[0].data.map((item) => ({
      sessionId: item._id,
      fileName: item.fileName,
      totalRows: item.totalRows || 0,
      insertedCount: item.insertedCount || 0,
      updatedCount: item.updatedCount || 0,
      skippedCount: item.skippedCount || 0,
      updatedAt: new Date(item.updatedAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    }));

    return successResponse(res, "Upload sessions fetched successfully", {
      pageNumber,
      count,
      totalCount,
      totalPages: Math.ceil(totalCount / count),
      sessions: formattedSessions,
    });
  } catch (error) {
    return errorResponse(res, "Error Fetching Upload Sessions", error.message);
  }
};

// ─────────────────────────────────────────────
// 3. LIST APARTMENTS
// ─────────────────────────────────────────────
const getMinMaxValues = (apartments = []) => {
  // TG VALUES
  const tgValues = apartments
    .map((apt) => Number(apt.startingTGValues || 0))
    .filter((val) => !isNaN(val));

  // RENT VALUES
  const rentValues = apartments
    .map((apt) => Number(apt.perDayRent || 0))
    .filter((val) => !isNaN(val));

  return {
    minTG:
      tgValues.length > 0
        ? Math.min(...tgValues)
        : 0,

    maxTG:
      tgValues.length > 0
        ? Math.max(...tgValues)
        : 0,

    minRent:
      rentValues.length > 0
        ? Math.min(...rentValues)
        : 0,

    maxRent:
      rentValues.length > 0
        ? Math.max(...rentValues)
        : 0,
  };
};
const listApartments = async (req, res) => {
  try {
    const pageNumber = parseInt(req.body.pageNumber) || 1;
    const count = parseInt(req.body.count) || 10;
    const skip = (pageNumber - 1) * count;
    const { sessionId } = req.body;

    let filter = ApartmentFilters(req.body);


    if (sessionId) {

      const sessionObjectId =
        new mongoose.Types.ObjectId(sessionId);

      const sessionCondition = {
        $or: [
          { createdBySession: sessionObjectId },
          { lastUpdatedBySession: sessionObjectId },
          { skippedBySession: sessionObjectId },
        ],
      };

      // IF SEARCH FILTER ALREADY HAS $or
      if (filter.$or) {

        filter = {
          $and: [
            { $or: filter.$or },
            sessionCondition,
          ],
        };

      } else {

        filter = {
          ...filter,
          ...sessionCondition,
        };
      }
    }
    // TOTAL COUNT
    const totalCount = await Apartment.countDocuments(filter);

    // APARTMENTS
    const apartments = await Apartment.find(filter)
      .populate("createdBySession", "fileName createdAt")
      .populate("lastUpdatedBySession", "fileName createdAt")
      .populate("skippedBySession", "fileName createdAt")
      .sort({ updatedAt: 1 })
      .skip(skip)
      .limit(count)
      .lean();
    // GET MIN/MAX VALUES
    const priceRange = getMinMaxValues(apartments);
    // Add status field to each apartment for clarity
    const apartmentsWithStatus = apartments.map((apt) => {
      let status = "unknown";
      if (sessionId) {
        const sid = sessionId.toString();
        if (apt.createdBySession?._id?.toString() === sid &&
          apt.lastUpdatedBySession?._id?.toString() === sid &&
          !apt.skippedBySession) {
          status = "inserted";
        } else if (apt.lastUpdatedBySession?._id?.toString() === sid &&
          apt.createdBySession?._id?.toString() !== sid) {
          status = "updated";
        } else if (apt.skippedBySession?._id?.toString() === sid) {
          status = "skipped";
        }
      }
      return {
        ...apt,  // formatted rent
        perDayRent:
          apt.perDayRent
            ? Number(
              apt.perDayRent
            ).toLocaleString(
              "en-IN"
            )
            : "0", sessionStatus: status
      };
    });

    // LOCATION & CITY for session
    let sessionFilter = {};
    if (sessionId) {
      const sessionObjectId = new mongoose.Types.ObjectId(sessionId);
      sessionFilter = {
        $or: [
          { createdBySession: sessionObjectId },
          { lastUpdatedBySession: sessionObjectId },
          { skippedBySession: sessionObjectId },
        ],
      };
    }

    const sessionApartments = await Apartment.find(sessionFilter).lean();

    const uniqueLocations = [...new Set(sessionApartments.map((a) => a.location).filter(Boolean))];
    const uniqueCities = [...new Set(sessionApartments.map((a) => a.city).filter(Boolean))];

    // SESSION DETAILS
    let latestSession = null;
    if (sessionId) {
      latestSession = await UploadSession.findById(sessionId).lean();
    } else {
      latestSession = await UploadSession.findOne().sort({ createdAt: -1 }).lean();
    }

    return successResponse(res, "Apartments fetched successfully", {
      pageNumber,
      count,
      totalCount,
      totalPages: Math.ceil(totalCount / count),
      file: {
        sessionId: latestSession?._id,
        fileName: latestSession?.fileName || "",
        totalRows: latestSession?.totalRows || 0,
        insertedCount: latestSession?.insertedCount || 0,
        updatedCount: latestSession?.updatedCount || 0,
        skippedCount: latestSession?.skippedCount || 0,
        uploadedAt: latestSession?.createdAt || null,
      },
      locationFilter: uniqueLocations,
      cityFilter: uniqueCities,
      priceRange,
      apartments: apartmentsWithStatus,
    });

  } catch (error) {
    return errorResponse(res, "Error Fetching Apartments", error.message);
  }
};

// ─────────────────────────────────────────────
// 4. GET APARTMENT BY ID
// ─────────────────────────────────────────────

const getApartmentById = async (req, res) => {
  try {
    const { apartmentId } = req.query;

    if (!apartmentId) {
      return errorResponse(res, "apartmentId is required");
    }

    const apartment = await Apartment.findById(apartmentId)
      .populate("createdBySession", "fileName createdAt")
      .populate("lastUpdatedBySession", "fileName createdAt")
      .populate("skippedBySession", "fileName createdAt")
      .lean();

    if (!apartment) {
      return errorResponse(res, "Apartment not found");
    }

    return successResponse(res, "Apartment fetched successfully", apartment);

  } catch (error) {
    return errorResponse(res, "Error fetching apartment", error.message);
  }
};


// const createOrUpdateParticularApartment = async (req, res) => {
//   try {
//     const {
//       _id,
//       apartmentName,
//       apartmentAddress,
//       city,
//       location,
//       jioLocation,
//       photo,
//       apartmentSummary,
//       contactPersonName,
//       contactPersonPhone,
//       email,
//       bankDetails,
//       permissionStatus,
//       rating,
//       residencyCount,
//       approxPeopleCount,
//       startingTGValues,
//       existingEventsHistory,
//       perDayRent,
//       updatedBy,
//     } = req.body;

//     // VALIDATION
//     if (
//       !apartmentName ||
//       !apartmentAddress ||
//       !city ||
//       !location ||
//       !apartmentSummary ||
//       !contactPersonName ||
//       !contactPersonPhone ||
//       !email
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Required fields are missing",
//       });
//     }

//     let apartment;

//     // UPDATE
//     if (_id) {
//       const existingApartment = await Apartment.findById(_id);

//       if (!existingApartment) {
//         return res.status(404).json({
//           success: false,
//           message: "Apartment not found",
//         });
//       }

//       apartment = await Apartment.findByIdAndUpdate(
//         _id,
//         {
//           apartmentName,
//           apartmentAddress,
//           city,
//           location,
//           jioLocation,
//           photo,
//           apartmentSummary,
//           contactPersonName,
//           contactPersonPhone,
//           email,
//           bankDetails,
//           permissionStatus,
//           rating,
//           residencyCount,
//           approxPeopleCount,
//           startingTGValues,
//           existingEventsHistory,
//           perDayRent,
//           updatedBy,
//         },
//         {
//           new: true,
//           runValidators: true,
//         }
//       );

//       return res.status(200).json({
//         success: true,
//         message: "Apartment updated successfully",
//         data: apartment,
//       });
//     }

//     // CREATE
//     apartment = await Apartment.create({
//       apartmentName,
//       apartmentAddress,
//       city,
//       location,
//       jioLocation,
//       photo,
//       apartmentSummary,
//       contactPersonName,
//       contactPersonPhone,
//       email,
//       bankDetails,
//       permissionStatus,
//       rating,
//       residencyCount,
//       approxPeopleCount,
//       startingTGValues,
//       existingEventsHistory,
//       perDayRent,
//       updatedBy,
//       // apartmentId will be null by default
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Apartment created successfully",
//       data: apartment,
//     });

//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
const createOrUpdateParticularApartment = async (req, res) => {
  try {
    const {
      apartmentId,
      apartmentName,
      apartmentAddress,
      city,
      location,
      jioLocation,
      photo,
      apartmentSummary,
      contactPersonName,
      contactPersonPhone,
      email,
      bankDetails,
      permissionStatus,
      rating,
      residencyCount,
      approxPeopleCount,
      startingTGValues,
      existingEventsHistory,
      perDayRent,
      updatedBy,
    } = req.body;

    // VALIDATION
    if (
      !apartmentName ||
      !apartmentAddress ||
      !city ||
      !location ||
      !apartmentSummary ||
      !contactPersonName ||
      !contactPersonPhone ||
      !email
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    const apartmentData = {
      apartmentName,
      apartmentAddress,
      city,
      location,
      jioLocation,
      photo,
      apartmentSummary,
      contactPersonName,
      contactPersonPhone,
      email,
      bankDetails,
      permissionStatus,
      rating,
      residencyCount,
      approxPeopleCount,
      startingTGValues,
      existingEventsHistory,
      perDayRent,
      updatedBy,
    };

if (apartmentId && apartmentId.toString().trim() !== "") {
  
  // Check by MongoDB _id OR apartmentId field
  const existingApartment = await Apartment.findOne({
    $or: [
      { _id: mongoose.Types.ObjectId.isValid(apartmentId) ? apartmentId : null },
      { apartmentId: apartmentId }
    ]
  });

  if (!existingApartment) {
    return res.status(404).json({
      success: false,
      message: "Apartment not found",
    });
  }

  const apartment = await Apartment.findByIdAndUpdate(
    existingApartment._id,  // always update by _id
    apartmentData,
    { new: true, runValidators: true }
  );

  return res.status(200).json({
    success: true,
    message: "Apartment updated successfully",
    data: apartment,
  });
}

    // CREATE — no apartmentId → create new record
    const apartment = await Apartment.create(apartmentData);

    return res.status(201).json({
      success: true,
      message: "Apartment created successfully",
      data: apartment,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  uploadExcel,
  getUploadSessions,
  listApartments,
  getApartmentById,
  createOrUpdateParticularApartment
};
