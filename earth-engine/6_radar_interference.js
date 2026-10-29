// Minimal Radar Interference (RFI) viewer for Google Earth Engine
// Method based on Bellingcat's Radar Interference Tracker (Ollie Ballinger)
// Paste into the Earth Engine Code Editor and press Run.

// 1. Settings: change these
var aoi   = ee.Geometry.Point(49.9507, 26.6056);  // area of interest (lon, lat)
var start = '2026-03-01';                         // period to display
var end   = '2026-04-01';

// 2. Sentinel-1 GRD, dual-pol (VV + VH), IW mode
var s1all = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.eq('instrumentMode', 'IW'));

var s1   = s1all.filterDate(start, end);
var asc  = s1.filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'));
var desc = s1.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));

// 3. The key trick: a MAX composite (not median) keeps interference spikes
var rgb = ee.Image.cat([
  asc.select('VH').max(),   // red   = interference on ascending passes
  s1.select('VV').max(),    // green = background terrain (VV, both passes)
  desc.select('VH').max()   // blue  = interference on descending passes
]);

var vis = {min: [-25, -20, -25], max: [-10, 0, -10]};

Map.setOptions('HYBRID');
Map.centerObject(aoi, 8);
Map.addLayer(rgb, vis, 'RFI composite', true, 0.8);
Map.addLayer(aoi, {color: 'cyan'}, 'AOI');

// 4. Time series of VH at the point: spikes = likely interference dates
var chart = ui.Chart.image.series({
  imageCollection: s1all.filterBounds(aoi).select('VH'),
  region: aoi,
  reducer: ee.Reducer.max(),
  scale: 500
}).setOptions({title: 'VH over time (spikes = possible radar interference)', lineWidth: 1});
print(chart);

// Tip: if you get a band error, one orbit direction had no images in your
// period. Widen the dates (e.g. a full year) for a broad overview.
