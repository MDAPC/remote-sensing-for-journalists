// =====================================================================
// 4. COHERENCE AND CHANGE ASSESSMENT  |  Google Earth Engine
//
// Two modes:
// A) INTENSITY CORRELATION (works out of the box)
//    Earth Engine only stores Sentinel-1 GRD (no phase), so true InSAR
//    coherence cannot be computed here. Instead this measures how similar
//    the backscatter PATTERN is before and after, in a moving window.
//    Low correlation + strong intensity change = likely physical change
//    (collapse, fire, earthworks). Used in damage mapping research.
// B) TRUE INSAR COHERENCE (bring your own)
//    Make coherence rasters in SNAP (graph included) or ASF HyP3, upload
//    them as Earth Engine assets, and paste the asset IDs in the panel.
//    Coherence drop = pre-event coherence minus co-event coherence.
// =====================================================================

Map.setCenter(35.98, 35.62, 13);   // change to your area
Map.setOptions('HYBRID');

// ---------- knobs ----------
var polSel  = ui.Select({items: ['VV', 'VH'], value: 'VV'});
var passSel = ui.Select({items: ['ASCENDING', 'DESCENDING'], value: 'DESCENDING'});
var orbitBox = ui.Textbox({placeholder: 'relative orbit (optional)', style: {width: '150px'}});
var bStart = ui.Textbox({value: '2025-01-15', style: {width: '120px'}});
var bEnd   = ui.Textbox({value: '2025-03-01', style: {width: '120px'}});
var aStart = ui.Textbox({value: '2025-03-10', style: {width: '120px'}});
var aEnd   = ui.Textbox({value: '2025-04-15', style: {width: '120px'}});
var winS  = ui.Slider({min: 1, max: 10, value: 3, step: 1, style: {stretch: 'horizontal'}});
var rS    = ui.Slider({min: 0, max: 1, value: 0.4, step: 0.05, style: {stretch: 'horizontal'}});
var dS    = ui.Slider({min: 0, max: 8, value: 2, step: 0.5, style: {stretch: 'horizontal'}});
var preCohBox = ui.Textbox({placeholder: 'users/you/coh_pre', style: {stretch: 'horizontal'}});
var coCohBox  = ui.Textbox({placeholder: 'users/you/coh_co', style: {stretch: 'horizontal'}});
var cohDropS  = ui.Slider({min: 0, max: 0.8, value: 0.3, step: 0.05, style: {stretch: 'horizontal'}});
var info = ui.Label('');

// ---------- helpers ----------
function s1(start, end) {
  var c = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(ee.Geometry(Map.getBounds(true)))
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', polSel.getValue()))
    .filter(ee.Filter.eq('orbitProperties_pass', passSel.getValue()))
    .filterDate(start, end);
  var orb = orbitBox.getValue();
  if (orb) c = c.filter(ee.Filter.eq('relativeOrbitNumber_start', parseInt(orb, 10)));
  return c.select(polSel.getValue());
}
function toLinear(db) { return ee.Image(10).pow(db.divide(10)); }

function localCorrelation(a, b, r) {
  // Pearson correlation of a and b inside a (2r+1) x (2r+1) pixel window
  var k = ee.Kernel.square(r, 'pixels');
  var ma = a.reduceNeighborhood(ee.Reducer.mean(), k);
  var mb = b.reduceNeighborhood(ee.Reducer.mean(), k);
  var mab = a.multiply(b).reduceNeighborhood(ee.Reducer.mean(), k);
  var ma2 = a.pow(2).reduceNeighborhood(ee.Reducer.mean(), k);
  var mb2 = b.pow(2).reduceNeighborhood(ee.Reducer.mean(), k);
  var cov = mab.subtract(ma.multiply(mb));
  var sd = ma2.subtract(ma.pow(2)).multiply(mb2.subtract(mb.pow(2))).sqrt();
  return cov.divide(sd).rename('r');
}

