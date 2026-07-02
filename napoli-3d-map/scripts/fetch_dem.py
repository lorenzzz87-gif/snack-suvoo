#!/usr/bin/env python3
"""预下载那不勒斯范围的 terrarium DEM 瓦片到 public/dem/{z}/{x}/{y}.png。

让地形完全本地化：部署后不依赖外部瓦片服务，离线可用。
"""
import math
import os
import sys
import urllib.request

BASE = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "dem")

# (zoom, xmin, ymin, xmax, ymax)：核心区高精度，外围低精度（供高倾角远景）
RANGES = [
    (10, 14.00, 40.60, 14.70, 41.05),
    (11, 14.00, 40.60, 14.70, 41.05),
    (12, 14.05, 40.70, 14.55, 41.00),
    (13, 14.12, 40.75, 14.40, 40.95),
    (14, 14.14, 40.78, 14.36, 40.91),
]


def tile_xy(lon: float, lat: float, z: int) -> tuple[int, int]:
    n = 2 ** z
    x = int((lon + 180.0) / 360.0 * n)
    lat_r = math.radians(lat)
    y = int((1.0 - math.asinh(math.tan(lat_r)) / math.pi) / 2.0 * n)
    return x, y


def main() -> None:
    done = skipped = failed = 0
    for z, xmin, ymin, xmax, ymax in RANGES:
        x0, y1 = tile_xy(xmin, ymin, z)  # 注意 y 轴向下：ymin(南) → 大 y
        x1, y0 = tile_xy(xmax, ymax, z)
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                path = os.path.join(OUT, str(z), str(x), f"{y}.png")
                if os.path.exists(path):
                    skipped += 1
                    continue
                os.makedirs(os.path.dirname(path), exist_ok=True)
                url = f"{BASE}/{z}/{x}/{y}.png"
                try:
                    with urllib.request.urlopen(url, timeout=30) as r:
                        data = r.read()
                    with open(path, "wb") as f:
                        f.write(data)
                    done += 1
                except Exception as e:  # noqa: BLE001
                    failed += 1
                    print(f"FAIL {url}: {e}", file=sys.stderr)
    print(f"downloaded={done} skipped={skipped} failed={failed}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
