Github repository with some avgeek chrome extensions

# description

 * extensions/adsb-rings-ext
    - modify native adsbexchange rings
    - add custom layer with STAR/SIDs

 * extensions/fr24-filter-ext
    - filter following pages to keep only interesting planes
    
https://www.flightradar24.com/data/airports/bod/arrivals
https://www.flightradar24.com/data/airports/bod/departures
https://www.airnavradar.com/data/airports/LFBD?tab=departures
https://www.airnavradar.com/data/airports/LFBd?tab=arrivals

Note it works with other airports

# installation

 - download repository locally
 - Go to chrome://extensions/
 - Topright of screen, activate developer mode
 - click on "load unpacked extension"
 - browse and select folder of the extension

# contribute to adsb-rings-ext

WORK IN PROGRESS 

For know I only provide LFBD STARs and RWY23 SID but we can add anything.

Here are my steps 

 - go to AIP airport page, ie https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_16_APR_2026/FRANCE/AIRAC-2026-04-16/html/eAIP/FR-AD-2.LFBD-fr-FR.html
 - download PDF charts, ie AD_2_LFBD_DATA_SID_RWY23_RNAV_CODE_01.pdf
 - go to AIP ENR4.4 page and complete every needed GPS points, ie ./inputs/LFBD_points.txt
 - use scripts/pdf_to_csv.py to help information extraction (it can also be done by hand)
 - from generated CSV, manually format it properly, see ./inputs/LFBD_sidstar_23.txt
 - use scripts/csv_to_geojson.py to transform csv to geoJSON, see ./data/LFBD_star_23.geojson
 - modify ./extensions/adsb-rings-ext/injected.js to load needed layers



