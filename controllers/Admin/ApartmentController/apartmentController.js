const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Apartment = require("../../../models/Admin/ApartmentSchema/apartment");
const orderSchema = require("../../../models/Admin/OrderSchema/eventOrderSchema");
const UploadSession = require("../../../models/Admin/ApartmentSchema/uploadSession");
const readExcelFile = require("../../../utils/excelHelper");
const ApartmentFilters = require("../../../middleware/ApartmentFilters");
const { successResponse, errorResponse } = require("../../../utils/response");
const {
  getFileUrl,
  getFileBuffer,
  STORAGE_TYPE,
} = require("../../../middleware/excelUploadMiddleware");
// ─────────────────────────────────────────────
// HELPER — PARSE BANK DETAILS
// ─────────────────────────────────────────────
const parseBankDetails = (item) => ({
  AccountHolderName: item.AccountHolderName?.toString().trim() || "",
  BankName: item.BankName?.toString().trim() || "",
  AccountNumber: item.AccountNumber?.toString().trim() || "",
  IfscCode: item.IfscCode?.toString().trim() || "",
  PhoneNumber: item.PhoneNumber?.toString().trim() || "",
  UpiID: item.UpiID?.toString().trim() || "",
});

// ── HELPER: detect if anything changed between existing doc and incoming row ──
const hasDataChanged = (existing, incoming, bankDetails) => {
  // Scalar fields
  const scalarFields = [
    "ApartmentName",
    "ApartmentGroupName",
    "City",
    "State",
    "Location",
    "GeoLocation",
    "PermissionStatus",
    "Rating",
    "ContactPersonName",
    "ContactPersonPhone",
    "FromTGValues",
    "ToTGValues",
    "ResidencyCount",
    "ApproxPeopleCount",
    "PerDayRent",
  ];
  for (const field of scalarFields) {
    if (String(existing[field] ?? "") !== String(incoming[field] ?? ""))
      return true;
  }

  // bankDetails sub-fields
  const bankFields = [
    "AccountHolderName",
    "BankName",
    "AccountNumber",
    "IfscCode",
    "PhoneNumber",
    "UpiID",
  ];
  for (const field of bankFields) {
    if (
      String(existing.bankDetails?.[field] ?? "") !==
      String(bankDetails[field] ?? "")
    )
      return true;
  }

  return false;
};

