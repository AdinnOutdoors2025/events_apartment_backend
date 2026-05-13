const buildApartmentFilters = (body) => {

  const {
    search,
    location,
    minRent,
    maxRent,
    minTG,
    maxTG,
  
  } = body;

  let filter = {};

  // Search Filter
  if (search) {

    filter.$or = [
      {
        apartmentName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        city: {
          $regex: search,
          $options: "i",
        },
      },
      {
        location: {
          $regex: search,
          $options: "i",
        },
      },
      {
        contactPersonName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        email: {
          $regex: search,
          $options: "i",
        },
      },
    ];

    // Number Search
    if (!isNaN(search)) {
      filter.$or.push({
        startingTGValues: Number(search),
      });
    }
  }

  // Location Filter
  if (location) {
    filter.location = {
      $regex: location,
      $options: "i",
    };
  }

  // Rent Filter
  if (minRent || maxRent) {

    filter.perDayRent = {};

    if (minRent) {
      filter.perDayRent.$gte = Number(minRent);
    }

    if (maxRent) {
      filter.perDayRent.$lte = Number(maxRent);
    }
  }

  // TG Filter
  if (minTG || maxTG) {

    filter.startingTGValues = {};

    if (minTG) {
      filter.startingTGValues.$gte = Number(minTG);
    }

    if (maxTG) {
      filter.startingTGValues.$lte = Number(maxTG);
    }
  }

  return filter;
};
module.exports = buildApartmentFilters;