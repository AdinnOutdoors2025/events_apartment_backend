// const buildApartmentFilters = (body) => {
//   const {
//     search,
//     location,
//     minRent,
//     maxRent,
//     minTG,
//     maxTG,
//   } = body;

//   let filter = {};

//   // GLOBAL SEARCH
//   if (search && search.toString().trim()) {

//     const searchValue = search.toString().trim();

//     const orFilters = [
//       {
//         apartmentName: {
//           $regex: searchValue,
//           $options: "i",
//         },
//       },
//       {
//         apartmentAddress: {
//           $regex: searchValue,
//           $options: "i",
//         },
//       },
//       {
//         city: {
//           $regex: searchValue,
//           $options: "i",
//         },
//       },
//       {
//         location: {
//           $regex: searchValue,
//           $options: "i",
//         },
//       },
//       {
//         contactPersonName: {
//           $regex: searchValue,
//           $options: "i",
//         },
//       },
//       {
//         contactPersonPhone: {
//           $regex: searchValue,
//           $options: "i",
//         },
//       },
//       {
//         email: {
//           $regex: searchValue,
//           $options: "i",
//         },
//       },
//       {
//         permissionStatus: {
//           $regex: searchValue,
//           $options: "i",
//         },
//       },
//     ];

//     // NUMBER SEARCH
//     if (!isNaN(searchValue)) {

//       const numberValue = Number(searchValue);

//       orFilters.push(
//         {
//           residencyCount: numberValue,
//         },
//         {
//           approxPeopleCount: numberValue,
//         },
//         {
//           startingTGValues: numberValue,
//         },
//         {
//           rating: numberValue,
//         },
//         {
//           perDayRent: numberValue,
//         }
//       );
//     }

//     filter.$or = orFilters;
//   }

//   // LOCATION FILTER
//   if (location) {
//     filter.location = {
//       $regex: location,
//       $options: "i",
//     };
//   }

//   // RENT FILTER
//   if (minRent || maxRent) {

//     filter.perDayRent = {};

//     if (minRent) {
//       filter.perDayRent.$gte = Number(minRent);
//     }

//     if (maxRent) {
//       filter.perDayRent.$lte = Number(maxRent);
//     }
//   }

//   // TG FILTER
//   if (minTG || maxTG) {

//     filter.startingTGValues = {};

//     if (minTG) {
//       filter.startingTGValues.$gte = Number(minTG);
//     }

//     if (maxTG) {
//       filter.startingTGValues.$lte = Number(maxTG);
//     }
//   }

//   return filter;
// };

// module.exports = buildApartmentFilters;




const buildApartmentFilters = (body) => {
  const {
    search,
    location,
    minRent,
    maxRent,
    minTG,
    maxTG,
    locationFilter, // New field for array of locations
  } = body;

  let filter = {};

  // LOCATION ARRAY FILTER (New feature)
  if (locationFilter && Array.isArray(locationFilter) && locationFilter.length > 0) {
    // Create case-insensitive regex for each location
    const locationConditions = locationFilter.map(loc => ({
      location: {
        $regex: new RegExp(`^${loc}$`, 'i') // Exact match with case-insensitive
      }
    }));
    
    filter.$or = locationConditions;
  }

  // GLOBAL SEARCH
  if (search && search.toString().trim()) {

    const searchValue = search.toString().trim();

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

      const numberValue = Number(searchValue);

      orFilters.push(
        {
          residencyCount: numberValue,
        },
        {
          approxPeopleCount: numberValue,
        },
        {
          startingTGValues: numberValue,
        },
        {
          rating: numberValue,
        },
        {
          perDayRent: numberValue,
        }
      );
    }

    // If location filter already exists, merge with search
    if (filter.$or) {
      // Existing location filter + search filters
      filter.$and = [
        { $or: filter.$or },
        { $or: orFilters }
      ];
      delete filter.$or;
    } else {
      filter.$or = orFilters;
    }
  }

  // SINGLE LOCATION FILTER (backward compatible)
  if (location && !locationFilter) {
    filter.location = {
      $regex: location,
      $options: "i",
    };
  }

  // RENT FILTER
  if (minRent || maxRent) {

    filter.perDayRent = {};

    if (minRent) {
      filter.perDayRent.$gte = Number(minRent);
    }

    if (maxRent) {
      filter.perDayRent.$lte = Number(maxRent);
    }
  }

  // TG FILTER
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