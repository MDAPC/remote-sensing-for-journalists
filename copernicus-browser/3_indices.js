//VERSION=3
// =====================================================================
// 3. INDICES (Sentinel-2 L2A)  |  Copernicus Browser custom script
// NDVI, NDWI, NDMI, NBR, NDBI. Also enables the time-series chart
// (statistics) in Copernicus Browser.
// Turn the knobs below, then click "Set Custom Script".
// =====================================================================

// ---------------------------- KNOBS ----------------------------------
var INDEX = "NDVI";      // "NDVI", "NDWI", "NDMI", "NBR", "NDBI"
var MASK_WATER = true;   // paint water grey (ignored for NDWI)
var HIGHLIGHT_BELOW = null;  // e.g. -0.1 with NBR: show only likely burned
                             // pixels in color, everything else in true color
// ---------------------------------------------------------------------

// index = (A - B) / (A + B), then color stops
var DEF = {
  NDVI: ["B08", "B04", [-0.2, 0, 0.2, 0.5, 0.9], ["#2766B0", "#D9C9A3", "#E6D76A", "#8CBF4F", "#1E6B38"]],
  NDWI: ["B03", "B08", [-0.6, 0, 0.6],           ["#8C6D46", "#E9E4D4", "#1F4E8C"]],
  NDMI: ["B08", "B11", [-0.4, -0.1, 0.1, 0.3, 0.6], ["#7A3410", "#E0B070", "#D9E0B0", "#5FA8A0", "#1F5F8B"]],
  NBR:  ["B08", "B12", [-0.5, -0.15, 0.05, 0.35, 0.8], ["#5E0F0B", "#C9532E", "#E8C77E", "#7FB069", "#2D6A3E"]],
  NDBI: ["B11", "B08", [-0.5, -0.2, 0, 0.1, 0.4], ["#1F6E3A", "#8CBF4F", "#E9E4D4", "#D9A07A", "#8E2F2F"]]
};

function setup() {
  return {
    input: [{ bands: ["B02", "B03", "B04", "B08", "B11", "B12", "dataMask"] }],
    output: [
      { id: "default", bands: 4 },
      { id: "index", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function rgb(hex) {
  return [parseInt(hex.substr(1, 2), 16) / 255, parseInt(hex.substr(3, 2), 16) / 255, parseInt(hex.substr(5, 2), 16) / 255];
}
var d = DEF[INDEX];
var COLORS = d[3].map(rgb);

function evaluatePixel(s) {
  var a = s[d[0]], b = s[d[1]];
  var val = (a - b) / (a + b);
  var ndwi = (s.B03 - s.B08) / (s.B03 + s.B08);
  var tc = [s.B04 * 2.5, s.B03 * 2.5, s.B02 * 2.5];
  var color;
  if (MASK_WATER && INDEX != "NDWI" && ndwi > 0) color = [0.75, 0.78, 0.8];
  else if (HIGHLIGHT_BELOW !== null && val >= HIGHLIGHT_BELOW) color = tc;
  else color = colorBlend(val, d[2], COLORS);
  return {
    default: [color[0], color[1], color[2], s.dataMask],
    index: [val],
    dataMask: [s.dataMask]
  };
}
