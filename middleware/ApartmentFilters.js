const buildApartmentFilters = (body) => {

  const {
    search,
    city,
    location,
    minRent,
    maxRent,
    minTG,
    maxTG,
    locationFilter,
    cityFilter,
  } = body;

  let filter = {};

  // GLOBAL SEARCH
  if (search && search.toString().trim()) {

    const searchValue =
      search.toString().trim();

    const orFilters = [
      {
        apartmentName: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        apartmentAddress: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        city: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        location: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        contactPersonName: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        contactPersonPhone: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        email: {
          $regex: searchValue,
          $options: "i",
        },
      },
      {
        permissionStatus: {
          $regex: searchValue,
          $options: "i",
        },
      },
    ];

    // NUMBER SEARCH
    if (!isNaN(searchValue)) {

      const numberValue =
        Number(searchValue);

      orFilters.push(
        {
          residencyCount:
            numberValue,
        },
        {
          approxPeopleCount:
            numberValue,
        },
        {
          fromTGValues:
            numberValue,
        },
        {
          toTGValues:
            numberValue,
        },
        {
          rating:
            numberValue,
        },
        {
          perDayRent:
            numberValue,
        }
      );
    }

    filter.$or = orFilters;
  }

  // LOCATION ARRAY FILTER
  if ( locationFilter && Array.isArray(locationFilter) && locationFilter.length > 0) {

    filter.location = {
      $in: locationFilter.map(
        (loc) =>
          new RegExp(
            `^${loc}$`,
            "i"
          )
      ),
    };
  }
  // CITY ARRAY FILTER
  if (cityFilter && Array.isArray(cityFilter) && cityFilter.length > 0) {

    filter.city = {
      $in: cityFilter.map(
        (cit) =>
          new RegExp(
            `^${cit}$`,
            "i"
          )
      ),
    };
  }

  // SINGLE LOCATION FILTER
  if (location && !locationFilter) {

    filter.location = {
      $regex: location,
      $options: "i",
    };
  }
  // SINGLE CITY FILTER
  if ( city &&!cityFilter) {

    filter.city = {
      $regex: city,
      $options: "i",
    };
  }

  // RENT FILTER
  if (minRent || maxRent) {

    filter.perDayRent = {};

    if (minRent) {
      filter.perDayRent.$gte =
        Number(minRent);
    }

    if (maxRent) {
      filter.perDayRent.$lte =
        Number(maxRent);
    }
  }

  // TG FILTER
  if (minTG || maxTG) {

    filter.fromTGValues = {};
    filter.toTGValues = {};

    if (minTG) {
      filter.fromTGValues.$gte =
        Number(minTG);
    }

    if (maxTG) {
      filter.toTGValues.$lte =
        Number(maxTG);
    }
  }

  return filter;
};

module.exports = buildApartmentFilters;