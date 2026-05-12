const fs = require("fs");
const Apartment = require("../../models/Admin/apartment");
const readExcelFile = require("../../utils/excelHelper");
const { successResponse, errorResponse } = require('../../utils/response');
// Upload Excels
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

    // Track processed emails and phones within the Excel file only
    const processedEmails = new Set();
    const processedPhones = new Set();

    for (const item of data) {
      try {
        // Clean and validate data
        const apartmentName = item.apartmentName?.toString().trim();
        const apartmentAddress = item.apartmentAddress?.toString().trim();
        const city = item.city?.toString().trim();
        const location = item.location?.toString().trim();
        const jioLocation = item.jioLocation?.toString().trim();
        const photo = item.photo?.toString().trim();
        const apartmentSummary = item.apartmentSummary?.toString().trim();
        const contactPersonName = item.contactPersonName?.toString().trim();
        const contactPersonPhone = item.contactPersonPhone?.toString().trim();
        const email = item.email?.toString().trim().toLowerCase();
        const bankDetails = item.bankDetails?.toString().trim();
        const startingTGValues = item.startingTGValues?.toString().trim();
        const residencyCount = Number(item.residencyCount);
        const approxPeopleCount = Number(item.approxPeopleCount || 0);
        const perDayRent = Number(item.perDayRent);

        // Parse existingEventsHistory
        let existingEventsHistory = [];
        if (item.existingEventsHistory?.toString().trim()) {
          existingEventsHistory = [{
            eventName: item.existingEventsHistory.toString().trim(),
            eventDate: new Date(),
            remarks: ""
          }];
        }

        // REQUIRED FIELD VALIDATION
        if (!apartmentName || !apartmentAddress || !city || !location ||
          !apartmentSummary || !contactPersonName || !contactPersonPhone ||
          !email || isNaN(residencyCount) || isNaN(perDayRent)) {
          skippedData.push({
            row: item,
            message: "Missing required fields",
          });
          continue;
        }

        // Validate phone number
        if (!contactPersonPhone || contactPersonPhone.length < 10) {
          skippedData.push({
            row: item,
            message: "Invalid phone number - must be at least 10 digits",
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          skippedData.push({
            row: item,
            message: "Invalid email format",
          });
          continue;
        }

        // CHECK DUPLICATE WITHIN EXCEL FILE ONLY (not database)
        if (processedEmails.has(email)) {
          skippedData.push({
            row: item,
            message: `Duplicate email "${email}" found in Excel file - skipping duplicate in same file`,
          });
          continue;
        }

        if (processedPhones.has(contactPersonPhone)) {
          skippedData.push({
            row: item,
            message: `Duplicate phone number "${contactPersonPhone}" found in Excel file - skipping duplicate in same file`,
          });
          continue;
        }

        processedEmails.add(email);
        processedPhones.add(contactPersonPhone);

        // Try to find existing record in database by email OR phone
        let existingApartment = null;
        try {
          existingApartment = await Apartment.findOne({
            $or: [
              { email: email },
              { contactPersonPhone: contactPersonPhone }
            ]
          });
        } catch (dbError) {
          console.error("Database query error:", dbError);
          skippedData.push({
            row: item,
            message: `Database error: ${dbError.message}`,
          });
          continue;
        }

        // If record exists in database, UPDATE it
        if (existingApartment) {
          try {
            // Check if any data actually changed
            const hasChanges = 
              existingApartment.apartmentName !== apartmentName ||
              existingApartment.apartmentAddress !== apartmentAddress ||
              existingApartment.city !== city ||
              existingApartment.location !== location ||
              existingApartment.jioLocation !== (jioLocation || "") ||
              existingApartment.photo !== (photo || "") ||
              existingApartment.apartmentSummary !== apartmentSummary ||
              existingApartment.contactPersonName !== contactPersonName ||
              existingApartment.bankDetails !== (bankDetails || "") ||
              existingApartment.residencyCount !== residencyCount ||
              existingApartment.approxPeopleCount !== approxPeopleCount ||
              existingApartment.startingTGValues !== (startingTGValues || "") ||
              existingApartment.perDayRent !== perDayRent;

            // Update existing record with new data
            existingApartment.apartmentName = apartmentName;
            existingApartment.apartmentAddress = apartmentAddress;
            existingApartment.city = city;
            existingApartment.location = location;
            existingApartment.jioLocation = jioLocation || "";
            existingApartment.photo = photo || "";
            existingApartment.apartmentSummary = apartmentSummary;
            existingApartment.contactPersonName = contactPersonName;
            existingApartment.bankDetails = bankDetails || "";
            existingApartment.residencyCount = residencyCount;
            existingApartment.approxPeopleCount = approxPeopleCount;
            existingApartment.startingTGValues = startingTGValues || "";
            existingApartment.perDayRent = perDayRent;
            
            if (existingEventsHistory.length > 0) {
              existingApartment.existingEventsHistory = existingEventsHistory;
            }

            // Manually update the updatedAt timestamp if timestamps is not enabled in schema
            // Option 1: If you have timestamps: true in schema, this will be auto-updated
            // Option 2: If not, manually set it
            existingApartment.updatedAt = new Date(); // Manual update
            
            await existingApartment.save();
            
            updatedData.push({
              id: existingApartment._id,
              email: existingApartment.email,
              phone: existingApartment.contactPersonPhone,
              message: hasChanges ? "Record updated successfully" : "Record re-saved (no changes detected)",
              updatedAt: existingApartment.updatedAt
            });
          } catch (updateError) {
            console.error("Update error:", updateError);
            skippedData.push({
              row: item,
              message: `Failed to update: ${updateError.message}`,
            });
          }
        } else {
          // CREATE NEW record in database
          try {
            const newApartment = await Apartment.create({
              apartmentName,
              apartmentAddress,
              city,
              location,
              jioLocation: jioLocation || "",
              photo: photo || "",
              apartmentSummary,
              contactPersonName,
              contactPersonPhone: contactPersonPhone,
              email,
              bankDetails: bankDetails || "",
              residencyCount,
              approxPeopleCount,
              startingTGValues: startingTGValues || "",
              perDayRent,
              existingEventsHistory: existingEventsHistory,
              permissionStatus: "Pending",
            });

            insertedData.push({
              id: newApartment._id,
              email: newApartment.email,
              phone: newApartment.contactPersonPhone,
              message: "Record inserted successfully",
              createdAt: newApartment.createdAt
            });
          } catch (createError) {
            console.error("Create error:", createError);

            // Handle duplicate key error
            if (createError.code === 11000) {
              let message = "Duplicate key error in database: ";
              if (createError.keyPattern?.email) {
                message += `Email ${email} already exists with different phone number`;
              } else if (createError.keyPattern?.contactPersonPhone) {
                message += `Phone number ${contactPersonPhone} already exists with different email`;
              } else {
                message += createError.message;
              }

              skippedData.push({
                row: item,
                message: message,
              });
            } else {
              skippedData.push({
                row: item,
                message: createError.message,
              });
            }
          }
        }
      } catch (err) {
        console.error("Row processing error:", err);
        skippedData.push({
          row: item,
          message: err.message,
        });
      }
    }

    // DELETE FILE
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (fileError) {
      console.error("Error deleting file:", fileError);
    }

    return res.status(200).json({
      success: true,
      message: "Excel Upload Completed",
      totalRows: data.length,
      insertedCount: insertedData.length,
      insertedData,
      updatedCount: updatedData.length,
      updatedData,
      skippedCount: skippedData.length,
      skippedData,
      summary: {
        totalProcessed: insertedData.length + updatedData.length,
        totalSkipped: skippedData.length
      }
    });
  } catch (error) {
    console.error("Main error:", error);

    // DELETE FILE ON ERROR
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (fileError) {
      console.error("Error deleting file on error:", fileError);
    }

    return res.status(500).json({
      success: false,
      message: "Error Uploading File",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};
// GET APARTMENTS
const getApartments = async (req, res) => {
  try {
    // pageNumber & count from frontend
    const pageNumber = parseInt(req.body.pageNumber) || 1;
    const count = parseInt(req.body.count) || 10;
    // skip calculation
    const skip = (pageNumber - 1) * count;
    // total records
    const totalCount = await Apartment.countDocuments();
   // fetch data
    const apartments = await Apartment.find()
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(count);

    return res.status(200).json({
      success: true,
      pageNumber, // current page
      count,  // records per page
      totalCount,// total DB records
      totalPages: Math.ceil(totalCount / count), // total pages
      apartments,
    });
  } catch (error) {
    console.log(error);
    return errorResponse(
      res,
      "Error Fetching Apartments",
      null,
      500
    );
  }
};
module.exports = {
  uploadExcel,
  getApartments,
};