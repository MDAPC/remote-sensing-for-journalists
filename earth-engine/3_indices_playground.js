// =====================================================================
// 3. INDICES PLAYGROUND (Sentinel-2)  |  Google Earth Engine
// NDVI, NDWI, NDMI, NBR, NDBI with before / after / difference,
// a change threshold, an optional water mask, and a click time series.
// =====================================================================

Map.setCenter(35.98, 35.62, 11);   // change to your area
Map.setOptions('HYBRID');

// name: [band A, band B, min, max, palette]   index = (A - B) / (A + B)
var IDX = {
  NDVI: ['B8', 'B4', -0.2, 0.9, ['2766B0', 'D9C9A3', 'E6D76A', '8CBF4F', '1E6B38']],
  NDWI: ['B3', 'B8', -0.6, 0.6, ['8C6D46', 'E9E4D4', '1F4E8C']],
  NDMI: ['B8', 'B11', -0.4, 0.6, ['7A3410', 'E0B070', 'D9E0B0', '5FA8A0', '1F5F8B']],
  NBR:  ['B8', 'B12', -0.5, 0.8, ['5E0F0B', 'C9532E', 'E8C77E', '7FB069', '2D6A3E']],
  NDBI: ['B11', 'B8', -0.5, 0.4, ['1F6E3A', '8CBF4F', 'E9E4D4', 'D9A07A', '8E2F2F']]
};
var NOTES = {
  NDVI: 'Plants: chlorophyll absorbs red, leaf cells reflect NIR.',
  NDWI: 'Water: reflects some green, absorbs NIR. Above 0 = water.',
  NDMI: 'Moisture in leaves absorbs SWIR. Low = dry or stressed.',
  NBR:  'Burns: NIR drops, SWIR rises. Before minus after = dNBR.',
  NDBI: 'Built-up: SWIR above NIR. Bare and burned ground also score high.'
};

// ---------- knobs ----------
var idxSel  = ui.Select({items: Object.keys(IDX), value: 'NBR', onChange: function (k) { note.setValue(NOTES[k]); }});
var viewSel = ui.Select({items: ['After', 'Before', 'Difference (before minus after)'], value: 'Difference (before minus after)'});
var bStart = ui.Textbox({value: '2025-01-15', style: {width: '120px'}});
var bEnd   = ui.Textbox({value: '2025-03-01', style: {width: '120px'}});
var aStart = ui.Textbox({value: '2025-03-15', style: {width: '120px'}});
var aEnd   = ui.Textbox({value: '2025-05-01', style: {width: '120px'}});
var cloudS = ui.Slider({min: 0, max: 100, value: 30, step: 5, style: {stretch: 'horizontal'}});
var thS    = ui.Slider({min: 0, max: 0.6, value: 0.1, step: 0.02, style: {stretch: 'horizontal'}});
var waterChk = ui.Checkbox('Mask water (NDWI above 0)', true);
var opS    = ui.Slider({min: 0, max: 1, value: 0.85, step: 0.05, style: {stretch: 'horizontal'}});
var note = ui.Label(NOTES.NBR, {color: '#555'});
var chartBox = ui.Panel();
var info = ui.Label('');

// ---------- data ----------
function maskClouds(img) {
  var scl = img.select('SCL');
  return img.updateMask(scl.eq(3).or(scl.eq(8)).or(scl.eq(9)).or(scl.eq(10)).not());
}
function col(start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(ee.Geometry(Map.getBounds(true)))
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloudS.getValue()))
    .map(maskClouds);
}
function index(img, name) {
  var d = IDX[name];
  return img.normalizedDifference([d[0], d[1]]).rename(name);
}

function update() {
  Map.layers().reset();
  var name = idxSel.getValue(), d = IDX[name];
  var beforeImg = col(bStart.getValue(), bEnd.getValue()).median();
  var afterImg  = col(aStart.getValue(), aEnd.getValue()).median();
  var before = index(beforeImg, name), after = index(afterImg, name);
  var waterMask = afterImg.normalizedDifference(['B3', 'B8']).lt(0);
  var view = viewSel.getValue();
  var layer, vis;
  if (view === 'After')       { layer = after;  vis = {min: d[2], max: d[3], palette: d[4]}; }
  else if (view === 'Before') { layer = before; vis = {min: d[2], max: d[3], palette: d[4]}; }
  else {
    var diff = before.subtract(after).rename('diff');
    layer = diff.updateMask(diff.abs().gte(thS.getValue()));
    vis = {min: -0.6, max: 0.6, palette: ['2166AC', 'F7F7F7', 'B2182B']};
  }
  if (waterChk.getValue() && name !== 'NDWI') layer = layer.updateMask(waterMask);
  Map.addLayer(afterImg, {bands: ['B4', 'B3', 'B2'], min: 0, max: 3000}, 'True color (after)', false);
  Map.addLayer(layer, vis, name + ': ' + view, true, opS.getValue());
  info.setValue(view.indexOf('Difference') === 0
    ? 'Red = value dropped (e.g. vegetation or burn loss). Blue = value rose.'
    : 'Range shown: ' + d[2] + ' to ' + d[3] + '.');
}

// ---------- click: index time series ----------
Map.style().set('cursor', 'crosshair');
Map.onClick(function (c) {
  var name = idxSel.getValue();
  var pt = ee.Geometry.Point(c.lon, c.lat);
  var series = col(bStart.getValue(), aEnd.getValue()).map(function (img) {
    return index(img, name).copyProperties(img, ['system:time_start']);
  });
  var chart = ui.Chart.image.series(series, pt, ee.Reducer.mean(), 20)
    .setOptions({title: name + ' over time', pointSize: 4, lineWidth: 1, legend: {position: 'none'}});
  chartBox.clear(); chartBox.add(chart);
});

// ---------- panel ----------
function row(label, w) { return ui.Panel([ui.Label(label, {width: '70px'}), w], ui.Panel.Layout.flow('horizontal')); }
var panel = ui.Panel({style: {width: '350px', padding: '8px'}});
panel.add(ui.Label('Indices playground', {fontSize: '20px', fontWeight: 'bold'}));
panel.add(ui.Label('Index')); panel.add(idxSel); panel.add(note);
panel.add(ui.Label('View')); panel.add(viewSel);
panel.add(ui.Label('Before period', {fontWeight: 'bold'}));
panel.add(row('From', bStart)); panel.add(row('To', bEnd));
panel.add(ui.Label('After period', {fontWeight: 'bold'}));
panel.add(row('From', aStart)); panel.add(row('To', aEnd));
panel.add(ui.Label('Max cloud % per image')); panel.add(cloudS);
panel.add(ui.Label('Hide changes smaller than')); panel.add(thS);
panel.add(waterChk);
panel.add(ui.Label('Layer opacity')); panel.add(opS);
panel.add(ui.Button({label: 'Update map', onClick: update, style: {stretch: 'horizontal'}}));
panel.add(info);
panel.add(ui.Label('Click the map for a time series:', {fontWeight: 'bold'}));
panel.add(chartBox);
ui.root.insert(0, panel);
update();
