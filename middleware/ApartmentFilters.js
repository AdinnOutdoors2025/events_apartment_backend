// const buildApartmentFilters = (body) => {

//   const {
//     search,
//     City,
//     Location,
//     minRent,
//     maxRent,
//     minTG,
//     maxTG,
//     locationFilter,
//     cityFilter,
//   } = body;

//   let filter = {};

//   // GLOBAL SEARCH
//   if (search && search.toString().trim()) {

//     const searchValue =
//       search.toString().trim();

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
//         City: {
//           $regex: searchValue,
//           $options: "i",
//         },
//       },
//       {
//         Location: {
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

//       const numberValue =
//         Number(searchValue);

//       orFilters.push(
//         {
//           residencyCount:
//             numberValue,
//         },
//         {
//           approxPeopleCount:
//             numberValue,
//         },
//         {
//           FromTGValues:
//             numberValue,
//         },
//         {
//           ToTGValues:
//             numberValue,
//         },
//         {
//           rating:
//             numberValue,
//         },
//         {
//           PerDayRent:
//             numberValue,
//         }
//       );
//     }

//     filter.$or = orFilters;
//   }

//   // LOCATION ARRAY FILTER
//   if ( locationFilter && Array.isArray(locationFilter) && locationFilter.length > 0) {

//     filter.Location = {
//       $in: locationFilter.map(
//         (loc) =>
//           new RegExp(
//             `^${loc}$`,
//             "i"
//           )
//       ),
//     };
//   }
//   // CITY ARRAY FILTER
//   if (cityFilter && Array.isArray(cityFilter) && cityFilter.length > 0) {

//     filter.City = {
//       $in: cityFilter.map(
//         (cit) =>
//           new RegExp(
//             `^${cit}$`,
//             "i"
//           )
//       ),
//     };
//   }

//   // SINGLE LOCATION FILTER
//   if (Location && !locationFilter) {

//     filter.Location = {
//       $regex: Location,
//       $options: "i",
//     };
//   }
//   // SINGLE CITY FILTER
//   if ( City &&!cityFilter) {

//     filter.City = {
//       $regex: City,
//       $options: "i",
//     };
//   }

//   // RENT FILTER
//   if (minRent || maxRent) {

//     filter.PerDayRent = {};

//     if (minRent) {
//       filter.PerDayRent.$gte =
//         Number(minRent);
//     }

//     if (maxRent) {
//       filter.PerDayRent.$lte =
//         Number(maxRent);
//     }
//   }

//   // TG FILTER
//   if (minTG || maxTG) {

//     filter.FromTGValues = {};
//     filter.ToTGValues = {};

//     if (minTG) {
//       filter.FromTGValues.$gte =
//         Number(minTG);
//     }

//     if (maxTG) {
//       filter.ToTGValues.$lte =
//         Number(maxTG);
//     }
//   }

//   return filter;
// };

// module.exports = buildApartmentFilters;



const buildApartmentFilters = (body, userType) => {
  const {
    search,
    City,
    State,
    Location,
    ApartmentGroupName,
    minRent,
    maxRent,
    minTG,
    maxTG,
    locationFilter,
    cityFilter,
    stateFilter,
    apartmentGroupNameFilter
  } = body;

  let filter = {};

  // ── ACTIVE FILTER: userType 3 sees only active apartments ──
  if (userType === 3) {
    filter.isActive = true;
  }

  // GLOBAL SEARCH
  if (search && search.toString().trim()) {
    const searchValue = search.toString().trim();
    const orFilters = [
      { ApartmentName: { $regex: searchValue, $options: "i" } },
      { ApartmentAddress: { $regex: searchValue, $options: "i" } },
      { City: { $regex: searchValue, $options: "i" } },
      { ApartmentGroupName: { $regex: searchValue, $options: "i" } },
      { State: { $regex: searchValue, $options: "i" } },
      { Location: { $regex: searchValue, $options: "i" } },
      { ContactPersonName: { $regex: searchValue, $options: "i" } },
      // { ContactPersonPhone: { $regex: searchValue, $options: "i" } },
      // { ResidencyCount: { $regex: searchValue, $options: "i" } },
      { email: { $regex: searchValue, $options: "i" } },
      { permissionStatus: { $regex: searchValue, $options: "i" } },
    ];

    // NUMBER SEARCH
    if (!isNaN(searchValue)) {
      const numberValue = Number(searchValue);
      orFilters.push(
        { ResidencyCount: numberValue },
        { ApproxPeopleCount: numberValue },
        { FromTGValues: numberValue },
        { ToTGValues: numberValue },
        { Rating: numberValue },
        { PerDayRent: numberValue },
        { ContactPersonPhone: numberValue }
      );
    }
    filter.$or = orFilters;
  }

  // LOCATION ARRAY FILTER
  if (locationFilter && Array.isArray(locationFilter) && locationFilter.length > 0) {
    filter.Location = {
      $in: locationFilter.map((loc) => new RegExp(`^${loc}$`, "i")),
    };
  }

  // STATE ARRAY FILTER
  if (stateFilter && Array.isArray(stateFilter) && stateFilter.length > 0) {
    filter.State = {
      $in: stateFilter.map((st) => new RegExp(`^${st}$`, "i")),
    };
  }

  // CITY ARRAY FILTER
  if (cityFilter && Array.isArray(cityFilter) && cityFilter.length > 0) {
    filter.City = {
      $in: cityFilter.map((cit) => new RegExp(`^${cit}$`, "i")),
    };
  }
  // GroupName ARRAY FILTER
  if (apartmentGroupNameFilter && Array.isArray(apartmentGroupNameFilter) && apartmentGroupNameFilter.length > 0) {
    filter.ApartmentGroupName = {
      $in: apartmentGroupNameFilter.map((cit) => new RegExp(`^${cit}$`, "i")),
    };
  }

  // SINGLE LOCATION FILTER
  if (Location && !locationFilter) {
    filter.Location = { $regex: Location, $options: "i" };
  }

  // SINGLE CITY FILTER
  if (City && !cityFilter) {
    filter.City = { $regex: City, $options: "i" };
  }
  // SINGLE CITY FILTER
  if (ApartmentGroupName && !apartmentGroupNameFilter) {
    filter.ApartmentGroupName = { $regex: ApartmentGroupName, $options: "i" };
  }
  // SINGLE STATE FILTER
  if (State && !stateFilter) {
    filter.State = { $regex: State, $options: "i" };
  }

  // RENT FILTER
  if (minRent || maxRent) {
    filter.PerDayRent = {};
    if (minRent) filter.PerDayRent.$gte = Number(minRent);
    if (maxRent) filter.PerDayRent.$lte = Number(maxRent);
  }

  // TG FILTER
  if (minTG || maxTG) {
    filter.FromTGValues = {};
    filter.ToTGValues = {};
    if (minTG) filter.FromTGValues.$gte = Number(minTG);
    if (maxTG) filter.ToTGValues.$lte = Number(maxTG);
  }

  return filter;
};

module.exports = buildApartmentFilters;