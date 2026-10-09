// =====================================================================
// 2. RADAR PLAYGROUND (Sentinel-1 C-band + ALOS PALSAR-2 L-band)
// Google Earth Engine. Paste into the Code Editor and press Run.
// Knobs: polarisation view, orbit direction, speckle smoothing, dB range,
// before/after change detection, and an L-band layer to compare wavelengths.
// Click the map for a VV / VH time series.
// =====================================================================

Map.setCenter(35.98, 35.62, 11);   // change to your area
Map.setOptions('HYBRID');

var VIEWS = ['VV', 'VH', 'RGB: VV, VH, VV minus VH', 'Change: after minus before (VV)', 'Change: after minus before (VH)'];

// ---------- knobs ----------
var viewSel  = ui.Select({items: VIEWS, value: 'RGB: VV, VH, VV minus VH'});
var passSel  = ui.Select({items: ['BOTH', 'ASCENDING', 'DESCENDING'], value: 'BOTH'});
var bStart = ui.Textbox({value: '2025-02-01', style: {width: '120px'}});
var bEnd   = ui.Textbox({value: '2025-03-01', style: {width: '120px'}});
var aStart = ui.Textbox({value: '2025-03-10', style: {width: '120px'}});
var aEnd   = ui.Textbox({value: '2025-04-10', style: {width: '120px'}});
var speckleS = ui.Slider({min: 0, max: 60, value: 20, step: 10, style: {stretch: 'horizontal'}});
// Sliders use positive numbers (Earth Engine sliders fail with negative ranges)
var minS = ui.Slider({min: 5, max: 35, value: 25, step: 1, style: {stretch: 'horizontal'}});   // dark limit = minus this
var maxS = ui.Slider({min: 0, max: 15, value: 0, step: 1, style: {stretch: 'horizontal'}});    // bright limit = minus this
var changeS = ui.Slider({min: 0, max: 6, value: 2, step: 0.5, style: {stretch: 'horizontal'}});
var lbandChk = ui.Checkbox('Add L-band (ALOS PALSAR-2 yearly mosaic)', false);
var yearS = ui.Slider({min: 2015, max: 2024, value: 2020, step: 1, style: {stretch: 'horizontal'}});
var chartBox = ui.Panel();
var info = ui.Label('');

// ---------- data ----------
function s1(start, end) {
  var c = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(ee.Geometry(Map.getBounds(true)))
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .filterDate(start, end);
  if (passSel.getValue() !== 'BOTH') c = c.filter(ee.Filter.eq('orbitProperties_pass', passSel.getValue()));
  return c.select(['VV', 'VH']);   // values are already in dB
}
function smooth(img) {
  var r = speckleS.getValue();
  return r > 0 ? img.focal_median(r, 'circle', 'meters') : img;
}

function update() {
  Map.layers().reset();
  var view = viewSel.getValue();
  var after = smooth(s1(aStart.getValue(), aEnd.getValue()).median());
  var lo = -minS.getValue(), hi = -maxS.getValue();

  if (view === 'VV') {
    Map.addLayer(after.select('VV'), {min: lo, max: hi}, 'VV (after dates)');
  } else if (view === 'VH') {
    Map.addLayer(after.select('VH'), {min: lo - 5, max: hi - 5}, 'VH (after dates)');
  } else if (view.indexOf('RGB') === 0) {
    var rgb = ee.Image.cat([after.select('VV'), after.select('VH'), after.select('VV').subtract(after.select('VH'))]);
    Map.addLayer(rgb, {min: [lo + 5, lo, 1], max: [hi, hi - 5, 15]}, 'RGB: VV, VH, VV minus VH');
  } else {
    var band = view.indexOf('(VV)') > 0 ? 'VV' : 'VH';
    var before = smooth(s1(bStart.getValue(), bEnd.getValue()).median());
    var diff = after.select(band).subtract(before.select(band));      // dB difference = log ratio
    var th = changeS.getValue();
    var masked = diff.updateMask(diff.abs().gte(th));
    Map.addLayer(before.select(band), {min: lo, max: hi}, 'Before (' + band + ')', false);
    Map.addLayer(after.select(band), {min: lo, max: hi}, 'After (' + band + ')', false);
    Map.addLayer(masked, {min: -6, max: 6, palette: ['#2166AC', '#F7F7F7', '#B2182B']},
      'Change ' + band + ' (blue = darker, red = brighter)');
  }

  if (lbandChk.getValue()) {
    var y = yearS.getValue();
    var pal = ee.ImageCollection('JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH')
      .filterDate(y + '-01-01', (y + 1) + '-01-01').mosaic();
    // Digital numbers to dB: 10 * log10(DN^2) - 83
    var palDb = pal.select(['HH', 'HV']).toFloat().pow(2).log10().multiply(10).subtract(83);
    Map.addLayer(palDb.select('HH'), {min: -20, max: 0}, 'L-band HH ' + y);
    Map.addLayer(palDb.select('HV'), {min: -28, max: -8}, 'L-band HV ' + y);
  }
  s1(aStart.getValue(), aEnd.getValue()).size().evaluate(function (n) {
    info.setValue(n + ' Sentinel-1 images in the after period.');
  });
}

// ---------- click: time series ----------
Map.style().set('cursor', 'crosshair');
Map.onClick(function (c) {
  var pt = ee.Geometry.Point(c.lon, c.lat);
  var col = s1(bStart.getValue(), aEnd.getValue());
  var chart = ui.Chart.image.series(col, pt, ee.Reducer.mean(), 10)
    .setOptions({title: 'Radar echo over time (dB)', vAxis: {title: 'dB'}, pointSize: 3, lineWidth: 1});
  chartBox.clear(); chartBox.add(chart);
});

// ---------- panel ----------
function row(label, w) { return ui.Panel([ui.Label(label, {width: '70px'}), w], ui.Panel.Layout.flow('horizontal')); }
var panel = ui.Panel({style: {width: '350px', padding: '8px'}});
panel.add(ui.Label('Radar playground', {fontSize: '20px', fontWeight: 'bold'}));
panel.add(ui.Label('View')); panel.add(viewSel);
panel.add(row('Orbit', passSel));
panel.add(ui.Label('Before period (for change)', {fontWeight: 'bold'}));
panel.add(row('From', bStart)); panel.add(row('To', bEnd));
panel.add(ui.Label('After period (main image)', {fontWeight: 'bold'}));
panel.add(row('From', aStart)); panel.add(row('To', aEnd));
panel.add(ui.Label('Speckle smoothing radius (m)')); panel.add(speckleS);
panel.add(ui.Label('Dark limit: minus ... dB')); panel.add(minS);
panel.add(ui.Label('Bright limit: minus ... dB')); panel.add(maxS);
panel.add(ui.Label('Hide changes smaller than (dB)')); panel.add(changeS);
panel.add(lbandChk); panel.add(ui.Label('L-band year')); panel.add(yearS);
panel.add(ui.Button({label: 'Update map', onClick: update, style: {stretch: 'horizontal'}}));
panel.add(info);
panel.add(ui.Label('Click the map for a time series:', {fontWeight: 'bold'}));
panel.add(chartBox);
ui.root.insert(0, panel);
update();
