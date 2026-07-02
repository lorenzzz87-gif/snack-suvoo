#!/usr/bin/env python3
"""从 AWS S3 上的 Overture Maps 公开数据集拉取指定 bbox 的数据并输出 GeoJSON。

绕过 overturemaps CLI 的 STAC 目录（在受限网络下不可达），直接对 S3 的
parquet 文件做 HTTP range 读取，利用 bbox 列的 row-group 统计做剪枝。

用法: python3 fetch_overture.py <theme> <type> <xmin,ymin,xmax,ymax> <out.geojson>
"""
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET

import pyarrow.compute as pc
import pyarrow.dataset as ds
import fsspec
from pyarrow.fs import FSSpecHandler, PyFileSystem
from shapely import from_wkb
from shapely.geometry import mapping

RELEASE = "2026-06-17.0"
BUCKET_HOST = "overturemaps-us-west-2.s3.us-west-2.amazonaws.com"

# 每种数据类型要保留的属性列（不存在的列会被自动忽略）
KEEP_COLS = {
    "building": ["height", "num_floors", "min_height", "subtype", "class", "names"],
    "segment": ["subtype", "class", "names"],
    "water": ["subtype", "class", "names"],
    "land_use": ["subtype", "class", "names"],
    "land": ["subtype", "class", "names"],
    "place": ["names", "categories"],
}


def list_parquet_keys(theme: str, type_: str) -> list[str]:
    prefix = f"release/{RELEASE}/theme={theme}/type={type_}/"
    keys, token = [], None
    while True:
        url = f"https://{BUCKET_HOST}/?list-type=2&prefix={prefix}"
        if token:
            url += f"&continuation-token={urllib.parse.quote(token)}"
        with urllib.request.urlopen(url) as r:
            tree = ET.fromstring(r.read())
        ns = {"s3": "http://s3.amazonaws.com/doc/2006-03-01/"}
        for c in tree.findall("s3:Contents", ns):
            k = c.find("s3:Key", ns).text
            if k.endswith(".parquet"):
                keys.append(k)
        token_el = tree.find("s3:NextContinuationToken", ns)
        if token_el is None:
            break
        token = token_el.text
    return keys


def primary_name(names) -> str | None:
    if isinstance(names, dict):
        return names.get("primary")
    return None


def main() -> None:
    theme, type_, bbox_s, out = sys.argv[1:5]
    xmin, ymin, xmax, ymax = map(float, bbox_s.split(","))

    keys = list_parquet_keys(theme, type_)
    print(f"{theme}/{type_}: {len(keys)} parquet files", file=sys.stderr)

    fs = PyFileSystem(FSSpecHandler(fsspec.filesystem("https")))
    urls = [f"https://{BUCKET_HOST}/{k}" for k in keys]
    dataset = ds.dataset(urls, filesystem=fs, format="parquet")

    flt = (
        (pc.field("bbox", "xmin") < xmax)
        & (pc.field("bbox", "xmax") > xmin)
        & (pc.field("bbox", "ymin") < ymax)
        & (pc.field("bbox", "ymax") > ymin)
    )
    want = [c for c in ["id", "geometry", *KEEP_COLS.get(type_, [])]
            if c in dataset.schema.names]
    table = dataset.to_table(filter=flt, columns=want)
    print(f"rows: {table.num_rows}", file=sys.stderr)

    feats = []
    rows = table.to_pylist()
    for row in rows:
        geom = from_wkb(row.pop("geometry"))
        if geom is None or geom.is_empty:
            continue
        props = {}
        for k, v in row.items():
            if v is None:
                continue
            if k == "names":
                n = primary_name(v)
                if n:
                    props["name"] = n
            elif k == "categories":
                if isinstance(v, dict) and v.get("primary"):
                    props["category"] = v["primary"]
            else:
                props[k] = v
        feats.append({"type": "Feature", "properties": props, "geometry": mapping(geom)})

    with open(out, "w") as f:
        json.dump({"type": "FeatureCollection", "features": feats}, f, ensure_ascii=False)
    print(f"wrote {len(feats)} features -> {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
