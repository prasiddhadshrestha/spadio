"""
nasa_scraper.py - Web scraper for NASA Eyes on Earth, SVS, and Worldview Real-time Global Datasets.
Scrapes live imagery from:
1. NASA Eyes on Earth (https://eyes.nasa.gov/apps/earth/#/)
   Target: Seamless 24h mosaic preview shown at the bottom-right of the Visible Earth dataset panel.
2. NASA SVS 4285 (https://svs.gsfc.nasa.gov/4285/)
   Target: Real-Time Global Precipitation (GPM IMERG)
3. NASA Worldview (https://worldview.earthdata.nasa.gov/)
   Target: Current Snow and Rain (IMERG Precipitation Rate & Land Mask)
"""

import urllib.request
import urllib.parse
import re
import os
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nasa_scraper")

DEFAULT_WORLDVIEW_URL = (
    "https://worldview.earthdata.nasa.gov/?v=-205.72171420740918,-124.90924876534133,"
    "206.7865715215261,132.9084298152432&df=true&kiosk=true&eic=si&"
    "l=IMERG_Precipitation_Rate,Land_Mask&lg=false&t=2023-06-11-T16:00:00Z"
)

DEFAULT_WORLDVIEW_SST_URL = (
    "https://worldview.earthdata.nasa.gov/?v=-269.8124098969482,-138.3887742111943,"
    "297.0673576371562,215.91108049762096&df=true&kiosk=true&eic=si&"
    "l=Coastlines_15m(opacity%3D0.71),GHRSST_L4_MUR_Sea_Surface_Temperature(palette%3Ddivergent_1)&"
    "lg=true&t=2026-11-14-T18:00:00Z"
)

CACHE_DIR = Path(__file__).resolve().parent / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

PUBLIC_TEXTURES_DIR = (
    Path(__file__).resolve().parent.parent / "frontend" / "public" / "textures"
)


def scrape_eyes_on_earth_wms_template() -> str:
    """
    Scrapes eyes.nasa.gov/apps/earth/ to find WMS endpoint used for Visible Earth layer.
    """
    default_wms = (
        "https://gitc.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
        "?version=1.3.0&service=WMS&request=GetMap&format=image/jpeg"
        "&STYLE=default&bbox=-90,-180,90,180&CRS=EPSG:4326&HEIGHT=1024&WIDTH=2048"
        "&TIME={date}&layers={layer}"
    )
    try:
        url = "https://eyes.nasa.gov/apps/earth/index.js"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            js = resp.read().decode("utf-8")

        match = re.search(
            r'https://gitc\.earthdata\.nasa\.gov/wms/epsg4326/best/wms\.cgi[^\s"\'`]+',
            js,
        )
        if match:
            found = match.group(0).replace("{YYYY-MM-DD}", "{date}")
            logger.info(f"Scraped Eyes on Earth WMS template: {found}")
            return found
    except Exception as e:
        logger.warning(f"Error scraping Eyes on Earth JS: {e}")

    return default_wms


def scrape_eyes_on_earth_image_url() -> str:
    """
    Returns the direct image URL for the latest seamless Visible Earth 24-hour composite preview
    (shown at the bottom-right of the NASA Eyes on the Earth Visible Earth panel).
    """
    return "https://eyes.nasa.gov/assets/dynamic/earth/data/visibleEarth/visibleEarth_thumbnail.webp"


