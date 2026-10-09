// =====================================================================
// 5. ELEVATION PLAYGROUND  |  Google Earth Engine
// Compare free global elevation datasets, exaggerate the relief, move
// the sun, draw contours, compare datasets, and click two points to
// get an elevation profile (useful for verifying what a camera could see).
// =====================================================================

Map.setCenter(36.2, 35.55, 11);   // change to your area
Map.setOptions('TERRAIN');

// ---------- datasets ----------
function fromCollection(id, band) {
  var col = ee.ImageCollection(id).select(band);
  return col.mosaic().setDefaultProjection(col.first().projection()).rename('elev');
}
var DEMS = {
  'Copernicus GLO-30 (2011-2015, 30 m)': function () { return fromCollection('COPERNICUS/DEM/GLO30', 'DEM'); },
  'SRTM (Feb 2000, 30 m)':               function () { return ee.Image('USGS/SRTMGL1_003').select('elevation').rename('elev'); },
  'NASADEM (reprocessed SRTM, 30 m)':    function () { return ee.Image('NASA/NASADEM_HGT/001').select('elevation').rename('elev'); },
  'ALOS AW3D30 (2006-2011, 30 m)':       function () { return fromCollection('JAXA/ALOS/AW3D30/V3_2', 'DSM'); }
};
var PALETTES = {
  'Terrain':   ['0B6623', '8FBC8F', 'F5DEB3', 'C19A6B', '8B4513', 'FFFFFF'],
  'Spectral':  ['2B83BA', 'ABDDA4', 'FFFFBF', 'FDAE61', 'D7191C'],
  'Viridis':   ['440154', '3B528B', '21918C', '5EC962', 'FDE725'],
  'Grayscale': ['000000', 'FFFFFF']
};
var VIEWS = ['Shaded color relief', 'Hillshade only', 'Color only', 'Slope (degrees)', 'Aspect (direction slopes face)',
             'Difference: dataset A minus dataset B'];

// ---------- knobs ----------
var demSel  = ui.Select({items: Object.keys(DEMS), value: 'Copernicus GLO-30 (2011-2015, 30 m)'});
var demBSel = ui.Select({items: Object.keys(DEMS), value: 'SRTM (Feb 2000, 30 m)'});
var viewSel = ui.Select({items: VIEWS, value: 'Shaded color relief'});
var palSel  = ui.Select({items: Object.keys(PALETTES), value: 'Terrain'});
var exagS   = ui.Slider({min: 1, max: 10, value: 3, step: 0.5, style: {stretch: 'horizontal'}});
var azS     = ui.Slider({min: 0, max: 360, value: 315, step: 15, style: {stretch: 'horizontal'}});
var sunS    = ui.Slider({min: 5, max: 85, value: 35, step: 5, style: {stretch: 'horizontal'}});
var shadeS  = ui.Slider({min: 0, max: 1, value: 0.6, step: 0.05, style: {stretch: 'horizontal'}});
var minS    = ui.Slider({min: -100, max: 3000, value: 0, step: 50, style: {stretch: 'horizontal'}});
var maxS    = ui.Slider({min: 100, max: 4000, value: 1500, step: 50, style: {stretch: 'horizontal'}});
var autoChk = ui.Checkbox('Auto color range for current view', true);
var contourChk = ui.Checkbox('Show contour lines', false);
var contourS = ui.Slider({min: 10, max: 500, value: 100, step: 10, style: {stretch: 'horizontal'}});
var diffS   = ui.Slider({min: 0, max: 50, value: 5, step: 1, style: {stretch: 'horizontal'}});
var info = ui.Label('');

