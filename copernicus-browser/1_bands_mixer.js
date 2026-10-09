//VERSION=3
// =====================================================================
// 1. BANDS MIXER (Sentinel-2 L2A)  |  Copernicus Browser custom script
// Turn the knobs below, then click "Set Custom Script".
// =====================================================================

// ---------------------------- KNOBS ----------------------------------
var R = "B04";   // band shown as RED    try: B08, B12, B11
var G = "B03";   // band shown as GREEN  try: B04, B8A, B08
var B = "B02";   // band shown as BLUE   try: B03, B04, B02
//  True color      B04 B03 B02      Color infrared  B08 B04 B03
//  Burn scars      B12 B8A B04      Agriculture     B11 B08 B02
//  Geology         B12 B11 B02
var GAIN  = 2.5;   // brightness: raise for dark scenes, lower for deserts
var GAMMA = 1.0;   // contrast curve: below 1 lifts shadows, above 1 deepens them
// ---------------------------------------------------------------------

function unique(list) {
  var out = [];
  for (var i = 0; i < list.length; i++) if (out.indexOf(list[i]) < 0) out.push(list[i]);
  return out;
}
function setup() {
  return {
    input: [{ bands: unique([R, G, B, "dataMask"]) }],
    output: { bands: 4 }
  };
}
function adj(v) {
  return Math.pow(Math.min(1, Math.max(0, v * GAIN)), GAMMA);
}
function evaluatePixel(s) {
  return [adj(s[R]), adj(s[G]), adj(s[B]), s.dataMask];
}
