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

  const str = raw.toString().replace(/\n/g, " ").replace(/\r/g, " ").trim();

  let accountName = "", bankName = "", accountNumber = "";
  let ifscCode = "", phoneNumber = "", upiId = "";

  const m1 = str.match(/accountName\s*:\s*(.+?)(?=\s+bankName\s*:)/i);
  if (m1) accountName = m1[1].trim();

  const m2 = str.match(/bankName\s*:\s*(.+?)(?=\s+accountNumber\s*:)/i);
  if (m2) bankName = m2[1].trim();

  const m3 = str.match(/accountNumber\s*:\s*(.+?)(?=\s+ifscCode\s*:)/i);
  if (m3) accountNumber = m3[1].trim();

  const m4 = str.match(/ifscCode\s*:\s*(.+?)(?=\s+phoneNumber\s*:)/i);
  if (m4) ifscCode = m4[1].trim();

  const m5 = str.match(/phoneNumber\s*:\s*(.+?)(?=\s+upiId\s*:)/i);
  if (m5) phoneNumber = m5[1].trim();

  const m6 = str.match(/upiId\s*:\s*(.*)$/i);
  if (m6) upiId = m6[1].trim();

  return [{ accountName, bankName, accountNumber, ifscCode, phoneNumber, upiId }];
};


// ─────────────────────────────────────────────
// HELPER — PARSE EVENTS HISTORY
// ─────────────────────────────────────────────

const parseEventsHistory = (raw) => {

  if (!raw?.toString().trim()) return [];

  const str = raw.toString().replace(/\n/g, " ").replace(/\r/g, " ").trim();

  let eventName = "", eventDate = "", remarks = "";

  const m1 = str.match(/EventName\s*:\s*(.+?)(?=\s+EventDate\s*:)/i);
  if (m1) eventName = m1[1].trim();

  const m2 = str.match(/EventDate\s*:\s*(.+?)(?=\s+Remark\s*:|$)/i);
  if (m2) eventDate = m2[1].trim();

  const m3 = str.match(/Remark\s*:\s*(.*)$/i);
  if (m3) remarks = m3[1].trim();

  return [{ eventName, eventDate, remarks }];
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
// 3. GET APARTMENTS BY SESSION (file-wise)
// ─────────────────────────────────────────────
const getApartmentsBySession =
  async (req, res) => {
    try {

      // POST BODY
      const {
        sessionId,
        pageNumber = 1,
        count = 10,
      } = req.body;

      if (!sessionId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "sessionId is required",
          });
      }

      // VERIFY SESSION EXISTS
      const session =
        await UploadSession.findById(
          sessionId
        ).lean();

      if (!session) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Upload session not found",
          });
      }

      // PAGINATION
      const page =
        parseInt(pageNumber) || 1;

      const limit =
        parseInt(count) || 10;

      const skip =
        (page - 1) * limit;

      // ALL FILTERS
      const filter =
        ApartmentFilters(req.body);

      // SESSION FILTER
      const sessionFilter = {
        $or: [
          {
            createdBySession:
              sessionId,
          },
          {
            lastUpdatedBySession:
              sessionId,
          },
        ],
      };

      // MERGE FILTERS
      const finalFilter = {
        ...filter,
        ...sessionFilter,
      };

      // TOTAL COUNT
      const totalCount =
        await Apartment.countDocuments(
          finalFilter
        );

      // FETCH APARTMENTS
      const apartments =
        await Apartment.find(
          finalFilter
        )
          .populate(
            "createdBySession",
            "fileName createdAt"
          )
          .populate(
            "lastUpdatedBySession",
            "fileName createdAt"
          )
          .sort({
            updatedAt: 1,
          })
          .skip(skip)
          .limit(limit)
          .lean();

      // FORMAT INSERTED / UPDATED STATUS
      const formattedApartments =
        apartments.map(
          (item) => ({

            ...item,

            status:
              item.createdBySession?._id?.toString() ===
                sessionId
                ? "Inserted"
                : "Updated",

          })
        );

      // FILTER SKIPPED DATA
      let skippedData =
        (
          session.skippedData ||
          []
        ).map((item) => ({
          ...item.row,

          status: "Skipped",

          reason:
            item.reason,
        }));

      // APPLY FILTERS TO SKIPPED DATA
      if (req.body.city) {
        skippedData =
          skippedData.filter(
            (item) =>
              item.city ===
              req.body.city
          );
      }

      if (req.body.location) {
        skippedData =
          skippedData.filter(
            (item) =>
              item.location ===
              req.body.location
          );
      }

      if (req.body.apartmentName) {
        skippedData =
          skippedData.filter(
            (item) =>
              item.apartmentName
                ?.toLowerCase()
                .includes(
                  req.body.apartmentName.toLowerCase()
                )
          );
      }

      // MERGE DATA
      const allData = [
        ...formattedApartments,
        ...skippedData,
      ];
      const sessionApartments =
        await Apartment.find(
          sessionFilter
        ).lean();

      const uniqueLocations =
        [
          ...new Set(
            sessionApartments
              .map(
                (a) => a.location
              )
              .filter(Boolean)
          ),
        ];

      const uniqueCities =
        [
          ...new Set(
            sessionApartments
              .map(
                (a) => a.city
              )
              .filter(Boolean)
          ),
        ];
      return successResponse(
        res,
        "Apartments fetched by session successfully",
        {

          pageNumber: page,

          count: limit,

          totalCount,

          totalPages:
            Math.ceil(
              totalCount /
              limit
            ),
          updatedBy: req.user.name,
          sessionId,

          fileName:
            session.fileName,

          uploadedAt:
            new Date(
              session.createdAt
            ).toLocaleString(
              "en-IN",
              {
                day: "2-digit",
                month:
                  "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }
            ),

          insertedCount:
            session.insertedCount,

          updatedCount:
            session.updatedCount,

          skippedCount:
            skippedData.length,

          totalRows:
            session.totalRows,

          locationFilter:
            uniqueLocations,

          cityFilter:
            uniqueCities,

          apartments:
            allData,
        }
      );

    } catch (error) {

      return errorResponse(
        res,
        "Error Fetching Apartments by Session",
        error.message
      );

    }
  };