def fetch_current_earth_image() -> bytes:
    """
    Scrapes and fetches the exact bottom-right composite map from NASA Eyes on Earth Visible Earth overlay.
    (https://eyes.nasa.gov/assets/dynamic/earth/data/visibleEarth/visibleEarth_thumbnail.webp)
    This is a continuous 24-hour global mosaic from NOAA-21 / VIIRS with no orbital swath seams or gaps.
    """
    cached_file = CACHE_DIR / "eyes_on_earth_visible_earth.jpg"
    cached_webp = CACHE_DIR / "eyes_on_earth_visible_earth.webp"

    # Check if cache is fresh (< 3 hours old)
    if cached_file.exists():
        mtime = datetime.fromtimestamp(cached_file.stat().st_mtime, tz=timezone.utc)
        if (datetime.now(timezone.utc) - mtime).total_seconds() < 10800:
            logger.info("Serving Eyes on Earth image from cache.")
            return cached_file.read_bytes()

    # Target URLs for the bottom-right image of NASA Eyes on Earth Visible Earth panel
    target_urls = [
        "https://eyes.nasa.gov/assets/dynamic/earth/data/visibleEarth/visibleEarth_thumbnail.webp",
        "https://eyes.nasa.gov/assets/dynamic/earth/data/visibleEarth/visibleEarth_thumbnail.png",
    ]

    for url in target_urls:
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": "https://eyes.nasa.gov/apps/earth/",
                },
            )
            logger.info(
                f"Scraping NASA Eyes on Earth bottom-right mosaic from {url}..."
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status == 200:
                    data = resp.read()
                    if len(data) > 10000:
                        cached_webp.write_bytes(data)

                        # Save to frontend public textures
                        if PUBLIC_TEXTURES_DIR.exists():
                            webp_dest = PUBLIC_TEXTURES_DIR / "eyes_on_earth_now.webp"
                            webp_dest.write_bytes(data)

                            # Convert to jpeg via macOS sips or fallback
                            try:
                                jpg_dest = PUBLIC_TEXTURES_DIR / "eyes_on_earth_now.jpg"
                                subprocess.run(
                                    [
                                        "sips",
                                        "-s",
                                        "format",
                                        "jpeg",
                                        str(webp_dest),
                                        "--out",
                                        str(jpg_dest),
                                    ],
                                    capture_output=True,
                                    timeout=5,
                                )
                                if jpg_dest.exists():
                                    jpg_data = jpg_dest.read_bytes()
                                    cached_file.write_bytes(jpg_data)
                                    logger.info(
                                        f"Successfully scraped and converted Eyes on Earth mosaic ({len(jpg_data)} bytes)."
                                    )
                                    return jpg_data
                            except Exception as conv_err:
                                logger.info(f"SIPS conversion note: {conv_err}")

                        cached_file.write_bytes(data)
                        return data
        except Exception as e:
            logger.warning(f"Failed to scrape from {url}: {e}")

    # Fallbacks: local visibleEarth_thumbnail or cached files
    for local_name in [
        "eyes_on_earth_now.jpg",
        "visibleEarth_thumbnail.png",
        "eyes_on_earth_now.webp",
    ]:
        local_p = PUBLIC_TEXTURES_DIR / local_name
        if local_p.exists():
            logger.info(f"Using local seamless texture fallback: {local_name}")
            return local_p.read_bytes()

    if cached_file.exists():
        return cached_file.read_bytes()
    if cached_webp.exists():
        return cached_webp.read_bytes()

    return b""


def scrape_realtime_precipitation_url() -> str:
    """
    Scrapes https://svs.gsfc.nasa.gov/4285/ to extract the latest near real-time global precipitation image URL.
    """
    base_url = "https://svs.gsfc.nasa.gov/4285/"
    default_img_url = (
        "https://svs.gsfc.nasa.gov/vis/a000000/a004200/a004285/imergert_1080p.now.png"
    )

    try:
        req = urllib.request.Request(base_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            html = resp.read().decode("utf-8")

        links = re.findall(
            r'(?:href|src)=["\']([^"\']+\.(?:png|jpg|jpeg))["\']', html, re.I
        )

        # Priority: imergert_1080p.now.png or imergert_composite.now.png
        for candidate in links:
            if "imergert_1080p.now.png" in candidate:
                if candidate.startswith("http"):
                    return candidate
                return f"https://svs.gsfc.nasa.gov{candidate}"

        for candidate in links:
            if "imergert" in candidate and "now" in candidate:
                if candidate.startswith("http"):
                    return candidate
                return f"https://svs.gsfc.nasa.gov{candidate}"
    except Exception as e:
        logger.warning(f"Error scraping SVS 4285: {e}")

    return default_img_url


def fetch_realtime_precipitation_image() -> bytes:
    """
    Fetches the latest real-time global precipitation image from SVS 4285.
    Caches locally and copies to frontend/public/textures for offline/direct support.
    """
    cached_file = CACHE_DIR / "precipitation_now.png"

    # Check cache (< 1 hour old)
    if cached_file.exists():
        mtime = datetime.fromtimestamp(cached_file.stat().st_mtime, tz=timezone.utc)
        if (datetime.now(timezone.utc) - mtime).total_seconds() < 3600:
            logger.info("Serving Real-time Precipitation image from cache.")
            return cached_file.read_bytes()

    img_url = scrape_realtime_precipitation_url()
    logger.info(f"Downloading precipitation image from: {img_url}")

    try:
        req = urllib.request.Request(img_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status == 200:
                data = resp.read()
                if len(data) > 50000:
                    cached_file.write_bytes(data)
                    if PUBLIC_TEXTURES_DIR.exists():
                        try:
                            (
                                PUBLIC_TEXTURES_DIR / "imergert_1080p.now.png"
                            ).write_bytes(data)
                        except Exception as err:
                            logger.warning(f"Could not copy to public textures: {err}")
                    return data
    except Exception as e:
        logger.warning(f"Failed to download precipitation image: {e}")

    if cached_file.exists():
        return cached_file.read_bytes()

    local_fallback = PUBLIC_TEXTURES_DIR / "imergert_1080p.now.png"
    if local_fallback.exists():
        return local_fallback.read_bytes()

    return b""


def parse_worldview_url(url: str = DEFAULT_WORLDVIEW_URL) -> dict:
    """
    Parses a NASA Worldview URL to extract query parameters including layers,
    timestamp, viewport bounds, and EIC settings.
    """
    try:
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)

        layers_raw = params.get("l", ["IMERG_Precipitation_Rate,Land_Mask"])[0]
        layers = [l.strip() for l in layers_raw.split(",") if l.strip()]

        time_raw = params.get("t", [""])[0]
        date_str = ""
        if time_raw:
            m = re.search(r"(\d{4}-\d{2}-\d{2})", time_raw)
            if m:
                date_str = m.group(1)

        return {
            "raw_url": url,
            "layers": layers,
            "time_param": time_raw,
            "date_str": date_str,
            "eic": params.get("eic", [""])[0],
            "kiosk": params.get("kiosk", [""])[0],
            "viewport": params.get("v", [""])[0],
        }
    except Exception as e:
        logger.warning(f"Error parsing Worldview URL {url}: {e}")
        return {
            "raw_url": url,
            "layers": ["IMERG_Precipitation_Rate", "Land_Mask"],
            "time_param": "",
            "date_str": "",
            "eic": "si",
            "kiosk": "true",
            "viewport": "",
        }


def scrape_worldview_snow_rain_url(url: str = DEFAULT_WORLDVIEW_URL, realtime: bool = True) -> str:
    """
    Constructs the GIBS WMS GetMap equirectangular 2048x1024 URL for the NASA Worldview
    'Current Snow and Rain' (IMERG Precipitation Rate & Land Mask) configuration.
    """
    meta = parse_worldview_url(url)
    layers = meta.get("layers", [])

    # Map Worldview layer identifiers to GIBS EPSG:4326 WMS layer names
    gibs_layers = []
    has_land_mask = any("Land_Mask" in l for l in layers)
    has_imerg = any("IMERG" in l or "Precipitation" in l for l in layers)

    if has_land_mask:
        gibs_layers.append("OSM_Land_Mask")
    if has_imerg:
        gibs_layers.append("IMERG_Precipitation_Rate")

    if not gibs_layers:
        gibs_layers = ["OSM_Land_Mask", "IMERG_Precipitation_Rate"]

    layer_param = ",".join(gibs_layers)
    base_wms = (
        "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?"
        "SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&"
        f"LAYERS={layer_param}&STYLES=&FORMAT=image/png&"
        "TRANSPARENT=false&HEIGHT=1024&WIDTH=2048&CRS=EPSG:4326&BBOX=-90,-180,90,180"
    )

    if not realtime and meta.get("date_str"):
        return f"{base_wms}&TIME={meta['date_str']}"

    return base_wms


def fetch_worldview_snow_rain_image(url: str = DEFAULT_WORLDVIEW_URL, realtime: bool = True) -> bytes:
    """
    Fetches the real-time global Snow and Rain (IMERG Precipitation Rate & Land Mask)
    mosaic from NASA Worldview / GIBS WMS.
    Caches locally and provides fallbacks if offline.
    """
    cached_file = CACHE_DIR / "worldview_snow_and_rain.png"
    cached_jpg = CACHE_DIR / "worldview_snow_and_rain.jpg"

    # Check cache freshness (< 1 hour)
    if cached_file.exists():
        mtime = datetime.fromtimestamp(cached_file.stat().st_mtime, tz=timezone.utc)
        if (datetime.now(timezone.utc) - mtime).total_seconds() < 3600:
            data = cached_file.read_bytes()
            if len(data) > 20000 and not data.startswith(b"<?xml"):
                logger.info("Serving Worldview Snow & Rain from fresh cache.")
                return data

    wms_url = scrape_worldview_snow_rain_url(url, realtime=realtime)
    logger.info(f"Fetching real-time Worldview Snow & Rain from: {wms_url}")

    candidates = [wms_url]
    # If real-time, also try explicit recent UTC dates if default times out
    now_utc = datetime.now(timezone.utc)
    for days_ago in [1, 2, 3]:
        d_str = (now_utc - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        candidates.append(f"{wms_url}&TIME={d_str}")

    # Fallback to date from URL if provided
    meta = parse_worldview_url(url)
    if meta.get("date_str"):
        candidates.append(f"{wms_url}&TIME={meta['date_str']}")

    for candidate_url in candidates:
        try:
            req = urllib.request.Request(
                candidate_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    "Referer": "https://worldview.earthdata.nasa.gov/",
                },
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status == 200:
                    data = resp.read()
                    if len(data) > 20000 and not data.startswith(b"<?xml"):
                        cached_file.write_bytes(data)
                        if PUBLIC_TEXTURES_DIR.exists():
                            try:
                                png_dest = PUBLIC_TEXTURES_DIR / "worldview_snow_and_rain.png"
                                png_dest.write_bytes(data)

                                jpg_dest = PUBLIC_TEXTURES_DIR / "snow_and_rain.jpg"
                                subprocess.run(
                                    ["sips", "-s", "format", "jpeg", str(png_dest), "--out", str(jpg_dest)],
                                    capture_output=True,
                                    timeout=6,
                                )
                            except Exception as dest_err:
                                logger.warning(f"Error copying texture: {dest_err}")
                        logger.info(f"Successfully scraped Worldview Snow & Rain ({len(data)} bytes).")
                        return data
        except Exception as e:
            logger.warning(f"Error fetching candidate {candidate_url}: {e}")

    # Fallback to existing cached file
    if cached_file.exists():
        data = cached_file.read_bytes()
        if len(data) > 20000 and not data.startswith(b"<?xml"):
            return data

    for local_name in ["worldview_snow_and_rain.png", "snow_and_rain.jpg"]:
        local_p = PUBLIC_TEXTURES_DIR / local_name
        if local_p.exists():
            data = local_p.read_bytes()
            if len(data) > 20000 and not data.startswith(b"<?xml"):
                return data

    return b""


def scrape_worldview_sst_url(url: str = DEFAULT_WORLDVIEW_SST_URL, realtime: bool = True) -> str:
    """
    Constructs the GIBS WMS GetMap equirectangular 2048x1024 URL for NASA Worldview
    'Sea Surface Temperature' (GHRSST L4 MUR Sea Surface Temperature & Coastlines) configuration.
    """
    meta = parse_worldview_url(url)
    layers = meta.get("layers", [])

    gibs_layers = []
    has_sst = any("GHRSST" in l or "Sea_Surface_Temperature" in l for l in layers)
    has_coastlines = any("Coastline" in l for l in layers)

    if has_sst:
        gibs_layers.append("GHRSST_L4_MUR_Sea_Surface_Temperature")
    if has_coastlines:
        gibs_layers.append("Coastlines_15m")

    if not gibs_layers:
        gibs_layers = ["GHRSST_L4_MUR_Sea_Surface_Temperature", "Coastlines_15m"]

    layer_param = ",".join(gibs_layers)
    base_wms = (
        "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?"
        "SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&"
        f"LAYERS={layer_param}&STYLES=&FORMAT=image/png&"
        "TRANSPARENT=false&HEIGHT=1024&WIDTH=2048&CRS=EPSG:4326&BBOX=-90,-180,90,180"
    )

    if not realtime and meta.get("date_str"):
        return f"{base_wms}&TIME={meta['date_str']}"

    return base_wms


def fetch_worldview_sst_image(url: str = DEFAULT_WORLDVIEW_SST_URL, realtime: bool = True) -> bytes:
    """
    Fetches the real-time global Sea Surface Temperature (GHRSST L4 MUR) mosaic
    from NASA Worldview / GIBS WMS.
    Caches locally and copies to frontend/public/textures for offline/direct support.
    """
    cached_file = CACHE_DIR / "worldview_sea_surface_temperature.png"
    local_fallback = PUBLIC_TEXTURES_DIR / "sea_surface_temperature.png"

    if cached_file.exists():
        mtime = datetime.fromtimestamp(cached_file.stat().st_mtime, tz=timezone.utc)
        if (datetime.now(timezone.utc) - mtime).total_seconds() < 3600:
            data = cached_file.read_bytes()
            if len(data) > 20000 and not data.startswith(b"<?xml"):
                logger.info("Serving Worldview Sea Surface Temperature from fresh cache.")
                return data

    wms_url = scrape_worldview_sst_url(url, realtime=realtime)
    logger.info(f"Fetching real-time Worldview Sea Surface Temperature from: {wms_url}")

    candidates = [wms_url]
    now_utc = datetime.now(timezone.utc)
    for days_ago in [1, 2, 3]:
        d_str = (now_utc - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        candidates.append(f"{wms_url}&TIME={d_str}")

    meta = parse_worldview_url(url)
    if meta.get("date_str"):
        candidates.append(f"{wms_url}&TIME={meta['date_str']}")

    for candidate_url in candidates:
        try:
            req = urllib.request.Request(
                candidate_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    "Referer": "https://worldview.earthdata.nasa.gov/",
                },
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status == 200:
                    data = resp.read()
                    if len(data) > 20000 and not data.startswith(b"<?xml"):
                        cached_file.write_bytes(data)
                        if PUBLIC_TEXTURES_DIR.exists():
                            try:
                                png_dest = PUBLIC_TEXTURES_DIR / "sea_surface_temperature.png"
                                png_dest.write_bytes(data)
                            except Exception as dest_err:
                                logger.warning(f"Error copying SST texture: {dest_err}")
                        logger.info(f"Successfully scraped Worldview Sea Surface Temperature ({len(data)} bytes).")
                        return data
        except Exception as e:
            logger.warning(f"Error fetching SST candidate {candidate_url}: {e}")

    if cached_file.exists():
        data = cached_file.read_bytes()
        if len(data) > 20000 and not data.startswith(b"<?xml"):
            return data

    local_fallback = PUBLIC_TEXTURES_DIR / "sea_surface_temperature.png"
    if local_fallback.exists():
        data = local_fallback.read_bytes()
        if len(data) > 20000 and not data.startswith(b"<?xml"):
            return data

    return b""


if __name__ == "__main__":
    print("Testing Eyes on Earth bottom-right mosaic scrape...")
    earth_bytes = fetch_current_earth_image()
    print("Fetched Earth image bytes:", len(earth_bytes))

    print("\nTesting SVS 4285 Precipitation scrape...")
    precip_url = scrape_realtime_precipitation_url()
    print("Precipitation URL:", precip_url)
    precip_bytes = fetch_realtime_precipitation_image()
    print("Fetched Precipitation image bytes:", len(precip_bytes))
