//VERSION=3
// =====================================================================
// 2. RADAR VIEWS (Sentinel-1 GRD, IW, dual polarisation VV+VH)
// Copernicus Browser custom script. Select Sentinel-1 IW with VV+VH.
// Turn the knobs below, then click "Set Custom Script".
// =====================================================================

// ---------------------------- KNOBS ----------------------------------
var MODE   = "RGB";  // "VV", "VH", "RGB", "RATIO"
//  VV    : surfaces, water and buildings (double bounce)
//  VH    : vegetation detector (volume scattering)
//  RGB   : red = VV, green = VH, blue = VV minus VH
//  RATIO : VV minus VH. Bright = smooth or built, dark = vegetation
var DB_MIN = -25;    // darkest value shown (dB). Water sits near -25 and below
var DB_MAX = 0;      // brightest value shown (dB). Buildings reach 0 and above
var WATER_DB = -20;  // pixels darker than this in VV are painted blue (set -99 to turn off)
// ---------------------------------------------------------------------

function setup() {
  return {
    input: [{ bands: ["VV", "VH", "dataMask"] }],
    output: { bands: 4 }
  };
}
function toDb(x) { return 10 * Math.log(Math.max(x, 1e-6)) / Math.LN10; }
function st(v, a, b) { return Math.min(1, Math.max(0, (v - a) / (b - a))); }

function evaluatePixel(s) {
  var vv = toDb(s.VV), vh = toDb(s.VH);
  if (vv < WATER_DB) return [0.1, 0.3, 0.7, s.dataMask];
  if (MODE == "VV")    { var a = st(vv, DB_MIN, DB_MAX);         return [a, a, a, s.dataMask]; }
  if (MODE == "VH")    { var b = st(vh, DB_MIN - 5, DB_MAX - 5); return [b, b, b, s.dataMask]; }
  if (MODE == "RATIO") { var r = st(vv - vh, 1, 15);             return [r, r, r, s.dataMask]; }
  return [st(vv, DB_MIN + 5, DB_MAX), st(vh, DB_MIN, DB_MAX - 5), st(vv - vh, 1, 15), s.dataMask];
}