// ---------- render ----------
function render(lo, hi) {
  Map.layers().reset();
  var dem = DEMS[demSel.getValue()]();
  var view = viewSel.getValue();
  var pal = PALETTES[palSel.getValue()];
  var hs = ee.Terrain.hillshade(dem.multiply(exagS.getValue()), azS.getValue(), sunS.getValue());

  if (view === 'Shaded color relief') {
    var color = dem.visualize({min: lo, max: hi, palette: pal});
    var s = shadeS.getValue();
    var shade = hs.divide(255).multiply(s).add(1 - s);
    Map.addLayer(color.multiply(shade).uint8(), {}, 'Shaded relief (x' + exagS.getValue() + ')');
  } else if (view === 'Hillshade only') {
    Map.addLayer(hs, {min: 0, max: 255}, 'Hillshade (x' + exagS.getValue() + ')');
  } else if (view === 'Color only') {
    Map.addLayer(dem, {min: lo, max: hi, palette: pal}, 'Elevation (m)');
  } else if (view === 'Slope (degrees)') {
    Map.addLayer(ee.Terrain.slope(dem), {min: 0, max: 45, palette: ['FFFFFF', 'FDAE61', 'D7191C', '67001F']}, 'Slope');
  } else if (view.indexOf('Aspect') === 0) {
    Map.addLayer(ee.Terrain.aspect(dem), {min: 0, max: 360, palette: ['FF0000', 'FFFF00', '00FF00', '00FFFF', '0000FF', 'FF00FF', 'FF0000']},
      'Aspect (red = north, green = east-ish, blue = south-west)');
  } else {
    var demB = DEMS[demBSel.getValue()]();
    var diff = dem.subtract(demB);
    Map.addLayer(diff.updateMask(diff.abs().gte(diffS.getValue())),
      {min: -30, max: 30, palette: ['2166AC', 'F7F7F7', 'B2182B']},
      'A minus B (red = A higher, blue = A lower)');
  }

  if (contourChk.getValue()) {
    var step = contourS.getValue();
    var bands = dem.divide(step).floor();
    var lines = bands.convolve(ee.Kernel.laplacian8()).neq(0).selfMask();
    Map.addLayer(lines, {palette: ['333333']}, 'Contours every ' + step + ' m', true, 0.6);
  }
  info.setValue('Range shown: ' + Math.round(lo) + ' to ' + Math.round(hi) + ' m');
}
function update() {
  if (!autoChk.getValue()) { render(minS.getValue(), maxS.getValue()); return; }
  info.setValue('Measuring elevation range...');
  DEMS[demSel.getValue()]().reduceRegion({
    reducer: ee.Reducer.percentile([2, 98]), geometry: ee.Geometry(Map.getBounds(true)),
    scale: 200, bestEffort: true
  }).evaluate(function (v) {
    var lo = v && v.elev_p2 != null ? v.elev_p2 : 0, hi = v && v.elev_p98 != null ? v.elev_p98 : 1500;
    if (hi <= lo) hi = lo + 10;
    minS.setValue(lo, false); maxS.setValue(hi, false);
    render(lo, hi);
  });
}

// ---------- click twice: elevation profile ----------
var clicks = [], profileBox = ui.Panel();
var profileLayer = null;
Map.style().set('cursor', 'crosshair');
Map.onClick(function (c) {
  clicks.push([c.lon, c.lat]);
  if (clicks.length === 1) { profileBox.clear(); profileBox.add(ui.Label('Now click the end point.')); return; }
  var a = clicks[0], b = clicks[1]; clicks = [];
  var line = ee.Geometry.LineString([a, b]);
  if (profileLayer) Map.layers().remove(profileLayer);
  profileLayer = ui.Map.Layer(line, {color: 'FFFF00'}, 'Profile line');
  Map.layers().add(profileLayer);
  var lenKm = line.length().divide(1000);
  var n = 120, feats = [];
  for (var i = 0; i <= n; i++) {
    var t = i / n;
    feats.push(ee.Feature(ee.Geometry.Point([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]), {t: t}));
  }
  var fc = DEMS[demSel.getValue()]().reduceRegions(ee.FeatureCollection(feats), ee.Reducer.first(), 30)
    .map(function (f) { return f.set('km', ee.Number(f.get('t')).multiply(lenKm)); });
  var chart = ui.Chart.feature.byFeature(fc, 'km', 'first')
    .setChartType('AreaChart')
    .setOptions({title: 'Elevation profile', hAxis: {title: 'Distance (km)'}, vAxis: {title: 'Elevation (m)'},
                 legend: {position: 'none'}, pointSize: 0, lineWidth: 2});
  profileBox.clear(); profileBox.add(chart);
});

// ---------- panel ----------
var panel = ui.Panel({style: {width: '360px', padding: '8px'}});
panel.add(ui.Label('Elevation playground', {fontSize: '20px', fontWeight: 'bold'}));
panel.add(ui.Label('Dataset A')); panel.add(demSel);
panel.add(ui.Label('View')); panel.add(viewSel);
panel.add(ui.Label('Color palette')); panel.add(palSel);
panel.add(ui.Label('Vertical exaggeration (x)')); panel.add(exagS);
panel.add(ui.Label('Sun direction (azimuth, degrees)')); panel.add(azS);
panel.add(ui.Label('Sun height above horizon (degrees)')); panel.add(sunS);
panel.add(ui.Label('Shading strength')); panel.add(shadeS);
panel.add(autoChk);
panel.add(ui.Label('Low color limit (m)')); panel.add(minS);
panel.add(ui.Label('High color limit (m)')); panel.add(maxS);
panel.add(contourChk); panel.add(ui.Label('Contour interval (m)')); panel.add(contourS);
panel.add(ui.Label('For the difference view', {fontWeight: 'bold'}));
panel.add(ui.Label('Dataset B')); panel.add(demBSel);
panel.add(ui.Label('Hide differences smaller than (m)')); panel.add(diffS);
panel.add(ui.Button({label: 'Update map', onClick: update, style: {stretch: 'horizontal'}}));
panel.add(info);
panel.add(ui.Label('Click two points for a profile:', {fontWeight: 'bold'}));
panel.add(profileBox);
ui.root.insert(0, panel);
update();
