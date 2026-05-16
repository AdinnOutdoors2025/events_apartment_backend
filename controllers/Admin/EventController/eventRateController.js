const EventRate = require("../../../models/Admin/EventHandling/eventRateSchema");

// SAVE EVENT RATE
exports.saveEventRate = async (req, res) => {
    try {
        const {
            // apartmentId,
            eventName,
            amount,
            status,
        } = req.body;

        // STATUS VALIDATION
        if (
            status === undefined ||
            status === null
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "status is required",
            });
        }
        if (!eventName) {
            return res.status(400).json({
                success: false,
                message:
                    "eventName is required",
            });
        }

        if (
            amount === undefined ||
            amount === null
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "amount is required",
            });
        }

        // CREATE EVENT
        const saveData =
            await EventRate.create({
                eventName: eventName.trim(),
                // apartmentId,
                amount,
                status
            });

        return res.status(201).json({
            success: true,
            message:
                "Event Rate saved successfully",

            data: saveData,

            updatedBy:
                req.user?.name ||
                "Admin",
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message:
                "Internal Server Error",
            error: error.message,
        });
    }
};

// ====================== LIST EVENT RATE ======================

exports.listEventRate =async (req, res) => {
        try {

            // GET ONLY STATUS 1 EVENTS
            const eventList =
                await EventRate.find({
                    status: 1,
                }).sort({
                    createdAt: -1,
                });

            return res.status(200).json({
                success: true,
                message:
                    "Event Rate list fetched successfully",

                totalCount:
                    eventList.length,

                data: eventList,
            });

        } catch (error) {
            console.log(error);

            return res.status(500).json({
                success: false,
                message:
                    "Internal Server Error",
                error: error.message,
            });
        }
    };