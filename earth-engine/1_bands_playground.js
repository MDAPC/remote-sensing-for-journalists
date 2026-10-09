// =====================================================================
// 1. BANDS PLAYGROUND (Sentinel-2)  |  Google Earth Engine
// Paste into code.earthengine.google.com and press Run.
// Knobs are in the left panel. Pan/zoom to your area, then press Update.
// Click any pixel to see its "light fingerprint" across all bands.
// =====================================================================

var BANDS = ['B1','B2','B3','B4','B5','B6','B7','B8','B8A','B9','B11','B12'];
var WL = {B1:443,B2:490,B3:560,B4:665,B5:705,B6:740,B7:783,B8:842,B8A:865,B9:945,B11:1610,B12:2190};
var PRESETS = {
  'True color (B4, B3, B2)':              ['B4','B3','B2'],
  'Color infrared (B8, B4, B3)':          ['B8','B4','B3'],
  'Burn scars / SWIR (B12, B8A, B4)':     ['B12','B8A','B4'],
  'Agriculture (B11, B8, B2)':            ['B11','B8','B2'],
  'Geology and bare ground (B12, B11, B2)': ['B12','B11','B2']
};

Map.setCenter(35.98, 35.62, 11);   // change to your area
Map.setOptions('HYBRID');

// ---------- knobs ----------
var startBox = ui.Textbox({value: '2025-04-01', style: {width: '130px'}});
var endBox   = ui.Textbox({value: '2025-05-15', style: {width: '130px'}});
var cloudS   = ui.Slider({min: 0, max: 100, value: 20, step: 5, style: {stretch: 'horizontal'}});
var maxS     = ui.Slider({min: 1000, max: 6000, value: 3000, step: 100, style: {stretch: 'horizontal'}});
var gammaS   = ui.Slider({min: 0.5, max: 2.0, value: 1.2, step: 0.05, style: {stretch: 'horizontal'}});
var rSel = ui.Select({items: BANDS, value: 'B4'});
var gSel = ui.Select({items: BANDS, value: 'B3'});
var bSel = ui.Select({items: BANDS, value: 'B2'});
var presetSel = ui.Select({
  items: Object.keys(PRESETS), placeholder: 'Choose a preset',
  onChange: function (k) { var p = PRESETS[k]; rSel.setValue(p[0]); gSel.setValue(p[1]); bSel.setValue(p[2]); update(); }
});
var chartBox = ui.Panel();
var info = ui.Label('');

// ---------- data ----------
var composite = null;
function maskClouds(img) {
  var scl = img.select('SCL');
  var bad = scl.eq(3).or(scl.eq(8)).or(scl.eq(9)).or(scl.eq(10));   // shadow, cloud, cirrus
  return img.updateMask(bad.not());
}
function update() {
  var region = ee.Geometry(Map.getBounds(true));
  var col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(region)
    .filterDate(startBox.getValue(), endBox.getValue())
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloudS.getValue()))
    .map(maskClouds);
  composite = col.median();
  var rgb = [rSel.getValue(), gSel.getValue(), bSel.getValue()];
  Map.layers().reset();
  Map.addLayer(composite, {bands: rgb, min: 0, max: maxS.getValue(), gamma: gammaS.getValue()},
               'R ' + rgb[0] + '  G ' + rgb[1] + '  B ' + rgb[2]);
  col.size().evaluate(function (n) { info.setValue(n + ' images used (median composite).'); });
}

// ---------- click: spectral fingerprint ----------
Map.style().set('cursor', 'crosshair');
Map.onClick(function (c) {
  if (!composite) return;
  var pt = ee.Geometry.Point(c.lon, c.lat);
  var vals = composite.select(BANDS).reduceRegion({reducer: ee.Reducer.mean(), geometry: pt, scale: 10});
  var arr = ee.Array(vals.values(BANDS)).divide(100);   // to %
  var chart = ui.Chart.array.values({array: arr, axis: 0, xLabels: BANDS.map(function (b) { return WL[b]; })})
    .setChartType('LineChart')
    .setOptions({title: 'Light fingerprint at ' + c.lat.toFixed(4) + ', ' + c.lon.toFixed(4),
                 hAxis: {title: 'Wavelength (nm)'}, vAxis: {title: 'Reflected light (%)'},
                 pointSize: 4, legend: {position: 'none'}});
  chartBox.clear(); chartBox.add(chart);
});

// ---------- panel ----------
function row(label, w) { return ui.Panel([ui.Label(label, {width: '70px'}), w], ui.Panel.Layout.flow('horizontal')); }
var panel = ui.Panel({style: {width: '340px', padding: '8px'}});
panel.add(ui.Label('Bands playground', {fontSize: '20px', fontWeight: 'bold'}));
panel.add(ui.Label('Choose which band goes into the red, green and blue of your screen.'));
panel.add(row('From', startBox)); panel.add(row('To', endBox));
panel.add(ui.Label('Max cloud % per image')); panel.add(cloudS);
panel.add(ui.Label('Preset')); panel.add(presetSel);
panel.add(row('Red', rSel)); panel.add(row('Green', gSel)); panel.add(row('Blue', bSel));
panel.add(ui.Label('Brightness (max value)')); panel.add(maxS);
panel.add(ui.Label('Contrast (gamma)')); panel.add(gammaS);
panel.add(ui.Button({label: 'Update map', onClick: update, style: {stretch: 'horizontal'}}));
panel.add(info);
panel.add(ui.Label('Click the map to see a pixel fingerprint:', {fontWeight: 'bold'}));
panel.add(chartBox);
ui.root.insert(0, panel);
update();
