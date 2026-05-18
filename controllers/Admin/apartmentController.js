const fs = require("fs");
const Apartment = require("../../models/Admin/apartment");
const UploadSession = require("../../models/Admin/uploadSession");
const readExcelFile = require("../../utils/excelHelper");
const ApartmentFilters = require("../../middleware/ApartmentFilters");
const { successResponse, errorResponse } = require("../../utils/response");


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
      regex = new RegExp(
        `${field}\\s*:\\s*(.*?)\\s*(?=${nextField}\\s*:|$)`,
        "i"
      );
    } else {
      regex = new RegExp(
        `${field}\\s*:\\s*(.*)$`,
        "i"
      );
    }

    const match = str.match(regex);

    return match?.[1]?.trim() || "";
  };

  const accountName =
    getValue("accountName", "bankName");

  const bankName =
    getValue("bankName", "accountNumber");

  const accountNumber =
    getValue("accountNumber", "ifscCode");

  const ifscCode =
    getValue("ifscCode", "phoneNumber");

  const phoneNumber =
    getValue("phoneNumber", "upiId");

  const upiId =
    getValue("upiId");

  return [{
    accountName,
    bankName,
    accountNumber,
    ifscCode,
    phoneNumber,
    upiId
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
      regex = new RegExp(
        `${field}\\s*:\\s*(.*?)\\s*(?=${nextField}\\s*:|$)`,
        "i"
      );
    } else {
      regex = new RegExp(
        `${field}\\s*:\\s*(.*)$`,
        "i"
      );
    }

    const match = str.match(regex);

    return match?.[1]?.trim() || "";
  };

  const eventName =
    getValue("EventName", "EventDate");

  const eventDate =
    getValue("EventDate", "Remark");

  const remarks =
    getValue("Remark");

  return [{
    eventName,
    eventDate,
    remarks
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

    const processedApartmentId = new Set();

    // CREATE SESSION FIRST (will update counts at end)
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
                  lastUpdatedBySession: session._id,  // ← LINK TO THIS SESSION
                },
              },
              { new: true }
            );

            updatedApartmentIds.push(apartmentId);
            updatedData.push({ apartmentId, message: "Record updated successfully" });

          } else {

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
          createdBySession: session._id,  // ← LINK TO THIS SESSION
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
        updatedBy: req.user.name,
        updatedApartmentIds,
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
// 2. GET ALL UPLOAD SESSIONS (file list)
// ─────────────────────────────────────────────
const getUploadSessions = async (req, res) => {
  try {
    const pageNumber =
      parseInt(req.body.pageNumber) || 1;

    const count =
      parseInt(req.body.count) || 10;

    const skip =
      (pageNumber - 1) * count;

    // GET LATEST UNIQUE FILE NAMES
    const sessions =
      await UploadSession.aggregate([
        {
          $sort: {
            updatedAt: -1,
          },
        },

        {
          $group: {
            _id: "$fileName",
            session: {
              $first: "$$ROOT",
            },
          },
        },

        {
          $replaceRoot: {
            newRoot: "$session",
          },
        },

        {
          $sort: {
            updatedAt: -1,
          },
        },

        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: count },
            ],

            totalCount: [
              {
                $count: "count",
              },
            ],
          },
        },
      ]);

    const totalCount =
      sessions[0].totalCount[0]
        ?.count || 0;

    const formattedSessions =
      sessions[0].data.map(
        (item) => ({
          sessionId: item._id,

          fileName: item.fileName,

          totalRows:
            item.totalRows || 0,
          insertedCount:
            item.insertedCount || 0,

          updatedCount:
            item.updatedCount || 0,

          skippedCount:
            item.skippedCount || 0,

          updatedAt: new Date(
            item.updatedAt
          ).toLocaleString(
            "en-IN",
            {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }
          ),
        })
      );

    return successResponse(
      res,
      "Upload sessions fetched successfully",
      {
        pageNumber,
        count,
        totalCount,
        updatedBy: req.user.name,
        totalPages:
          Math.ceil(
            totalCount / count
          ),

        sessions:
          formattedSessions,
      }
    );
  } catch (error) {
    return errorResponse(
      res,
      "Error Fetching Upload Sessions",
      error.message
    );
  }
};

// ─────────────────────────────────────────────
// 3. List ALL APARTMENTS (common — all files)
// ─────────────────────────────────────────────


// const listApartments = async (req, res) => {
//   try {

//     // PAGINATION
//     const pageNumber = parseInt(req.body.pageNumber) || 1;
//     const count = parseInt(req.body.count) || 10;
//     const skip = (pageNumber - 1) * count;

//     // BODY
//     const { sessionId } = req.body;

//     // SESSION DETAILS (fetch first, so we can use its linked session)
//     let latestSession = null;

