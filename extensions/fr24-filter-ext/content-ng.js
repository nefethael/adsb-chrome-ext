//==================================================
// CONFIGURATION
//==================================================

const DEBUG = false;

const CONFIG = {

    refreshInterval: 3000,

    nightStart: 22,

    nightEnd: 6,

    colors: {

        interesting: "#0f2f0f",

        interestingText: "#66ff66",

        cargo: "#1e3a5f",

        cargoText: "#8fd3ff"

    }

};

//==================================================
// UTILS
//==================================================

function debug(...args) {

    if (DEBUG)
        console.log("[Spotter]", ...args);

}

function clean(text) {

    if (!text)
        return "";

    return text
        .replace(/\s+/g, " ")
        .trim();

}

function matchExact(value, list) {

    return list.includes(value);

}

function matchPartial(value, list) {

    return list.some(item => value.includes(item));

}

function isNight(time) {

    if (!time)
        return false;

    const parts = time.split(":");

    if (parts.length !== 2)
        return false;

    const hour = parseInt(parts[0]);

    return hour >= CONFIG.nightStart
        || hour < CONFIG.nightEnd;

}

//==================================================
// FLIGHT
//==================================================

class Flight {

    constructor(row) {

        this.row = row;

        this.source = "";

        this.date = "";

        this.time = "";

        this.flightNumber = "";

        this.airport = "";

        this.airline = "";

        this.aircraft = "";

        this.registration = "";

    }

}

//==================================================
// NORMALIZER
//==================================================

const AirlineAliases = {

    "Volotea Airlines": "Volotea",

    "Air France HOP": "Air France"

};

function normalizeAirline(name) {

    return AirlineAliases[name] ?? name;

}

//==================================================
// FILTERS
//==================================================

class Filters {

    constructor(json) {

        this.commonAirline = json.common_airline;

        this.commonAircraft = json.common_aircraft;

        this.commonShortAircraft = json.common_shortcraft;

        this.cargoAirline = json.cargo_airline;

        this.cargoAircraft = json.cargo_aircraft;

    }

    isCommonAirline(name) {

        return matchExact(name, this.commonAirline);

    }

    isCargoAirline(name) {

        return matchExact(name, this.cargoAirline);

    }

    isCommonAircraft(name) {

        return matchPartial(name, this.commonAircraft)
            || matchPartial(name, this.commonShortAircraft);

    }

    isCargoAircraft(name) {

        return matchPartial(name, this.cargoAircraft);

    }

}

//==================================================
// LOAD FILTERS
//==================================================

let filters = null;

async function loadFilters() {

    if (filters)
        return filters;

    const response = await fetch(
        chrome.runtime.getURL("filters.json")
    );

    filters = new Filters(
        await response.json()
    );

    debug("Filters loaded");

    return filters;

}


//==================================================
// SITE DETECTOR
//==================================================

const Site = {

    UNKNOWN: 0,

    FR24: 1,

    AIRNAV: 2

};

function getSite() {

    const host = location.hostname;

    if (host.includes("flightradar24"))
        return Site.FR24;

    if (host.includes("airnavradar"))
        return Site.AIRNAV;

    return Site.UNKNOWN;

}

//==================================================
// FR24 PARSER
//==================================================

const FR24Parser = {

    selector:
        "tr[ng-repeat*='arrivals'], tr[ng-repeat*='departures']",

    parse(row) {

        const flight = new Flight(row);

        flight.source = "FR24";

        const tds = row.querySelectorAll("td");

        if (tds.length < 6)
            return null;

        flight.time =
            clean(tds[0]?.innerText);

        flight.flightNumber =
            clean(row.querySelector(".cell-flight-number a.notranslate")?.innerText);

        flight.airport =
            clean(tds[2]?.innerText);

        flight.airline =
            normalizeAirline(
                clean(row.querySelector(".cell-airline a")?.innerText)
            );

        flight.aircraft =
            clean(
                row.querySelector(
                    "td:nth-child(5) span.notranslate"
                )?.innerText
            );

        flight.registration =
            clean(
                row.querySelector(
                    "td:nth-child(5) a.fbold"
                )?.innerText
            ).replace(/[()]/g, "");

        return flight;

    }

};

//==================================================
// AIRNAV PARSER
//==================================================

const AirNavParser = {

    selector:
        ".canflxb",

    parse(row) {

        const flight = new Flight(row);

        flight.source = "AIRNAV";

        flight.date =
            clean(
                row.querySelector(".padded-cell")?.innerText
            );

        const timeNode =
            row.querySelector("[title*='Central European']");

        if (timeNode)
            flight.time =
                clean(timeNode.innerText).substring(0,5);

        flight.flightNumber =
            clean(
                row.querySelector(
                    "a[href*='/data/flights/']"
                )?.innerText
            );

        flight.airport =
            clean(
                row.querySelector(
                    ".arrival-view a"
                )?.innerText
            );

        flight.airline =
            normalizeAirline(
                clean(
                    row.querySelector(
                        ".airline-view a"
                    )?.innerText
                )
            );

        flight.aircraft =
            clean(
                row.querySelector(
                    ".aircraft-view a[href*='/data/aircraft-models/']"
                )?.innerText
            );

        flight.registration =
            clean(
                row.querySelector(
                    ".aircraft-view a[href*='/data/registration/']"
                )?.innerText
            );

        return flight;

    }

};

//==================================================
// PARSER SELECTION
//==================================================

function getParser() {

    switch (getSite()) {

        case Site.FR24:
            return FR24Parser;

        case Site.AIRNAV:
            return AirNavParser;

        default:
            return null;

    }

}

	
//==================================================
// RENDERER
//==================================================

const Renderer = {

    hide(flight) {

        flight.row.style.display = "none";

    },

    showInteresting(flight) {

        flight.row.style.backgroundColor =
            CONFIG.colors.interesting;

        flight.row.style.color =
            CONFIG.colors.interestingText;

    },

    showCargo(flight) {

        flight.row.style.backgroundColor =
            CONFIG.colors.cargo;

        flight.row.style.color =
            CONFIG.colors.cargoText;

    }

};

//==================================================
// FILTER ENGINE
//==================================================

const FilterEngine = {

    isNotInteresting(flight) {

        // Livrée spéciale = toujours intéressant
        if (flight.isSpecialLivery)
            return false;

        // Vol classique
        if (
            flight.isCommonAirline &&
            flight.isCommonAircraft
        ) {
            return true;
        }

        // Cargo
        if (
            flight.isCargoAirline &&
            (
                flight.isCommonAircraft ||
                flight.isCargoAircraft
            )
        ) {
            return flight.isNight;
        }

        return false;

    },

    isCargoInteresting(flight) {

        return (
            flight.isCargoAirline &&
            !flight.isNight
        );

    }

};