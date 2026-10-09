# Remote sensing for journalists

Hands-on material from a remote sensing session I taught to journalists at a Tactical Tech workshop. The goal was simple: leave the room able to open free satellite data and check something yourself. Everything here runs in a browser, on free accounts, with no installation.

There are two parts:

- **Explainers**: three short illustrated pages that build the intuition (how bands work, why indices are ratios, what radar wavelength and polarisation change).
- **Playgrounds**: scripts with the controls on screen ("knobs"), so participants change one thing at a time and see what happens, instead of editing code.

## Explainers

Open them in any browser.

| Page | What it covers |
|---|---|
| [Satellite bands](explainers/satellite-bands.html) | Every surface reflects light in its own pattern. The 13 Sentinel-2 bands, and which combinations reveal burn scars, stressed crops or flooded fields. |
| [Satellite indices](explainers/satellite-indices.html) | One recipe, many indices: NDVI, NDWI, NDMI, NBR, NDBI. Why they divide by the sum, and how to read the result. |
| [Radar wavelength and polarisation](explainers/radar-wavelength-polarisation.html) | Radar brings its own light. How wavelength decides what radar sees, and how VV and VH polarisation separate surfaces from vegetation. |

## Google Earth Engine playgrounds

Paste a script into the [Earth Engine Code Editor](https://code.earthengine.google.com/) and press **Run**. The controls appear in a panel on the left. Each script starts over the Syrian coast; pan to your own area and press **Update**.

| Script | What you can do |
|---|---|
| [1. Bands](earth-engine/1_bands_playground.js) | Mix Sentinel-2 bands with presets (true color, color infrared, burn scars, agriculture, geology), filter by cloud and date, and click any pixel to see its "light fingerprint" across all bands. |
| [2. Radar](earth-engine/2_radar_playground.js) | Sentinel-1 C-band in VV, VH or a combined view, by orbit direction, with speckle smoothing and before/after change detection. Compare with ALOS PALSAR-2 L-band to see what a longer wavelength changes. Click the map for a VV/VH time series. |
| [3. Indices](earth-engine/3_indices_playground.js) | NDVI, NDWI, NDMI, NBR and NDBI before, after and as a difference, with a change threshold, an optional water mask and a click time series. |
| [4. Coherence and change](earth-engine/4_coherence_damage.js) | Two ways to find physical change such as collapse, fire or earthworks. A: intensity correlation of Sentinel-1 backscatter before and after, which works out of the box. B: bring your own true InSAR coherence rasters made in SNAP or ASF HyP3 and compare pre-event and co-event coherence. |
| [5. Elevation](earth-engine/5_elevation_playground.js) | Compare four free global elevation models (Copernicus GLO-30, SRTM, NASADEM, ALOS AW3D30), exaggerate relief, move the sun, draw contours, and click two points for an elevation profile, useful for checking what a camera could have seen. |

## Copernicus Browser scripts

In the [Copernicus Browser](https://browser.dataspace.copernicus.eu/), choose the collection named in the script, open **Custom script**, paste it, and click **Set Custom Script**. The knobs are at the top of each script.

| Script | Collection | What it does |
|---|---|---|
| [1. Bands mixer](copernicus-browser/1_bands_mixer.js) | Sentinel-2 L2A | Choose any three bands for red, green and blue, with brightness and contrast controls and the classic combinations listed in the script. |
| [2. Radar views](copernicus-browser/2_radar_views.js) | Sentinel-1 IW, VV+VH | VV, VH, a three-color composite or the VV/VH ratio in decibels, with water painted blue. |
| [3. Indices](copernicus-browser/3_indices.js) | Sentinel-2 L2A | NDVI, NDWI, NDMI, NBR or NDBI with a color ramp, an optional water mask, and a mode that shows only likely burned pixels. Also enables the time-series chart. |

## Suggested order

1. Read the explainer for a topic before opening its playground.
2. Try the Copernicus Browser version first: nothing to install, results in one click.
3. Move to Earth Engine for time series, change detection and radar.

## Notes

- All data used here is free: Sentinel-1 and Sentinel-2 (Copernicus), ALOS PALSAR-2 (JAXA) and global elevation models. Earth Engine needs a free account.
- Satellite data has limits: cloud cover, revisit gaps, pixel size and radar speckle. Keep them in mind before drawing conclusions.
- Script 4 refers to a SNAP processing graph for true InSAR coherence; that graph is not in this repository yet.

## License

Scripts: [MIT](LICENSE). Explainer pages: [CC BY 4.0](explainers/LICENSE.md).

## Author

Mahmoud Alaashik, OSINT and remote sensing analyst. Other work: the [SyriaInfo Syria Trees app](https://s-i.users.earthengine.app/view/syriainfo-syria-trees) and [SyriaInfo](https://syriainfo.substack.com).