// ---------- update ----------
function update() {
  Map.layers().reset();
  var preCol = s1(bStart.getValue(), bEnd.getValue());
  var postCol = s1(aStart.getValue(), aEnd.getValue());
  var preDb = preCol.median(), postDb = postCol.median();
  var r = localCorrelation(toLinear(preDb), toLinear(postDb), winS.getValue());
  var diff = postDb.subtract(preDb).rename('diff');   // dB
  var avgDiff = diff.reduceNeighborhood(ee.Reducer.mean(), ee.Kernel.square(winS.getValue(), 'pixels'));
  var flag = r.lt(rS.getValue()).and(avgDiff.abs().gte(dS.getValue()));

  Map.addLayer(preDb, {min: -25, max: 0}, 'Before (dB)', false);
  Map.addLayer(postDb, {min: -25, max: 0}, 'After (dB)', false);
  Map.addLayer(diff, {min: -6, max: 6, palette: ['2166AC', 'F7F7F7', 'B2182B']}, 'Intensity change (dB)', false);
  Map.addLayer(r, {min: 0, max: 1, palette: ['B2182B', 'F4A582', 'F7F7F7', '92C5DE', '2166AC']},
    'Intensity correlation (red = low)', true, 0.7);
  Map.addLayer(flag.selfMask(), {palette: ['FFD400']}, 'Likely change (yellow)');

  // True coherence from your own assets
  var pre = preCohBox.getValue(), co = coCohBox.getValue();
  if (pre && co) {
    var cPre = ee.Image(pre).select(0), cCo = ee.Image(co).select(0);
    var drop = cPre.subtract(cCo).rename('drop');
    Map.addLayer(cPre, {min: 0, max: 1, palette: ['000000', 'FFFFFF']}, 'Coherence pre-event', false);
    Map.addLayer(cCo, {min: 0, max: 1, palette: ['000000', 'FFFFFF']}, 'Coherence co-event', false);
    Map.addLayer(drop.updateMask(drop.gte(cohDropS.getValue())),
      {min: 0, max: 0.8, palette: ['FFF5B0', 'FD8D3C', 'BD0026']}, 'Coherence drop (damage proxy)');
  }

  preCol.size().evaluate(function (n1) {
    postCol.size().evaluate(function (n2) {
      info.setValue('Images: ' + n1 + ' before, ' + n2 + ' after. Keep one relative orbit for clean results.');
    });
  });
}

// ---------- click: values ----------
var clickLbl = ui.Label('');
Map.style().set('cursor', 'crosshair');
Map.onClick(function (c) {
  clickLbl.setValue('Reading...');
  var pt = ee.Geometry.Point(c.lon, c.lat);
  var pre = s1(bStart.getValue(), bEnd.getValue()).median();
  var post = s1(aStart.getValue(), aEnd.getValue()).median();
  var r = localCorrelation(toLinear(pre), toLinear(post), winS.getValue());
  ee.Image.cat([pre.rename('pre'), post.rename('post'), r])
    .reduceRegion(ee.Reducer.first(), pt, 10).evaluate(function (v) {
      if (!v || v.r === null) { clickLbl.setValue('No data here.'); return; }
      clickLbl.setValue('Before ' + v.pre.toFixed(1) + ' dB, after ' + v.post.toFixed(1) +
        ' dB, correlation ' + v.r.toFixed(2));
    });
});

// ---------- panel ----------
function row(label, w) { return ui.Panel([ui.Label(label, {width: '70px'}), w], ui.Panel.Layout.flow('horizontal')); }
var panel = ui.Panel({style: {width: '360px', padding: '8px'}});
panel.add(ui.Label('Coherence and change', {fontSize: '20px', fontWeight: 'bold'}));
panel.add(ui.Label('A) Intensity correlation (Sentinel-1 GRD)', {fontWeight: 'bold'}));
panel.add(row('Pol', polSel)); panel.add(row('Pass', passSel)); panel.add(row('Orbit', orbitBox));
panel.add(ui.Label('Before period')); panel.add(row('From', bStart)); panel.add(row('To', bEnd));
panel.add(ui.Label('After period'));  panel.add(row('From', aStart)); panel.add(row('To', aEnd));
panel.add(ui.Label('Window radius (pixels, 10 m each)')); panel.add(winS);
panel.add(ui.Label('Flag if correlation below')); panel.add(rS);
panel.add(ui.Label('... and intensity change above (dB)')); panel.add(dS);
panel.add(ui.Label('B) True InSAR coherence (your assets)', {fontWeight: 'bold'}));
panel.add(ui.Label('Pre-event coherence asset ID')); panel.add(preCohBox);
panel.add(ui.Label('Co-event coherence asset ID')); panel.add(coCohBox);
panel.add(ui.Label('Show coherence drops above')); panel.add(cohDropS);
panel.add(ui.Button({label: 'Update map', onClick: update, style: {stretch: 'horizontal'}}));
panel.add(info);
panel.add(ui.Label('Click the map to read values:', {fontWeight: 'bold'}));
panel.add(clickLbl);
ui.root.insert(0, panel);
update();
