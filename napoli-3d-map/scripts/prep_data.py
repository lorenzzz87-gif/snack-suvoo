#!/usr/bin/env python3
"""把 fetch_overture.py 的原始输出瘦身为前端使用的 GeoJSON。

- 坐标压到 6 位小数
- 只保留渲染需要的属性
- 建筑：计算渲染高度 h（height > num_floors*3 > 12 兜底）
"""
import json
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")

GREEN = {
    "park", "garden", "grass", "forest", "wood", "meadow", "cemetery",
    "recreation_ground", "village_green", "greenfield", "orchard", "vineyard",
    "plaza", "pedestrian",
}


def round_coords(c, nd=6):
    if isinstance(c, (int, float)):
        return round(c, nd)
    return [round_coords(x, nd) for x in c]


def load(name):
    with open(os.path.join(DATA_DIR, name)) as f:
        return json.load(f)


def save(name, feats):
    fc = {"type": "FeatureCollection", "features": feats}
    path = os.path.join(DATA_DIR, name)
    with open(path, "w") as f:
        json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{name}: {len(feats)} features, {os.path.getsize(path) // 1024} KB")


def slim(feat, keep):
    props = {k: v for k, v in feat["properties"].items() if k in keep and v is not None}
    return {
        "type": "Feature",
        "properties": props,
        "geometry": {
            "type": feat["geometry"]["type"],
            "coordinates": round_coords(feat["geometry"]["coordinates"]),
        },
    }


def prep_water():
    feats = [
        slim(f, {"class", "name"})
        for f in load("water_raw.geojson")["features"]
        if f["geometry"]["type"] in ("Polygon", "MultiPolygon")
    ]
    save("water.geojson", feats)


def prep_roads():
    feats = [slim(f, {"subtype", "class", "name"}) for f in load("roads_raw.geojson")["features"]]
    save("roads.geojson", feats)


def prep_landuse():
    feats = [
        slim(f, {"class"})
        for f in load("landuse_raw.geojson")["features"]
        if f["properties"].get("class") in GREEN
        and f["geometry"]["type"] in ("Polygon", "MultiPolygon")
    ]
    save("landuse.geojson", feats)


def prep_buildings():
    feats = []
    for f in load("buildings_raw.geojson")["features"]:
        if f["geometry"]["type"] not in ("Polygon", "MultiPolygon"):
            continue
        p = f["properties"]
        h = p.get("height")
        if not h:
            floors = p.get("num_floors")
            h = floors * 3.0 if floors else 12.0
        out = slim(f, {"name", "subtype", "class"})
        out["properties"]["h"] = round(float(h), 1)
        if p.get("min_height"):
            out["properties"]["min_h"] = round(float(p["min_height"]), 1)
        feats.append(out)
    save("buildings.geojson", feats)


if __name__ == "__main__":
    targets = sys.argv[1:] or ["water", "roads", "landuse", "buildings"]
    for t in targets:
        {"water": prep_water, "roads": prep_roads,
         "landuse": prep_landuse, "buildings": prep_buildings}[t]()