//     if (sessionId) {
//       latestSession = await UploadSession.findById(sessionId).lean();
//     } else {
//       latestSession = await UploadSession.findOne()
//         .sort({ createdAt: -1 })
//         .lean();
//     }

//     // Use the actual session _id from the found session document
//     const resolvedSessionId = latestSession?._id || null;

//     // FILTER
//     let filter = ApartmentFilters(req.body);

//     // SESSION FILTER — match against the resolved session _id
//     if (resolvedSessionId) {
//       filter = {
//         ...filter,
//         $or: [
//           { createdBySession: resolvedSessionId },
//           { lastUpdatedBySession: resolvedSessionId },
//         ],
//       };
//     }

//     // TOTAL COUNT
//     const totalCount = await Apartment.countDocuments(filter);

//     // APARTMENTS
//     const apartments = await Apartment.find(filter)
//       .populate("createdBySession", "fileName createdAt")
//       .populate("lastUpdatedBySession", "fileName createdAt")
//       .sort({ updatedAt: -1 })
//       .skip(skip)
//       .limit(count)
//       .lean();

//     // LOCATION & CITY — also use resolvedSessionId
//     let sessionFilter = {};

//     if (resolvedSessionId) {
//       sessionFilter = {
//         $or: [
//           { createdBySession: resolvedSessionId },
//           { lastUpdatedBySession: resolvedSessionId },
//           { skippedBySession: resolvedSessionId },
//         ],
//       };
//     }

//     const sessionApartments = await Apartment.find(sessionFilter).lean();

//     const uniqueLocations = [
//       ...new Set(sessionApartments.map((a) => a.location).filter(Boolean)),
//     ];

//     const uniqueCities = [
//       ...new Set(sessionApartments.map((a) => a.city).filter(Boolean)),
//     ];

//     // RESPONSE
//     return successResponse(res, "Apartments fetched successfully", {
//       pageNumber,
//       count,
//       totalCount,
//       totalPages: Math.ceil(totalCount / count),
//       File: {
//         sessionId: latestSession?._id || null,
//         fileName: latestSession?.fileName || "",
//         totalRows: latestSession?.totalRows || 0,
//         insertedCount: latestSession?.insertedCount || 0,
//         updatedCount: latestSession?.updatedCount || 0,
//         skippedCount: latestSession?.skippedCount || 0,
//         uploadedAt: latestSession?.createdAt || null,
//       },
//       locationFilter: uniqueLocations,
//       cityFilter: uniqueCities,
//       apartments,
//     });

//   } catch (error) {
//     return errorResponse(res, "Error Fetching Apartments", error.message);
//   }
// };
// const listApartments = async (req, res) => {
//   try {

//     // PAGINATION
//     const pageNumber = parseInt(req.body.pageNumber) || 1;
//     const count = parseInt(req.body.count) || 10;
//     const skip = (pageNumber - 1) * count;

//     // BODY
//     const { sessionId } = req.body;

//     // SESSION DETAILS (fetch first, so we can use its linked session)
//     let latestSession = null;

//     if (sessionId) {
//       latestSession = await UploadSession.findById(sessionId).lean();
//     } else {
//       latestSession = await UploadSession.findOne()
//         .sort({ createdAt: -1 })
//         .lean();
//     }

//     // Use the actual session _id from the found session document
//     const resolvedSessionId = latestSession?._id || null;

//     // FILTER
//     let filter = ApartmentFilters(req.body);

//     // SESSION FILTER — match against the resolved session _id
//     if (resolvedSessionId) {
//       filter = {
//         ...filter,
//         $or: [
//           { createdBySession: resolvedSessionId },
//           { lastUpdatedBySession: resolvedSessionId },
//         ],
//       };
//     }

//     // TOTAL COUNT - For apartments that exist in database
//     const totalExistingApartments = await Apartment.countDocuments(filter);

//     // For response totalCount, use session's totalRows if session exists, otherwise use existing count
//     const totalCount = latestSession ? latestSession.totalRows : totalExistingApartments;

//     // APARTMENTS
//     const apartments = await Apartment.find(filter)
//       .populate("createdBySession", "fileName createdAt")
//       .populate("lastUpdatedBySession", "fileName createdAt")
//       .sort({ updatedAt: -1 })
//       .skip(skip)
//       .limit(count)
//       .lean();

//     // LOCATION & CITY — also use resolvedSessionId
//     let sessionFilter = {};

//     if (resolvedSessionId) {
//       sessionFilter = {
//         $or: [
//           { createdBySession: resolvedSessionId },
//           { lastUpdatedBySession: resolvedSessionId },
//           { skippedBySession: resolvedSessionId },
//         ],
//       };
//     }

//     const sessionApartments = await Apartment.find(sessionFilter).lean();

//     const uniqueLocations = [
//       ...new Set(sessionApartments.map((a) => a.location).filter(Boolean)),
//     ];

