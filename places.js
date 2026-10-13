// Places shown on the travel globe (experience page).
// To add a place, copy a line and change the values. Find latitude and longitude by
// right-clicking the spot in Google Maps; the first number is lat, the second is lng.
//   type: "home" = somewhere you lived, studied, or worked
//         "trip" = a vacation or visit
//   side: optional, "left" puts the label on the left of the dot
// When labels overlap, places higher in this list win and the rest appear as you zoom in.
window.PLACES = [
  // Lived, studied, or worked
  { name: "Vancouver", country: "Canada", lat: 49.2827, lng: -123.1207, type: "home", side: "left" },
  { name: "Kelowna", country: "Canada", lat: 49.888, lng: -119.496, type: "home" },
  { name: "Suzhou", country: "China", lat: 31.2989, lng: 120.5853, type: "home" },
  { name: "Washington, DC", country: "United States", lat: 38.9072, lng: -77.0369, type: "home" },

  // Trips
  { name: "Victoria", country: "Canada", lat: 48.4284, lng: -123.3656, type: "trip", side: "left" },
  { name: "Calgary", country: "Canada", lat: 51.0447, lng: -114.0719, type: "trip" },
  { name: "Montreal", country: "Canada", lat: 45.5019, lng: -73.5674, type: "trip" },
  { name: "Quebec City", country: "Canada", lat: 46.8139, lng: -71.208, type: "trip" },
  { name: "Banff", country: "Canada", lat: 51.1784, lng: -115.5708, type: "trip", side: "left" },
  { name: "Yellowstone", country: "United States", lat: 44.428, lng: -110.5885, type: "trip" },
  { name: "Seattle", country: "United States", lat: 47.6062, lng: -122.3321, type: "trip" },
  { name: "Portland", country: "United States", lat: 45.5152, lng: -122.6784, type: "trip", side: "left" },
  { name: "Los Angeles", country: "United States", lat: 34.0522, lng: -118.2437, type: "trip" },
  { name: "Alaska", country: "United States", lat: 61.2181, lng: -149.9003, type: "trip" },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, type: "trip" },
  { name: "Seoul", country: "South Korea", lat: 37.5665, lng: 126.978, type: "trip" },
  { name: "Taipei", country: "Taiwan", lat: 25.033, lng: 121.5654, type: "trip" },
  { name: "Shanghai", country: "China", lat: 31.2304, lng: 121.4737, type: "trip" },
  { name: "Beijing", country: "China", lat: 39.9042, lng: 116.4074, type: "trip" },
  { name: "Xi'an, Shaanxi", country: "China", lat: 34.3416, lng: 108.9398, type: "trip", side: "left" },
  { name: "Chengdu", country: "China", lat: 30.5728, lng: 104.0668, type: "trip", side: "left" },
  { name: "Chongqing", country: "China", lat: 29.563, lng: 106.5516, type: "trip" },
  { name: "Guangzhou", country: "China", lat: 23.1291, lng: 113.2644, type: "trip", side: "left" },
  { name: "Shanxi", country: "China", lat: 37.8706, lng: 112.5489, type: "trip", side: "left" },
  { name: "Hong Kong", country: "Hong Kong", lat: 22.3193, lng: 114.1694, type: "trip" },
  { name: "Macau", country: "Macau", lat: 22.1987, lng: 113.5439, type: "trip", side: "left" },
];