// ─────────────────────────────────────────────
// 4. List ALL APARTMENTS (common — all files)
// ─────────────────────────────────────────────

const listApartments = async (req, res) => {
  try {

    const pageNumber = parseInt(req.body.pageNumber) || 1;
    const count = parseInt(req.body.count) || 10;
    const skip = (pageNumber - 1) * count;

    const filter = ApartmentFilters(req.body);
    const totalCount = await Apartment.countDocuments(filter);


    const apartments = await Apartment.find(filter)
      .populate("createdBySession", "fileName createdAt")
      .populate("lastUpdatedBySession", "fileName createdAt")
      .sort({ updatedAt: 1 })
      .skip(skip)
      .limit(count)
      .lean();

    // UNIQUE LOCATIONS & CITIES FOR FILTERS
    const allApartments = await Apartment.find().lean();
    const uniqueLocations = [...new Set(allApartments.map((a) => a.location).filter(Boolean))];
    const uniqueCities = [...new Set(allApartments.map((a) => a.city).filter(Boolean))];

    // LATEST SESSION INFO
    const latestSession = await UploadSession.findOne().sort({ createdAt: -1 }).lean();
    // ADD sessionId FIELD
    const updatedApartments = apartments.map((apartment) => ({
      ...apartment,

      sessionId: apartment.createdBySession?._id || null,

      sessionId:
        apartment.lastUpdatedBySession?._id || null,
    }));
    return successResponse(res, "Apartments fetched successfully", {
      pageNumber,
      count,
      totalCount,
      totalPages: Math.ceil(totalCount / count),
      // LATEST UPLOAD FILE INFO
      latestFile: {
        fileName: latestSession?.fileName || "",
        totalRows: latestSession?.totalRows || 0,
        insertedCount: latestSession?.insertedCount || 0,
        updatedCount: latestSession?.updatedCount || 0,
        skippedCount: latestSession?.skippedCount || 0,
        uploadedAt: latestSession?.createdAt || null,
      },
      locationFilter: uniqueLocations,
      cityFilter: uniqueCities,
      apartments: updatedApartments,
    });

  } catch (error) {
    return errorResponse(res, "Error Fetching Apartments", error.message);
  }
};
// particular Apartment Get Api
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
  getApartmentsBySession,
  listApartments,
  getApartmentById,
};