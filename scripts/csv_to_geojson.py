import json
import re

# ----------------------------
# 1. Conversion DMS → décimal
# ----------------------------
def dms_to_decimal(dms_str):
    match = re.match(r"(\d+)°(\d+)'([\d.]+)\"([NSEW])", dms_str)
    if not match:
        return None

    deg, minutes, seconds, direction = match.groups()
    decimal = float(deg) + float(minutes)/60 + float(seconds)/3600

    if direction in ["S", "W"]:
        decimal *= -1

    return decimal


# ----------------------------
# 2. Lecture fichier points
# ----------------------------
def load_points(file_path):
    points = {}

    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            parts = line.split()
            if len(parts) < 3:
                continue

            name = parts[0]
            lat = dms_to_decimal(parts[1])
            lon = dms_to_decimal(parts[2])

            if lat is not None and lon is not None:
                points[name] = [lon, lat]  # GeoJSON = [lon, lat]

    return points


# ----------------------------
# 3. Lecture CSV procédure
# ----------------------------
def parse_procedure(csv_path):
    procedures = {}
    current = None

    with open(csv_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()

            if not line:
                continue

            if line.startswith("#"):
                continue

            # détecter INA
            if ",,,,,,,,,,,," in line:
                current = line.replace(",", "").strip()
                procedures[current] = []
                continue

            parts = line.split(",")
            print(parts)
            
            if len(parts) < 3:
                current = None
                continue

            waypoint = parts[2].strip()

            if waypoint and waypoint != "-":
                procedures[current].append(waypoint)

    return procedures


# ----------------------------
# 4. Génération GeoJSON
# ----------------------------
def build_geojson(procedures, points):
    features = []

    for name, waypoints in procedures.items():
        coords = []

        for wp in waypoints:
            if wp in points:
                coords.append(points[wp])

        if len(coords) < 2:
            continue

        feature = {
            "type": "Feature",
            "properties": {
                "name": name,
                "points": waypoints
            },
            "geometry": {
                "type": "LineString",
                "coordinates": coords
            }
        }

        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features
    }


# ----------------------------
# 5. MAIN
# ----------------------------
points_file = "../inputs/LFBD_points.txt"
csv_file = "../inputs/LFBD_sidstar_29.txt"
output_file = "../data/LFBD_sidstar_29.geojson"

points = load_points(points_file)
procedures = parse_procedure(csv_file)
geojson = build_geojson(procedures, points)

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(geojson, f, indent=2)

print("GeoJSON généré :", output_file)