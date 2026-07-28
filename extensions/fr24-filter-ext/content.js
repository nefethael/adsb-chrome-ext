// ==========================
// CONFIG
// ==========================
const NIGHT_START = 22;
const NIGHT_END = 6;


// ==========================
// LOAD FILTERS
// ==========================
async function loadFilters() {
    const response = await fetch(chrome.runtime.getURL("filters.json"));
    return await response.json();
}


function isAirNavRadar() {
    return window.location.hostname.includes("airnavradar.com");
}

// ==========================
// PARSE DOM
// ==========================
function parseRowAirNavOld(row) {
    const getText = (selector) =>
        row.querySelector(selector)?.innerText.replace(/\s+/g, " ").trim();

    return {
        time: getText("#departureTime")?.split(" ")[0], // "07:00 CEST" → "07:00"
        flightNumber: getText("#fn"),
        origin: getText("#arrival"),
        airline: getText("#airline"),
        aircraft: getText("#aircraft")
    };
}

function clean(text) {
    return text?.replace(/\s+/g, " ").trim() ?? "";
}

function parseRowAirNav(row) {

    const get = selector => row.querySelector(selector);

    const timeText = clean(
        get('[title*="Central European"]')?.textContent
    );

    const aircraft_type = clean(
        get(".aircraft-view a[href*='/data/aircraft-models/']")?.textContent
    );

    const registration = clean(
        get(".aircraft-view a[href*='/data/registration/']")?.textContent
    );

    return {
        date: clean(row.querySelector(".padded-cell")?.textContent),

        time: timeText.substring(0,5),

        flightNumber: clean(
            get('a[href*="/data/flights/"]')?.textContent
        ),

        airport: clean(
            get(".arrival-view a")?.textContent
        ),

        airline: clean(
            get(".airline-view a")?.textContent
        ),

        aircraft: `${aircraft_type} (${registration})`
    };
}

function parseRow(row) {
    const tds = row.querySelectorAll("td");

    return {
        time: tds[0]?.innerText.trim(),
        flightNumber: row.querySelector(".cell-flight-number a.notranslate")?.innerText.trim(),
        origin: tds[2]?.innerText.trim(),
        airline: row.querySelector(".cell-airline a")?.innerText.trim(),
        aircraft: tds[4]?.innerText.trim()
    };
}


// ==========================
// TIME LOGIC
// ==========================
function isNightFlight(timeStr) {
    if (!timeStr) return false;

    const parts = timeStr.split(":");
    if (parts.length !== 2) return false;

    const hour = parseInt(parts[0], 10);

    return (hour >= NIGHT_START || hour < NIGHT_END);
}


// ==========================
// SPECIAL LIVERY
// ==========================
function isSpecialLivery(airline) {
    return airline && airline.includes("(");
}


// ==========================
// MATCH HELPERS
// ==========================
function matchExactOld(value, list) {
    return list.includes(value);
}

function matchExact(value, list) {
    const normalized = value.trim();
    return list.some(item => item.trim() === normalized);
}

function matchPartial(value, list) {
    return list.some(item => value.includes(item));
}


// ==========================
// MAIN LOGIC (TON ALGO)
// ==========================
function isNotInteresting(data, filters) {
    const airline = data.airline || "";
    const model = data.aircraft || "";
    const time = data.time || "";

    console.log("CHECK airline:", JSON.stringify(airline));
    console.log("CHECK model:", JSON.stringify(model));

    /*
    if (isSpecialLivery(airline)) {
        console.log("special livery -> interesting");
        return false;
    }
	*/

    const isCommonAirline = matchExact(airline, filters.common_airline);
    const isCommonAircraft = matchPartial(model, filters.common_aircraft);
    const isShortAircraft = matchPartial(model, filters.common_shortcraft);

    const isCargoAirline = matchExact(airline, filters.cargo_airline);
    const isCargoAircraft = matchPartial(model, filters.cargo_aircraft);

    console.log({
        isCommonAirline,
        isCommonAircraft,
        isShortAircraft,
        isCargoAirline,
        isCargoAircraft
    });

    if (isCommonAirline && (isCommonAircraft || isShortAircraft)) {
        console.log("common flight -> boring");
        return true;
    }

    if (isCargoAirline && (isCommonAircraft || isShortAircraft || isCargoAircraft)) {
        if (isNightFlight(time)) {
            console.log("night cargo -> boring");
            return true;
        }

        console.log("day cargo -> interesting");
        return false;
    }

    return false;
}


// ==========================
// UI APPLY
// ==========================
function applyStyle(row, type) {
    if (type === "hidden") {
        row.style.display = "none";
        return;
    }

/*
    if (type === "cargo") {
        row.style.backgroundColor = "#1e3a5f";
        row.style.color = "#8fd3ff";
        return;
    }

    if (type === "interesting") {
        row.style.backgroundColor = "#0f2f0f";
        row.style.color = "#66ff66";
        return;
    }
*/
}


// ==========================
// MAIN FILTER
// ==========================
async function runFilter() {
    const filters = await loadFilters();



	const rows = isAirNavRadar()
		? document.querySelectorAll(".canflxb")
		: document.querySelectorAll("tr[ng-repeat*='arrivals'], tr[ng-repeat*='departures']");


	rows.forEach(row => {
		
		if (row.dataset.filtered) return;

		const data = isAirNavRadar()
			? parseRowAirNav(row)
			: parseRow(row);

		if (!data) return;

		console.log("---------");
		console.log("Flight:", data.flightNumber);
		console.log("Airline raw:", JSON.stringify(data.airline));
		console.log("Aircraft raw:", JSON.stringify(data.aircraft));
		console.log("Time:", data.time);

		const notInteresting = isNotInteresting(data, filters);

		console.log("Result notInteresting:", notInteresting);

		if (notInteresting) {
			console.log("=> HIDE");
			applyStyle(row, "hidden");
		} else {
			const isCargoAirline = matchExact(
				data.airline || "",
				filters.cargo_airline
			);

			console.log("=> SHOW", isCargoAirline ? "cargo" : "interesting");

			if (isCargoAirline) {
				applyStyle(row, "cargo");
			} else {
				applyStyle(row, "interesting");
			}
		}

		row.dataset.filtered = "true";
	});
}


// ==========================
// OBSERVER (FR24 dynamique)
// ==========================
function observe() {
    const observer = new MutationObserver(() => {
        runFilter();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}


// ==========================
// INIT
// ==========================
//runFilter();
//observe();

setInterval(runFilter, 3000);