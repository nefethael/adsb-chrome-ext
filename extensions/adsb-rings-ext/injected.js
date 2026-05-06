console.log("[SIDSTAR] Script injecté dans la page");

// ------------------------------
// Optionnel : ton code existant
// ------------------------------
if (typeof drawSiteCircle === "function") {
  console.log("[SIDSTAR] drawSiteCircle détectée");
  SiteCirclesDistances = [4, 10, 20, 30, 40];
  drawSiteCircle();
}

// ------------------------------
// Fonction principale
// ------------------------------
async function loadSIDSTAR() {

  try {

    const url_sid = "https://raw.githubusercontent.com/nefethael/adsb-chrome-ext/main/data/LFBD_sid_05.geojson";
	const url_star = "https://raw.githubusercontent.com/nefethael/adsb-chrome-ext/main/data/LFBD_star_05.geojson";

    const geojson_sid = await fetch(url_sid).then(r => r.json());
	const geojson_star = await fetch(url_star).then(r => r.json());

    console.log("[SIDSTAR] GeoJSON chargé", geojson_sid);
	console.log("[SIDSTAR] GeoJSON chargé", geojson_star);

    // ------------------------------
    // 1. LAYER LIGNES
    // ------------------------------
    const lineFeatures_sid = new ol.format.GeoJSON().readFeatures(geojson_sid, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857"
    });

    const lineFeatures_star = new ol.format.GeoJSON().readFeatures(geojson_star, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857"
    });

    const lineLayer_sid = new ol.layer.Vector({
        type: "overlay",
        title: "SID_23",
        name: "SID_23",
        zIndex: 99,
        visible: 1,				
      source: new ol.source.Vector({
        features: lineFeatures_sid
      }),
      style: function(feature) {
        return new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: "rgba(213, 213, 153, 1)",
            width: 2
          })
        });
      }
    });
	
    const lineLayer_star = new ol.layer.Vector({
        type: "overlay",
        title: "STAR_23",
        name: "STAR_23",
        zIndex: 99,
        visible: 1,				
      source: new ol.source.Vector({
        features: lineFeatures_star
      }),
      style: function(feature) {
        return new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: "rgba(241, 199, 241, 1)",
            width: 2
          })
        });
      }
    });	

    // ------------------------------
    // 2. GÉNÉRATION DES POINTS
    // ------------------------------
    const pointMap = new Map();

    geojson_sid.features.forEach(feature => {

      const coords = feature.geometry.coordinates;
      const names = feature.properties.points;

      coords.forEach((coord, i) => {

        const name = names?.[i];
        if (!name) return;

        const key = name.trim().toUpperCase();

        if (pointMap.has(key)) return;

        const point = new ol.Feature({
          geometry: new ol.geom.Point(
            ol.proj.fromLonLat(coord)
          ),
          name: name
        });

        pointMap.set(key, point);
      });
    });
	
    geojson_star.features.forEach(feature => {

      const coords = feature.geometry.coordinates;
      const names = feature.properties.points;

      coords.forEach((coord, i) => {

        const name = names?.[i];
        if (!name) return;

        const key = name.trim().toUpperCase();

        if (pointMap.has(key)) return;

        const point = new ol.Feature({
          geometry: new ol.geom.Point(
            ol.proj.fromLonLat(coord)
          ),
          name: name
        });

        pointMap.set(key, point);
      });
    });	

    const pointFeatures = Array.from(pointMap.values());

    console.log("[SIDSTAR] Points générés:", pointFeatures.length);

    // ------------------------------
    // 3. LAYER POINTS (◇ + labels)
    // ------------------------------
	const diamondLayer = new ol.layer.Vector({
        type: "overlay",
        title: "PTS",
        name: "sidstarpts",
        zIndex: 99,
        visible: 1,		
	  source: new ol.source.Vector({
		features: pointFeatures
	  }),
	  style: function(feature) {

		const zoom = OLMap.getView().getZoom();

		return new ol.style.Style({
		  text: new ol.style.Text({
			text: zoom > 7 ? "◇" : "",
			font: "12px Arial",
			textAlign: "center",
			textBaseline: "middle",
			fill: new ol.style.Fill({ color: "#000" }),
			stroke: new ol.style.Stroke({ color: "#fff", width: 2 })
		  })
		});
	  }
	});

	const labelLayer = new ol.layer.Vector({
        type: "overlay",
        title: "PTS2",
        name: "sidstarlabel",
        zIndex: 99,
        visible: 1,		
	  source: new ol.source.Vector({
		features: pointFeatures
	  }),
	  style: function(feature) {

		const zoom = OLMap.getView().getZoom();

		return new ol.style.Style({
		  text: new ol.style.Text({
			text: zoom > 7 ? feature.get("name") : "",
			offsetX: 10,   // décalage horizontal
			offsetY: -10,  // décalage vertical
			font: "11px Arial",
			fill: new ol.style.Fill({ color: "#000" }),
			stroke: new ol.style.Stroke({ color: "#fff", width: 2 })
		  })
		});
	  }
	});

	lineLayer_sid.setZIndex(99);
	lineLayer_star.setZIndex(99);
	diamondLayer.setZIndex(100);
	labelLayer.setZIndex(101);

    // ------------------------------
    // 4. INJECTION DANS LA CARTE
    // ------------------------------
    if (typeof layers === "object") {

      const group = new ol.layer.Group({
        name: "custom_vpr",
        title: "Custom VPR",
        layers: [lineLayer_sid, lineLayer_star , labelLayer, diamondLayer]
      });

      layers.push(group);

      console.log("[SIDSTAR] Layer injectée avec succès");

    } else {
      console.warn("[SIDSTAR] layers non disponible !");
    }

  } catch (err) {
    console.error("[SIDSTAR] erreur :", err);
  }
}

// ------------------------------
// Attente OpenLayers
// ------------------------------
function waitForMap() {
  return new Promise(resolve => {
    const i = setInterval(() => {
      if (typeof layers === "object") {
        clearInterval(i);
        resolve();
      }
    }, 500);
  });
}

// ------------------------------
// Lancement
// ------------------------------
(async function () {

  if (window.__SIDSTAR_LOADED__) return;
  window.__SIDSTAR_LOADED__ = true;

  await waitForMap();

  console.log("[SIDSTAR] OpenLayers prêt");

  loadSIDSTAR();

})();