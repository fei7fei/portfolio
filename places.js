// Places shown on the travel globe (experience page).
// To add a place, copy a line and change the values. Find latitude and longitude by
// right-clicking the spot in Google Maps; the first number is lat, the second is lng.
//   type: "home" = somewhere you lived, studied, or worked
//         "trip" = a vacation or visit
//   side: optional, "left" puts the label on the left of the dot (use it when two labels overlap)
window.PLACES = [
  { name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207, type: "home", side: "left" },
  { name: "Kelowna", country: "Canada", lat: 49.888, lng: -119.496, type: "home" },
  { name: "Suzhou", country: "China", lat: 31.2989, lng: 120.5853, type: "home" },
  { name: "Washington, DC", country: "United States", lat: 38.9072, lng: -77.0369, type: "home" },
];