const uploadExcel = async (req, res) => {
  try {
    // ── GET FILE URL & BUFFER ─────────────────────────────────────────────────
    const fileUrl = getFileUrl(req, req.file);
    const fileBuffer = await getFileBuffer(req.file);
    const data = readExcelFile(fileBuffer);
    if (!req.file) {
      return errorResponse(res, "Please upload an Excel file", null, 400);
    }
    if (!data || data.length === 0) {
      return errorResponse(res, "Excel file is empty", null, 400);
    }

    const requiredHeaders = ["ApartmentName", "ApartmentGroupName"];

    const excelHeaders = Object.keys(data[0] || {});

    const missingHeaders = requiredHeaders.filter(
      (header) => !excelHeaders.includes(header),
    );

    if (missingHeaders.length > 0) {
      return errorResponse(res, `Invalid Excel format`, null, 400);
    }
    // ── LOCAL ONLY: verify file was saved to disk ─────────────────────────────
    if (
      STORAGE_TYPE === "local" &&
      req.file.path &&
      !fs.existsSync(req.file.path)
    ) {
      return errorResponse(
        res,
        "File upload failed - file not saved properly",
        null,
        400,
      );
    }

    const insertedData = [];
    const updatedData = [];
    const skippedData = [];
    const insertedApartmentIds = [];
    const updatedApartmentIds = [];
    const skippedApartmentIds = [];

    // ── CREATE SESSION ────────────────────────────────────────────────────────
    const session = await UploadSession.create({
      fileName: req.file.originalname,
      fileUrl,
      totalRows: data.length,
    });

    // ── HELPER: escape special regex characters ───────────────────────────────
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // ── LOOP ROWS ─────────────────────────────────────────────────────────────
    for (const item of data) {
      try {
        // ── PARSE FIELDS ──────────────────────────────────────────────────────
        const ApartmentName = item.ApartmentName?.toString().trim();
        const ApartmentGroupName = item.ApartmentGroupName?.toString().trim();
        const City = item.City?.toString().trim();
        const State = item.State?.toString().trim();
        const Location = item.Location?.toString().trim();
        const GeoLocation = item.GeoLocation?.toString().trim() || "";
        const PermissionStatus = item.PermissionStatus?.toString().trim() || "";
        const Rating = item.Rating?.toString().trim() || "";

        const ContactPersonPhone = item.ContactPersonPhone?.toString().trim();
        const ContactPersonName =
          item.ContactPersonName?.toString().trim() || "";

        const ResidencyCount = Number(item.ResidencyCount);
        const ApproxPeopleCount = Number(item.ApproxPeopleCount || 0);
        const PerDayRent = Number(item.PerDayRent);

        // ✅ Safely parse startingTGValues — handles "50000 - 3999", "50000", "", null
        const FromTGValues = (() => {
          const raw = item.FromTGValues?.toString().trim() || "0";
          const parsed = parseFloat(raw.replace(/[^0-9.]/g, ""));
          return isNaN(parsed) ? 0 : parsed;
        })();
        const ToTGValues = (() => {
          const raw = item.ToTGValues?.toString().trim() || "0";
          const parsed = parseFloat(raw.replace(/[^0-9.]/g, ""));
          return isNaN(parsed) ? 0 : parsed;
        })();

        const bankDetails = parseBankDetails(item);
        // const existingEventsHistory = parseEventsHistory(item.existingEventsHistory);

        // ── REQUIRED FIELD VALIDATION ──────────────────────────────────────────
        if (
          !ApartmentName ||
          !City ||
          !Location ||
          !ContactPersonPhone ||
          isNaN(ResidencyCount) ||
          isNaN(PerDayRent)
        ) {
          skippedData.push({ row: item, message: "Missing required fields" });
          continue;
        }

        const incomingData = {
          ApartmentName,
          ApartmentGroupName,
          City,
          State,
          Location,
          GeoLocation,
          PermissionStatus,
          Rating,
          ContactPersonName,
          ContactPersonPhone,
          FromTGValues,
          ToTGValues,
          ResidencyCount,
          ApproxPeopleCount,
          PerDayRent,
        };

        let existingApartment = null;
        let matchedBy = null;

        if (!existingApartment) {
          existingApartment = await Apartment.findOne({
            ApartmentName: {
              $regex: new RegExp(`^${escapeRegex(ApartmentName)}$`, "i"),
            },
            // City:          { $regex: new RegExp(`^${escapeRegex(City)}$`,          "i") },
            // State:         { $regex: new RegExp(`^${escapeRegex(State)}$`,         "i") },
            // Location:      { $regex: new RegExp(`^${escapeRegex(Location)}$`,      "i") },
            ContactPersonPhone,
          });
          if (existingApartment) {
            matchedBy = "name+City+State+Location";
          }
        }

        if (existingApartment) {
          if (
            hasDataChanged(
              existingApartment,
              incomingData,
              bankDetails,
              // existingEventsHistory
            )
          ) {
            // ── MATCH FOUND + DATA CHANGED → UPDATE ───────────────────────────
            // apartmentId is intentionally excluded — it never changes
            await Apartment.findOneAndUpdate(
              { _id: existingApartment._id },
              {
                $set: {
                  ApartmentName,
                  ApartmentGroupName,
                  City,
                  State,
                  Location,
                  GeoLocation,
                  PermissionStatus,
                  Rating,
                  ContactPersonPhone,
                  ContactPersonName,
                  FromTGValues,
                  ToTGValues,
                  ResidencyCount,
                  ApproxPeopleCount,
                  PerDayRent,
                  // bankDetails,
                  "bankDetails.AccountHolderName":
                    bankDetails.AccountHolderName,
                  "bankDetails.BankName": bankDetails.BankName,
                  "bankDetails.AccountNumber": bankDetails.AccountNumber,
                  "bankDetails.IfscCode": bankDetails.IfscCode,
                  "bankDetails.PhoneNumber": bankDetails.PhoneNumber,
                  "bankDetails.UpiID": bankDetails.UpiID,
                  // existingEventsHistory,
                  updatedBy: req.user.name,
                  lastUpdatedBySession: session._id,
                  skippedBySession: null,
                  // ✅ apartmentId intentionally NOT here — never overwrite
                },
              },
              { new: true },
            );

            updatedApartmentIds.push(existingApartment.apartmentId);
            updatedData.push({
              apartmentId: existingApartment.apartmentId,
              matchedBy,
              message: "Record updated successfully",
            });
          } else {
            // ── MATCH FOUND + NOTHING CHANGED → SKIP ─────────────────────────
            await Apartment.findOneAndUpdate(
              { _id: existingApartment._id },
              { $set: { skippedBySession: session._id } },
            );

            skippedApartmentIds.push(existingApartment.apartmentId);
            skippedData.push({
              row: item,
              message: `ApartmentId "${existingApartment.apartmentId}" already exists with same data — no update needed`,
            });
          }

          continue; // ← never fall through to insert
        }

        // ── STEP 3: NO MATCH AT ALL → INSERT NEW RECORD ───────────────────────
        // apartmentId auto-generated by pre-save hook as DDMMYYYY#N
        const newApartment = await Apartment.create({
          ...incomingData,
          updatedBy: req.user.name,
          bankDetails,
          // existingEventsHistory,
          createdBySession: session._id,
          lastUpdatedBySession: session._id,
        });

        insertedApartmentIds.push(newApartment.apartmentId);
        insertedData.push({
          id: newApartment._id,
          apartmentId: newApartment.apartmentId,
          message: "Record inserted successfully",
        });
      } catch (err) {
        skippedData.push({ row: item, message: err.message });
      }
    }

    // ── UPDATE SESSION WITH FINAL COUNTS ──────────────────────────────────────
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

    return successResponse(
      res,
      "Excel Upload Completed",
      {
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
      },
      201,
    );
  } catch (error) {
    // Cleanup local file on hard failure
    if (STORAGE_TYPE === "local" && req.file?.path) {
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch (fileError) {
        console.error("Error deleting file on failure:", fileError);
      }
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
    .map((apt) => Number(apt.FromTGValues || 0))
    .filter((val) => !isNaN(val));

  const tgValuesmax = apartments
    .map((apt) => Number(apt.ToTGValues || 0))
    .filter((val) => !isNaN(val));

  // RENT VALUES
  const rentValues = apartments
    .map((apt) => Number(apt.PerDayRent || 0))
    .filter((val) => !isNaN(val));

  return {
    minTG: tgValues.length > 0 ? Math.min(...tgValues) : 0,

    maxTG: tgValuesmax.length > 0 ? Math.max(...tgValuesmax) : 0,

    minRent: rentValues.length > 0 ? Math.min(...rentValues) : 0,

    maxRent: rentValues.length > 0 ? Math.max(...rentValues) : 0,
  };
};
// ─────────────────────────────────────────────
// 4. GET APARTMENT BY ID
// ─────────────────────────────────────────────
const listApartments = async (req, res) => {
  try {
    const pageNumber = parseInt(req.body.pageNumber) || 1;
    const count = parseInt(req.body.count) || 10;
    const skip = (pageNumber - 1) * count;
    const { sessionId } = req.body;

    // ── GET userType FROM AUTHENTICATED USER ──
    const userType = req.user?.userType; // 1, 2 → all; 3 → only isActive: true

    // ── BUILD MAIN FILTER (passes userType for isActive scoping) ──
    let filter = ApartmentFilters(req.body, userType);

    let priceRangeFilter = {};

    if (sessionId) {
      const sessionObjectId = new mongoose.Types.ObjectId(sessionId);

      const sessionCondition = {
        $or: [
          { createdBySession: sessionObjectId },
          { lastUpdatedBySession: sessionObjectId },
          { skippedBySession: sessionObjectId },
        ],
      };

      // Merge session condition into main filter
      if (filter.$or) {
        filter = {
          $and: [{ $or: filter.$or }, sessionCondition],
        };
      } else {
        filter = { ...filter, ...sessionCondition };
      }

      // priceRangeFilter scoped to session
      priceRangeFilter = sessionCondition;
    }

    // ── APPLY isActive SCOPE TO priceRangeFilter FOR userType 3 ──
    if (userType === 3) {
      priceRangeFilter = { ...priceRangeFilter, isActive: true };
    }

    // TOTAL COUNT
    const totalCount = await Apartment.countDocuments(filter);

    // APARTMENTS (filtered)
    const apartments = await Apartment.find(filter)
      .populate("createdBySession", "fileName createdAt")
      .populate("lastUpdatedBySession", "fileName createdAt")
      .populate("skippedBySession", "fileName createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(count)
      .lean();

    // ── PRICE RANGE: fetched WITHOUT price filters, but WITH isActive scope for userType 3 ──
    const allApartmentsForRange = await Apartment.find(priceRangeFilter)
      .select("FromTGValues ToTGValues PerDayRent")
      .lean();
    const priceRange = getMinMaxValues(allApartmentsForRange);

    // Add status field to each apartment
    const apartmentsWithStatus = apartments.map((apt) => {
      const properApartmentName = apt.ApartmentName
        ? apt.ApartmentName.toLowerCase().replace(/\b\w/g, (char) =>
            char.toUpperCase(),
          )
        : "";
      let status = "unknown";
      if (sessionId) {
        const sid = sessionId.toString();
        if (
          apt.createdBySession?._id?.toString() === sid &&
          apt.lastUpdatedBySession?._id?.toString() === sid &&
          !apt.skippedBySession
        ) {
          status = "inserted";
        } else if (
          apt.lastUpdatedBySession?._id?.toString() === sid &&
          apt.createdBySession?._id?.toString() !== sid
        ) {
          status = "updated";
        } else if (apt.skippedBySession?._id?.toString() === sid) {
          status = "skipped";
        }
      }
      return {
        ...apt,
        ApartmentName: properApartmentName,
        // PerDayRent: apt.PerDayRent
        //   ? Number(apt.PerDayRent).toLocaleString("en-IN")
        //   : "0",
        sessionStatus: status,
        isActive: apt.isActive ? "Active" : "Inactive",
      };
    });

    // ── LOCATION & CITY FILTER: scoped by session + isActive for userType 3 ──
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

    // Apply isActive scope for userType 3 on locationFilter/cityFilter query
    if (userType === 3) {
      sessionFilter = { ...sessionFilter, isActive: true };
    }

    const sessionApartments = await Apartment.find(sessionFilter).lean();

    const uniqueLocations = [
      ...new Set(sessionApartments.map((a) => a.Location).filter(Boolean)),
    ];
    const uniqueCities = [
      ...new Set(sessionApartments.map((a) => a.City).filter(Boolean)),
    ];
    const uniqueStates = [
      ...new Set(sessionApartments.map((a) => a.State).filter(Boolean)),
    ];
    const uniqueApartmentGroupName = [
      ...new Set(
        sessionApartments.map((a) => a.ApartmentGroupName).filter(Boolean),
      ),
    ];

    // SESSION DETAILS
    let latestSession = null;
    if (sessionId) {
      latestSession = await UploadSession.findById(sessionId).lean();
    } else {
      latestSession = await UploadSession.findOne()
        .sort({ createdAt: -1 })
        .lean();
    }

    return successResponse(
      res,
      "Apartments fetched successfully",
      {
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
        stateFilter: uniqueStates,
        apartmentGroupNameFilter: uniqueApartmentGroupName,
        priceRange,
        apartments: apartmentsWithStatus,
      },
      200,
    );
  } catch (error) {
    return errorResponse(res, "Error Fetching Apartments", error.message, 500);
  }
};
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

    // Find all orders for this apartment
    const orders = await orderSchema
      .find({
        apartmentId: apartmentId,
        // Add any additional conditions if needed, e.g.:
        // status: "active"
      })
      .select("eventDetails daysOfEvent fromDate toDate")
      .lean();

    // Extract order details
    const orderDetails = orders.map((order) => ({
      eventDetails: order.eventDetails,
      daysOfEvent: order.daysOfEvent,
      fromDate: order.fromDate,
      toDate: order.toDate,
    }));

    const responseData = {
      apartment: apartment,
      apartmentHistory: orderDetails,
      // If you want to include summary information
      totalOrders: orders.length,
    };

    return successResponse(
      res,
      "Apartment fetched successfully",
      responseData,
      200,
    );
  } catch (error) {
    return errorResponse(res, "Error fetching apartment", error.message, 500);
  }
};

// const createOrUpdateParticularApartment = async (req, res) => {

//     const {
//       apartmentId,
//       ApartmentName,
//       ApartmentGroupName,
//       City,
//       State,
//       Location,
//       GeoLocation,
//       photo,
//       ContactPersonPhone,
//       ContactPersonName,
//       PermissionStatus,
//       Rating,
//       ResidencyCount,
//       ApproxPeopleCount,
//       FromTGValues,
//       ToTGValues,
//       PerDayRent,

//       // ✅ flat individual bank fields from req.body
//       AccountHolderName,
//       BankName,
//       AccountNumber,
//       IfscCode,
//       PhoneNumber,
//       UpiID,
//       isActive,
//     } = req.body;
// try {
//     // =====================================================
//     // VALIDATION
//     // =====================================================
//     if (!ApartmentName || !City || !State || !Location || !ContactPersonPhone) {
//       return res.status(400).json({
//         success: false,
//         message: "Required fields are missing",
//       });
//     }

//     // ✅ Build bankDetails object from flat fields
//     const bankDetails = {
//       AccountHolderName: AccountHolderName ?? "",
//       BankName: BankName ?? "",
//       AccountNumber: AccountNumber ?? "",
//       IfscCode: IfscCode ?? "",
//       PhoneNumber: PhoneNumber ?? "",
//       UpiID: UpiID ?? "",
//     };

//     // =====================================================
//     // COMMON DATA
//     // =====================================================
//     const apartmentData = {
//       ApartmentName,
//       ApartmentGroupName,
//       City,
//       State,
//       Location,
//       GeoLocation,
//       photo,
//       ContactPersonPhone,
//       ContactPersonName,
//       PermissionStatus,
//       Rating,
//       ResidencyCount,
//       ApproxPeopleCount,
//       FromTGValues,
//       ToTGValues,
//       PerDayRent,
//       updatedBy: req.user.name,
//       isActive: isActive ?? true,
//     };

//     // =====================================================
//     // ADD apartmentId ONLY IF VALID
//     // =====================================================
//     const isValidApartmentId =
//       apartmentId &&
//       apartmentId !== null &&
//       apartmentId !== "" &&
//       apartmentId !== "null" &&
//       apartmentId !== "undefined";

//     if (isValidApartmentId) {
//       apartmentData.apartmentId = apartmentId;
//     }

//     if (
//       apartmentData.apartmentId === undefined ||
//       apartmentData.apartmentId === null ||
//       apartmentData.apartmentId === ""
//     ) {
//       delete apartmentData.apartmentId;
//     }

//     // =====================================================
//     // UPDATE
//     // =====================================================
//     if (isValidApartmentId) {
//       let query;

//       if (mongoose.Types.ObjectId.isValid(apartmentId)) {
//         query = {
//           $or: [{ _id: apartmentId }, { apartmentId: apartmentId }],
//         };
//       } else {
//         query = { apartmentId: apartmentId };
//       }

//       const existingApartment = await Apartment.findOne(query);

//       if (!existingApartment) {
//         return res.status(404).json({
//           success: false,
//           message: "Invalid apartmentId",
//         });
//       }

//       // ✅ dot-notation stores flat fields into bankDetails object
//       const updatedApartment = await Apartment.findByIdAndUpdate(
//         existingApartment._id,
//         {
//           $set: {
//             ...apartmentData,
//             "bankDetails.AccountHolderName": bankDetails.AccountHolderName,
//             "bankDetails.BankName": bankDetails.BankName,
//             "bankDetails.AccountNumber": bankDetails.AccountNumber,
//             "bankDetails.IfscCode": bankDetails.IfscCode,
//             "bankDetails.PhoneNumber": bankDetails.PhoneNumber,
//             "bankDetails.UpiID": bankDetails.UpiID,
//           },
//         },
//         { new: true, runValidators: true },
//       );

//       return res.status(200).json({
//         success: true,
//         message: "Apartment updated successfully",
//         data: updatedApartment,
//       });
//     }

//     // =====================================================
//     // CREATE NEW
//     // =====================================================

//     // ✅ attach the built bankDetails object on create
//     apartmentData.bankDetails = bankDetails;

//     const newApartment = await Apartment.create(apartmentData);

//     return successResponse(
//       res,
//       "Apartments fetched successfully",
//       newApartment,
//       201,
//     );
//   } catch (error) {
//     if (error.code === 11000) {
//       return errorResponse(res, "Apartment ID already exists", 400);
//     }

//     return errorResponse(res, error.message, 500);
//   }
// };
const createOrUpdateParticularApartment = async (req, res) => {
  const {
    id, // Changed from apartmentId to _id
    ApartmentName,
    ApartmentGroupName,
    City,
    State,
    Location,
    GeoLocation,
    photo,
    ContactPersonPhone,
    ContactPersonName,
    PermissionStatus,
    Rating,
    ResidencyCount,
    ApproxPeopleCount,
    FromTGValues,
    ToTGValues,
    PerDayRent,

    // ✅ flat individual bank fields from req.body
    AccountHolderName,
    BankName,
    AccountNumber,
    IfscCode,
    PhoneNumber,
    UpiID,
    isActive,
  } = req.body;

  try {
    // =====================================================
    // VALIDATION
    // =====================================================
    if (!ApartmentName || !City || !State || !Location || !ContactPersonPhone) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    // ✅ Build bankDetails object from flat fields
    const bankDetails = {
      AccountHolderName: AccountHolderName ?? "",
      BankName: BankName ?? "",
      AccountNumber: AccountNumber ?? "",
      IfscCode: IfscCode ?? "",
      PhoneNumber: PhoneNumber ?? "",
      UpiID: UpiID ?? "",
    };

    // =====================================================
    // COMMON DATA
    // =====================================================
    const apartmentData = {
      ApartmentName,
      ApartmentGroupName,
      City,
      State,
      Location,
      GeoLocation,
      photo,
      ContactPersonPhone,
      ContactPersonName,
      PermissionStatus,
      Rating,
      ResidencyCount,
      ApproxPeopleCount,
      FromTGValues,
      ToTGValues,
      PerDayRent,
      updatedBy: req.user.name,
      isActive: isActive ?? true,
    };

    // =====================================================
    // UPDATE by _id ONLY
    // =====================================================
    const isValidId = id && mongoose.Types.ObjectId.isValid(id);

    if (isValidId) {
      // Find existing apartment by _id
      const existingApartment = await Apartment.findById(id);

      if (!existingApartment) {
        return res.status(404).json({
          success: false,
          message: "Apartment not found with the provided id",
        });
      }

      // ✅ Update using findByIdAndUpdate
      const updatedApartment = await Apartment.findByIdAndUpdate(
        id,
        {
          $set: {
            ...apartmentData,
            "bankDetails.AccountHolderName": bankDetails.AccountHolderName,
            "bankDetails.BankName": bankDetails.BankName,
            "bankDetails.AccountNumber": bankDetails.AccountNumber,
            "bankDetails.IfscCode": bankDetails.IfscCode,
            "bankDetails.PhoneNumber": bankDetails.PhoneNumber,
            "bankDetails.UpiID": bankDetails.UpiID,
          },
        },
        { new: true, runValidators: true },
      );

      return res.status(200).json({
        success: true,
        message: "Apartment updated successfully",
        data: updatedApartment,
      });
    }

    // =====================================================
    // CREATE NEW
    // =====================================================

    // ✅ Check if apartment with same name already exists (optional but recommended)
    const existingApartmentByName = await Apartment.findOne({
      ApartmentName: ApartmentName,
    });

    if (existingApartmentByName) {
      return res.status(400).json({
        success: false,
        message: `Apartment with name "${ApartmentName}" already exists. Please use a different name or provide _id to update.`,
      });
    }

    // ✅ attach the built bankDetails object on create
    apartmentData.bankDetails = bankDetails;

    const newApartment = await Apartment.create(apartmentData);

    return successResponse(
      res,
      "Apartment created successfully",
      newApartment,
      201,
    );
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, "Apartment name already exists", 400);
    }

    return errorResponse(res, error.message, 500);
  }
};
const updateApartmentStatus = async (req, res) => {
  try {
    const { apartmentId, isActive } = req.body;

    if (!apartmentId) {
      return errorResponse(res, "Apartment ID is required", 400);
    }
    if (!mongoose.Types.ObjectId.isValid(apartmentId)) {
      return errorResponse(res, "Invalid Apartment ID", 400);
    }
    const apartment = await Apartment.findByIdAndUpdate(
      apartmentId,
      {
        $set: {
          isActive,
        },
      },
      {
        new: true,
      },
    );

    if (!apartment) {
      return errorResponse(res, "Apartment not found", 400);
    }

    return successResponse(
      res,
      isActive
        ? "Apartment activated successfully"
        : "Apartment deactivated successfully",
      apartment,
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
module.exports = {
  uploadExcel,
  getUploadSessions,
  listApartments,
  getApartmentById,
  createOrUpdateParticularApartment,
  updateApartmentStatus,
};
