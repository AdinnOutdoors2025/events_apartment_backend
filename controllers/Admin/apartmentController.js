const fs = require("fs");
const Apartment = require("../../models/Admin/apartment");
const readExcelFile = require("../../utils/excelHelper");
const ApartmentFilters = require("../../middleware/ApartmentFilters");
const {
  successResponse,
  errorResponse,
} = require("../../utils/response");

// UPLOAD EXCEL
const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload excel file",
      });
    }
    const data =
      readExcelFile(req.file.path);
    const insertedData = [];
    const updatedData = [];
    const skippedData = [];
    // TRACK DUPLICATES INSIDE EXCEL
    const processedEmails = new Set();
    const processedPhones = new Set();
    // LOOP EXCEL DATA
    for (const item of data) {
      try {
        // CLEAN DATA

        const apartmentName =
          item.apartmentName?.toString().trim();

        const apartmentAddress =
          item.apartmentAddress?.toString().trim();

        const city =
          item.city?.toString().trim();

        const location =
          item.location?.toString().trim();

        const jioLocation =
          item.jioLocation?.toString().trim();

        const permissionStatus =
          item.permissionStatus?.toString().trim();

        const rating =
          item.rating?.toString().trim();

        const photo =
          item.photo?.toString().trim();

        const apartmentSummary =
          item.apartmentSummary?.toString().trim();

        const contactPersonName =
          item.contactPersonName?.toString().trim();

        const contactPersonPhone =
          item.contactPersonPhone?.toString().trim();

        const email =
          item.email?.toString().trim().toLowerCase();

        const startingTGValues =
          Number(item.startingTGValues || 0);

        const residencyCount =
          Number(item.residencyCount);

        const approxPeopleCount =
          Number(item.approxPeopleCount || 0);

        const perDayRent =
          Number(item.perDayRent);
        // BANK DETAILS
        let bankDetails = [];

        if (item.bankDetails?.toString().trim()) {

          const rawData = item.bankDetails
            .toString()
            .replace(/\n/g, " ")
            .replace(/\r/g, " ")
            .trim();

          let accountName = "";
          let bankName = "";
          let accountNumber = "";
          let ifscCode = "";
          let phoneNumber = "";
          let upiId = "";

          // Extract accountName
          const accountNameRegex =
            /accountName\s*:\s*(.+?)(?=\s+bankName\s*:)/i;

          const accountNameMatch =
            rawData.match(accountNameRegex);

          if (accountNameMatch) {
            let potentialValue =
              accountNameMatch[1].trim();

            if (
              !potentialValue
                .toLowerCase()
                .startsWith("bankname")
            ) {
              accountName = potentialValue;
            }
          }

          // Extract bankName
          const bankNameRegex =
            /bankName\s*:\s*(.+?)(?=\s+accountNumber\s*:)/i;

          const bankNameMatch =
            rawData.match(bankNameRegex);

          if (bankNameMatch) {
            let potentialValue =
              bankNameMatch[1].trim();

            if (
              !potentialValue
                .toLowerCase()
                .startsWith("accountnumber")
            ) {
              bankName = potentialValue;
            }
          }

          // Extract accountNumber
          const accountNumberRegex =
            /accountNumber\s*:\s*(.+?)(?=\s+ifscCode\s*:)/i;

          const accountNumberMatch =
            rawData.match(accountNumberRegex);

          if (accountNumberMatch) {
            let potentialValue =
              accountNumberMatch[1].trim();

            if (
              !potentialValue
                .toLowerCase()
                .startsWith("ifsccode")
            ) {
              accountNumber = potentialValue;
            }
          }

          // Extract ifscCode
          const ifscCodeRegex =
            /ifscCode\s*:\s*(.+?)(?=\s+phoneNumber\s*:)/i;

          const ifscCodeMatch =
            rawData.match(ifscCodeRegex);

          if (ifscCodeMatch) {
            let potentialValue =
              ifscCodeMatch[1].trim();

            if (
              !potentialValue
                .toLowerCase()
                .startsWith("phonenumber")
            ) {
              ifscCode = potentialValue;
            }
          }

          // Extract phoneNumber
          const phoneNumberRegex =
            /phoneNumber\s*:\s*(.+?)(?=\s+upiId\s*:)/i;

          const phoneNumberMatch =
            rawData.match(phoneNumberRegex);

          if (phoneNumberMatch) {
            let potentialValue =
              phoneNumberMatch[1].trim();

            if (
              !potentialValue
                .toLowerCase()
                .startsWith("upiid")
            ) {
              phoneNumber = potentialValue;
            }
          }

          // Extract upiId
          const upiIdRegex =
            /upiId\s*:\s*(.*)$/i;

          const upiIdMatch =
            rawData.match(upiIdRegex);

          if (upiIdMatch) {
            upiId = upiIdMatch[1].trim();
          }

          bankDetails = [
            {
              accountName,
              bankName,
              accountNumber,
              ifscCode,
              phoneNumber,
              upiId,
            },
          ];
        }

        // EVENTS HISTORY
        let existingEventsHistory = [];
        if (
          item.existingEventsHistory
            ?.toString()
            .trim()
        ) {
          const rawData =
            item.existingEventsHistory
              .toString()
              .replace(/\n/g, " ")
              .replace(/\r/g, " ")
              .trim();

          let eventName = "";
          let eventDate = "";
          let remarks = "";

          // Extract EventName (anything after "EventName:" until "EventDate:" appears)
          const eventNameRegex = /EventName\s*:\s*(.+?)(?=\s+EventDate\s*:)/i;
          const eventNameMatch = rawData.match(eventNameRegex);

          if (eventNameMatch) {
            let potentialName = eventNameMatch[1].trim();
            // Check if the captured value doesn't start with "EventDate"
            if (!potentialName.toLowerCase().startsWith("eventdate")) {
              eventName = potentialName;
            }
          }

          // Extract EventDate
          const eventDateRegex = /EventDate\s*:\s*(.+?)(?=\s+Remark\s*:|$)/i;
          const eventDateMatch = rawData.match(eventDateRegex);
          if (eventDateMatch) {
            eventDate = eventDateMatch[1].trim();
          }

          // Extract Remark
          const remarkRegex = /Remark\s*:\s*(.*)$/i;
          const remarkMatch = rawData.match(remarkRegex);
          if (remarkMatch) {
            remarks = remarkMatch[1].trim();
          }

          existingEventsHistory = [
            {
              eventName,
              eventDate,
              remarks,
            },
          ];
        }

        // REQUIRED FIELD VALIDATION
        if (
          !apartmentName ||
          !apartmentAddress ||
          !city ||
          !location ||
          !apartmentSummary ||
          !contactPersonName ||
          !contactPersonPhone ||
          !email ||
          isNaN(residencyCount) ||
          isNaN(perDayRent)
        ) {
          skippedData.push({
            row: item,
            message: "Missing required fields",
          });
          continue;
        }
        // PHONE VALIDATION
        if (
          !contactPersonPhone ||
          contactPersonPhone.length < 10
        ) {
          skippedData.push({
            row: item,
            message:
              "Invalid phone number",
          });
          continue;
        }
        // EMAIL VALIDATION
        const emailRegex =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
          skippedData.push({
            row: item,
            message:
              "Invalid email format",
          });
          continue;
        }
        // DUPLICATE CHECK INSIDE EXCEL
        if (processedEmails.has(email)) {
          skippedData.push({
            row: item,
            message:
              `Duplicate email "${email}" found in Excel`,
          });

          continue;
        }
        if (
          processedPhones.has(
            contactPersonPhone
          )
        ) {
          skippedData.push({
            row: item,
            message:
              `Duplicate phone "${contactPersonPhone}" found in Excel`,
          });
          continue;
        }
        processedEmails.add(email);
        processedPhones.add(
          contactPersonPhone
        );
        // FIND EXISTING APARTMENT
        let existingApartment =
          await Apartment.findOne({
            $or: [
              { email: email },
              {
                contactPersonPhone:
                  contactPersonPhone,
              },
            ],
          });
        // UPDATE
        if (existingApartment) {

          existingApartment.apartmentName =
            apartmentName;

          existingApartment.apartmentAddress =
            apartmentAddress;

          existingApartment.city =
            city;

          existingApartment.location =
            location;

          existingApartment.jioLocation =
            jioLocation || "";

          existingApartment.permissionStatus =
            permissionStatus || "";

          existingApartment.rating =
            rating || "";

          existingApartment.photo =
            photo || "";

          existingApartment.apartmentSummary =
            apartmentSummary;

          existingApartment.contactPersonName =
            contactPersonName;

          existingApartment.residencyCount =
            residencyCount;

          existingApartment.approxPeopleCount =
            approxPeopleCount;

          existingApartment.startingTGValues =
            startingTGValues;

          existingApartment.perDayRent =
            perDayRent;

          if (bankDetails.length > 0) {
            existingApartment.bankDetails =
              bankDetails;
          }
          if (
            existingEventsHistory.length > 0
          ) {
            existingApartment.existingEventsHistory =
              existingEventsHistory;
          }
          existingApartment.updatedAt =
            new Date();
          await existingApartment.save();
          updatedData.push({
            id: existingApartment._id,
            email:
              existingApartment.email,
            phone:
              existingApartment.contactPersonPhone,
            message:
              "Record updated successfully",
          });

        } else {
          // CREATE
          const newApartment =
            await Apartment.create({

              apartmentName,
              apartmentAddress,
              city,
              location,
              jioLocation:
                jioLocation || "",
              photo:
                photo || "",
              apartmentSummary,
              contactPersonName,
              contactPersonPhone,
              email,
              bankDetails,
              residencyCount,
              approxPeopleCount,
              startingTGValues,
              perDayRent,
              existingEventsHistory,
              rating,
              permissionStatus:
                permissionStatus || "",
            });

          insertedData.push({
            id: newApartment._id,
            email:
              newApartment.email,
            phone:
              newApartment.contactPersonPhone,
            message:
              "Record inserted successfully",
          });
        }

      } catch (err) {

        skippedData.push({
          row: item,
          message: err.message,
        });
      }
    }
    // UPDATE FINAL COUNTS
    if (
      insertedData.length > 0 ||
      updatedData.length > 0
    ) {

      await Apartment.updateMany(
        {
          _id: {
            $in: [
              ...insertedData.map(
                (item) => item.id
              ),

              ...updatedData.map(
                (item) => item.id
              ),
            ],
          },
        },
        {
          $set: {
            fileName:
              req.file.originalname,

            totalRows:
              data.length,

            insertedCount:
              insertedData.length,

            updatedCount:
              updatedData.length,

            skippedCount:
              skippedData.length,
          },
        }
      );
    }
    // DELETE FILE
    try {
      if (
        fs.existsSync(req.file.path)
      ) {
        fs.unlinkSync(req.file.path);
      }
    } catch (fileError) {
      console.error(
        "Error deleting file:",
        fileError
      );
    }
    // RESPONSE
    return successResponse(
      res,
      "Excel Upload Completed",
      {
        totalRows: data.length,

        insertedCount:
          insertedData.length,

        insertedData,

        updatedCount:
          updatedData.length,

        updatedData,

        skippedCount:
          skippedData.length,

        skippedData,

        summary: {
          totalProcessed:
            insertedData.length +
            updatedData.length,

          totalSkipped:
            skippedData.length,
        },
      }
    );
  } catch (error) {
    console.error(
      "Main error:",
      error
    );
    // DELETE FILE ON ERROR
    try {
      if (
        req.file &&
        fs.existsSync(req.file.path)
      ) {
        fs.unlinkSync(
          req.file.path
        );
      }
    } catch (fileError) {

      console.error(
        "Error deleting file:",
        fileError
      );
    }
    return errorResponse(
      res,
      "Error Uploading File",
      error.message
    );
  }
};
// GET APARTMENTS
const getApartments = async (req, res) => {

  try {

    // PAGINATION
    const pageNumber =
      parseInt(req.body.pageNumber) || 1;

    const count =
      parseInt(req.body.count) || 10;

    const skip =
      (pageNumber - 1) * count;

    // FILTER
    const filter =
      ApartmentFilters(req.body);

    // TOTAL COUNT
    const totalCount =
      await Apartment.countDocuments(
        filter
      );

    // APARTMENTS
    const apartments =
      await Apartment.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(count)
        .lean();


        // Get unique locations from ALL apartments (not just paginated)
    const allApartmentsForLocations = await Apartment.find(filter).lean();
    
    // Extract unique locations (remove duplicates)
    const uniqueLocations = [...new Set(
      allApartmentsForLocations
        .map(apt => apt.location)
        .filter(location => location && location.trim()) // Remove null/empty values
    )];


    // LATEST UPLOAD
    const latestUpload =
      await Apartment.findOne()
        .sort({ createdAt: -1 });

    return successResponse(
      res,
      "Apartments fetched successfully",
      {
        pageNumber,
        count,
        totalCount,

        totalPages: Math.ceil(
          totalCount / count
        ),

        // FILE DETAILS
        fileName:
          latestUpload?.fileName || "",

        totalRows:
          latestUpload?.totalRows || 0,

        insertedCount:
          latestUpload?.insertedCount || 0,

        updatedCount:
          latestUpload?.updatedCount || 0,

        skippedCount:
          latestUpload?.skippedCount || 0,

        apartments,

         // NEW: Unique locations array without duplicates
        locationFilter: uniqueLocations, // Example: ["chennai", "madurai", "coimbatore"]
      }
    );
  } catch (error) {
    return errorResponse(
      res,
      "Error Fetching Apartments",
      error.message
    );
  }
};
module.exports = {
  uploadExcel,
  getApartments,
};