//     const uniqueCities = [
//       ...new Set(sessionApartments.map((a) => a.city).filter(Boolean)),
//     ];

//     // Calculate total pages based on totalCount (which is now session.totalRows)
//     const totalPages = latestSession ? Math.ceil(latestSession.totalRows / count) : Math.ceil(totalExistingApartments / count);

//     // RESPONSE
//     return successResponse(res, "Apartments fetched successfully", {
//       pageNumber,
//       count,
//       totalCount, // This will show 4 when session exists
//       totalPages,
//       File: {
//         sessionId: latestSession?._id || null,
//         fileName: latestSession?.fileName || "",
//         totalRows: latestSession?.totalRows || 0,
//         insertedCount: latestSession?.insertedCount || 0,
//         updatedCount: latestSession?.updatedCount || 0,
//         skippedCount: latestSession?.skippedCount || 0,
//         uploadedAt: latestSession?.createdAt || null,
//       },
//       locationFilter: uniqueLocations,
//       cityFilter: uniqueCities,
//       apartments, // This will still only show 2 apartments (the updated ones)
//     });

//   } catch (error) {
//     return errorResponse(res, "Error Fetching Apartments", error.message);
//   }
// };
const listApartments = async (req, res) => {
  try {
    const pageNumber = parseInt(req.body.pageNumber) || 1;
    const count = parseInt(req.body.count) || 10;
    const skip = (pageNumber - 1) * count;
    const { sessionId } = req.body;

    let latestSession = null;
    if (sessionId) {
      latestSession = await UploadSession.findById(sessionId).lean();
    } else {
      latestSession = await UploadSession.findOne().sort({ createdAt: -1 }).lean();
    }

    const resolvedSessionId = latestSession?._id || null;
    let filter = ApartmentFilters(req.body);

    if (resolvedSessionId) {
      filter = {
        ...filter,
        $or: [
          { createdBySession: resolvedSessionId },
          { lastUpdatedBySession: resolvedSessionId },
          { skippedBySession: resolvedSessionId } // Include skipped records
        ],
      };
    }

    // This will now count ALL records (including skipped ones)
    const totalCount = await Apartment.countDocuments(filter);
    
    const apartments = await Apartment.find(filter)
      .populate("createdBySession", "fileName createdAt")
      .populate("lastUpdatedBySession", "fileName createdAt")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(count)
      .lean();

    // Location & city filters (excluding skipped records if needed)
    const sessionFilter = resolvedSessionId ? {
      $or: [
        { createdBySession: resolvedSessionId },
        { lastUpdatedBySession: resolvedSessionId },
      ],
    } : {};

    const sessionApartments = await Apartment.find(sessionFilter).lean();

    const uniqueLocations = [...new Set(sessionApartments.map(a => a.location).filter(Boolean))];
    const uniqueCities = [...new Set(sessionApartments.map(a => a.city).filter(Boolean))];

    return successResponse(res, "Apartments fetched successfully", {
      pageNumber,
      count,
      totalCount: latestSession?.totalRows || totalCount, // This will be 4
      totalPages: Math.ceil((latestSession?.totalRows || totalCount) / count),
      File: {
        sessionId: latestSession?._id || null,
        fileName: latestSession?.fileName || "",
        totalRows: latestSession?.totalRows || 0,
        insertedCount: latestSession?.insertedCount || 0,
        updatedCount: latestSession?.updatedCount || 0,
        skippedCount: latestSession?.skippedCount || 0,
        uploadedAt: latestSession?.createdAt || null,
      },
      locationFilter: uniqueLocations,
      cityFilter: uniqueCities,
      apartments, // Now includes both updated and skipped records
    });

  } catch (error) {
    return errorResponse(res, "Error Fetching Apartments", error.message);
  }
};
// 4. particular Apartment Get Api
const getApartmentById =
  async (req, res) => {
    try {

      // GET ID FROM PARAMS
      const { apartmentId } =
        req.query;

      // VALIDATION
      if (!apartmentId) {
        return errorResponse(
          res,
          "apartmentId is required"
        );
      }

      // FIND APARTMENT
      const apartment =
        await Apartment.findById(
          apartmentId
        )
          .populate(
            "createdBySession",
            "fileName createdAt"
          )
          .populate(
            "lastUpdatedBySession",
            "fileName createdAt"
          )
          .lean();

      // NOT FOUND
      if (!apartment) {
        return errorResponse(
          res,
          "Apartment not found"
        );
      }

      return successResponse(
        res,
        "Apartment fetched successfully",
        apartment
      );

    } catch (error) {

      return errorResponse(
        res,
        "Error fetching apartment",
        error.message
      );

    }
  };
module.exports = {
  uploadExcel,
  getUploadSessions,
  listApartments,
  getApartmentById,
};