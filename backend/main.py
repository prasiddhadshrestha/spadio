"""
main.py - FastAPI Backend for The Earth Information Jukebox
Serves normalized NASA telemetry, region metadata, and real-time DSP vector scoring.
"""

import json
from pathlib import Path
from typing import List
import traceback
from fastapi import FastAPI, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse

try:
    from nasa_scraper import (
        DEFAULT_WORLDVIEW_URL,
        DEFAULT_WORLDVIEW_SST_URL,
        fetch_current_earth_image,
        fetch_realtime_precipitation_image,
        fetch_worldview_snow_rain_image,
        fetch_worldview_sst_image,
        parse_worldview_url,
        scrape_eyes_on_earth_image_url,
        scrape_eyes_on_earth_wms_template,
        scrape_realtime_precipitation_url,
        scrape_worldview_snow_rain_url,
        scrape_worldview_sst_url,
    )
except ImportError:
    from backend.nasa_scraper import (
        DEFAULT_WORLDVIEW_URL,
        DEFAULT_WORLDVIEW_SST_URL,
        fetch_current_earth_image,
        fetch_realtime_precipitation_image,
        fetch_worldview_snow_rain_image,
        fetch_worldview_sst_image,
        parse_worldview_url,
        scrape_eyes_on_earth_image_url,
        scrape_eyes_on_earth_wms_template,
        scrape_realtime_precipitation_url,
        scrape_worldview_snow_rain_url,
        scrape_worldview_sst_url,
    )

app = FastAPI(
    title="The Earth Information Jukebox API",
    description="NASA Space Apps 2026: Multi-Sensory Earth Science Sonification Backend",
    version="1.0.0",
)


@app.middleware("http")
async def catch_all_errors(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": f"{type(e).__name__}: {e}"},
        )


origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


# Enable CORS for local React/Vite development and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).resolve().parent / "data"
if not DATA_DIR.exists():
    DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class TimeSeriesPoint(BaseModel):
    year: int
    raw_val: float
    distress_score: float = Field(ge=0.0, le=1.0)
    pitch_hz: int
    harmonic_dissonance: float = Field(ge=0.0, le=1.0)
    pulse_bpm: int


class RegionCoordinates(BaseModel):
    lat: float
    lng: float


class RegionDetail(BaseModel):
    id: str
    name: str
    coordinates: RegionCoordinates
    indicator: str
    unit: str
    baseline_value: float
    time_series: List[TimeSeriesPoint]
    narrative: str


class RegionSummary(BaseModel):
    id: str
    name: str
    coordinates: RegionCoordinates
    indicator: str
    latest_distress: float


def load_dataset() -> dict:
    mock_file = DATA_DIR / "mock_regions.json"
    if not mock_file.exists():
        raise HTTPException(
            status_code=500, detail="Core data file mock_regions.json not found."
        )
    with open(mock_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Check if live arctic ingestion exists and overlay it
    live_arctic = DATA_DIR / "live_arctic_ingestion.json"
    if live_arctic.exists():
        try:
            with open(live_arctic, "r", encoding="utf-8") as lf:
                live_points = json.load(lf)
                for reg in data.get("regions", []):
                    if reg["id"] == "arctic" and live_points:
                        reg["time_series"] = live_points
        except Exception:
            pass  # Gracefully keep mock data on parse failure

    return data


@app.get("/")
def root():
    return {
        "status": "online",
        "project": "The Earth Information Jukebox",
        "docs_url": "/docs",
        "endpoints": ["/api/regions", "/api/region/{id}", "/api/sonify-vector"],
    }


LIVE_IMAGE_DETAILS = {
    "eyes_on_earth": {
        "id": "eyes_on_earth",
        "name": "Eyes on Earth Live",
        "coordinates": {"lat": 24.0, "lng": -45.0},
        "indicator": "NASA Eyes on Earth Visible Earth (Daily)",
        "unit": "Visible Reflectance",
        "baseline_value": 1.0,
        "time_series": [
            {
                "year": 2000,
                "raw_val": 0.35,
                "distress_score": 0.20,
                "pitch_hz": 200,
                "harmonic_dissonance": 0.08,
                "pulse_bpm": 65,
            },
            {
                "year": 2005,
                "raw_val": 0.50,
                "distress_score": 0.38,
                "pitch_hz": 250,
                "harmonic_dissonance": 0.20,
                "pulse_bpm": 78,
            },
            {
                "year": 2010,
                "raw_val": 0.62,
                "distress_score": 0.45,
                "pitch_hz": 280,
                "harmonic_dissonance": 0.30,
                "pulse_bpm": 85,
            },
            {
                "year": 2016,
                "raw_val": 0.88,
                "distress_score": 0.72,
                "pitch_hz": 395,
                "harmonic_dissonance": 0.60,
                "pulse_bpm": 112,
            },
            {
                "year": 2020,
                "raw_val": 0.94,
                "distress_score": 0.80,
                "pitch_hz": 435,
                "harmonic_dissonance": 0.70,
                "pulse_bpm": 120,
            },
            {
                "year": 2024,
                "raw_val": 1.15,
                "distress_score": 0.92,
                "pitch_hz": 500,
                "harmonic_dissonance": 0.88,
                "pulse_bpm": 135,
            },
            {
                "year": 2026,
                "raw_val": 1.25,
                "distress_score": 0.96,
                "pitch_hz": 525,
                "harmonic_dissonance": 0.93,
                "pulse_bpm": 142,
            },
        ],
        "narrative": "Real-time satellite mosaic scraped from NASA's Eyes on the Earth application. Sound is generated directly through real-time pixel analysis.",
    },
    "realtime_precipitation": {
        "id": "realtime_precipitation",
        "name": "Global Precipitation",
        "coordinates": {"lat": 0.0, "lng": 0.0},
        "indicator": "Near Real-Time Precipitation (SVS 4285)",
        "unit": "mm / hour",
        "baseline_value": 2.5,
        "time_series": [
            {
                "year": 2000,
                "raw_val": 2.1,
                "distress_score": 0.12,
                "pitch_hz": 180,
                "harmonic_dissonance": 0.06,
                "pulse_bpm": 64,
            },
            {
                "year": 2005,
                "raw_val": 2.3,
                "distress_score": 0.28,
                "pitch_hz": 220,
                "harmonic_dissonance": 0.16,
                "pulse_bpm": 74,
            },
            {
                "year": 2010,
                "raw_val": 2.6,
                "distress_score": 0.42,
                "pitch_hz": 280,
                "harmonic_dissonance": 0.26,
                "pulse_bpm": 84,
            },
            {
                "year": 2016,
                "raw_val": 3.4,
                "distress_score": 0.78,
                "pitch_hz": 420,
                "harmonic_dissonance": 0.65,
                "pulse_bpm": 118,
            },
            {
                "year": 2020,
                "raw_val": 3.6,
                "distress_score": 0.84,
                "pitch_hz": 450,
                "harmonic_dissonance": 0.72,
                "pulse_bpm": 124,
            },
            {
                "year": 2024,
                "raw_val": 3.9,
                "distress_score": 0.92,
                "pitch_hz": 495,
                "harmonic_dissonance": 0.86,
                "pulse_bpm": 136,
            },
            {
                "year": 2026,
                "raw_val": 4.1,
                "distress_score": 0.96,
                "pitch_hz": 520,
                "harmonic_dissonance": 0.92,
                "pulse_bpm": 140,
            },
        ],
        "narrative": "Real-time GPM constellation precipitation imagery from NASA SVS 4285. Sound is generated directly through real-time pixel analysis.",
    },
    "worldview_snow_rain": {
        "id": "worldview_snow_rain",
        "name": "Current Snow and Rain",
        "coordinates": {"lat": 15.0, "lng": -20.0},
        "indicator": "IMERG Precipitation Rate & Land Mask (Worldview)",
        "unit": "mm / hour",
        "baseline_value": 2.2,
        "time_series": [
            {
                "year": 2000,
                "raw_val": 1.9,
                "distress_score": 0.15,
                "pitch_hz": 190,
                "harmonic_dissonance": 0.08,
                "pulse_bpm": 66,
            },
            {
                "year": 2005,
                "raw_val": 2.2,
                "distress_score": 0.30,
                "pitch_hz": 230,
                "harmonic_dissonance": 0.18,
                "pulse_bpm": 76,
            },
            {
                "year": 2010,
                "raw_val": 2.5,
                "distress_score": 0.44,
                "pitch_hz": 290,
                "harmonic_dissonance": 0.28,
                "pulse_bpm": 86,
            },
            {
                "year": 2016,
                "raw_val": 3.3,
                "distress_score": 0.76,
                "pitch_hz": 415,
                "harmonic_dissonance": 0.62,
                "pulse_bpm": 116,
            },
            {
                "year": 2020,
                "raw_val": 3.5,
                "distress_score": 0.82,
                "pitch_hz": 445,
                "harmonic_dissonance": 0.70,
                "pulse_bpm": 122,
            },
            {
                "year": 2024,
                "raw_val": 3.8,
                "distress_score": 0.90,
                "pitch_hz": 490,
                "harmonic_dissonance": 0.84,
                "pulse_bpm": 134,
            },
            {
                "year": 2026,
                "raw_val": 4.0,
                "distress_score": 0.94,
                "pitch_hz": 515,
                "harmonic_dissonance": 0.90,
                "pulse_bpm": 138,
            },
        ],
        "narrative": "Real-time global precipitation and snow rate retrieved directly from NASA Worldview via GIBS IMERG Precipitation Rate and OpenStreetMap Land Mask.",
    },
    "sea_surface_temp": {
        "id": "sea_surface_temp",
        "name": "Sea Surface Temperature",
        "coordinates": {"lat": 0.0, "lng": -140.0},
        "indicator": "GHRSST L4 MUR Sea Surface Temperature (Worldview)",
        "unit": "°C",
        "baseline_value": 21.5,
        "time_series": [
            {
                "year": 2000,
                "raw_val": 19.8,
                "distress_score": 0.18,
                "pitch_hz": 200,
                "harmonic_dissonance": 0.08,
                "pulse_bpm": 66,
            },
            {
                "year": 2005,
                "raw_val": 20.3,
                "distress_score": 0.32,
                "pitch_hz": 240,
                "harmonic_dissonance": 0.18,
                "pulse_bpm": 76,
            },
            {
                "year": 2010,
                "raw_val": 20.9,
                "distress_score": 0.46,
                "pitch_hz": 295,
                "harmonic_dissonance": 0.28,
                "pulse_bpm": 86,
            },
            {
                "year": 2016,
                "raw_val": 21.8,
                "distress_score": 0.74,
                "pitch_hz": 410,
                "harmonic_dissonance": 0.60,
                "pulse_bpm": 114,
            },
            {
                "year": 2020,
                "raw_val": 22.2,
                "distress_score": 0.82,
                "pitch_hz": 445,
                "harmonic_dissonance": 0.70,
                "pulse_bpm": 122,
            },
            {
                "year": 2024,
                "raw_val": 22.9,
                "distress_score": 0.92,
                "pitch_hz": 498,
                "harmonic_dissonance": 0.86,
                "pulse_bpm": 136,
            },
            {
                "year": 2026,
                "raw_val": 23.4,
                "distress_score": 0.96,
                "pitch_hz": 525,
                "harmonic_dissonance": 0.92,
                "pulse_bpm": 142,
            },
        ],
        "narrative": "Real-time global sea surface temperature scraped directly from NASA Worldview using GHRSST L4 Multi-scale Ultra-high Resolution (MUR) Sea Surface Temperature and Coastlines layers.",
    },
}

LIVE_IMAGE_DETAILS["current_snow_rain"] = LIVE_IMAGE_DETAILS["worldview_snow_rain"]
LIVE_IMAGE_DETAILS["worldview_sst"] = LIVE_IMAGE_DETAILS["sea_surface_temp"]


@app.get("/api/regions", response_model=List[RegionSummary])
def get_regions():
    return [
        RegionSummary(
            id="sea_surface_temp",
            name="Sea Surface Temperature",
            coordinates=RegionCoordinates(lat=0.0, lng=-140.0),
            indicator="GHRSST L4 MUR Sea Surface Temperature (Worldview)",
            latest_distress=0.96,
        ),
        RegionSummary(
            id="eyes_on_earth",
            name="Eyes on Earth Live",
            coordinates=RegionCoordinates(lat=24.0, lng=-45.0),
            indicator="NASA Eyes on Earth Visible Earth (Daily)",
            latest_distress=0.96,
        ),
        RegionSummary(
            id="realtime_precipitation",
            name="Global Precipitation",
            coordinates=RegionCoordinates(lat=0.0, lng=0.0),
            indicator="Near Real-Time Precipitation (SVS 4285)",
            latest_distress=0.96,
        ),
    ]


@app.get("/api/region/{region_id}", response_model=RegionDetail)
def get_region_detail(region_id: str):
    """Returns complete telemetry time-series and narrative for a specific region."""
    if region_id.lower() in LIVE_IMAGE_DETAILS:
        return LIVE_IMAGE_DETAILS[region_id.lower()]
    data = load_dataset()
    for reg in data.get("regions", []):
        if reg["id"].lower() == region_id.lower():
            return reg
    raise HTTPException(status_code=404, detail=f"Region '{region_id}' not found.")


@app.get("/api/sonify-vector")
def calculate_dynamic_vector(region_id: str, year: int):
    """
    Returns exact real-time DSP parameters for a given region and year.
    Used by the frontend timeline scrubber to modulate browser audio in real-time.
    """
    data = load_dataset()
    target_reg = None
    for reg in data.get("regions", []):
        if reg["id"].lower() == region_id.lower():
            target_reg = reg
            break

    if not target_reg:
        raise HTTPException(status_code=404, detail=f"Region '{region_id}' not found.")

    ts = target_reg.get("time_series", [])
    if not ts:
        raise HTTPException(status_code=500, detail="No time series points available.")

    # Find exact or closest year
    closest_point = min(ts, key=lambda p: abs(p["year"] - year))

    return {
        "region_id": region_id,
        "region_name": target_reg["name"],
        "requested_year": year,
        "matched_year": closest_point["year"],
        "raw_value": closest_point["raw_val"],
        "unit": target_reg["unit"],
        "dsp_parameters": {
            "pitch_hz": closest_point["pitch_hz"],
            "dissonance_ratio": closest_point["harmonic_dissonance"],
            "pulse_bpm": closest_point["pulse_bpm"],
            "distress_score": closest_point["distress_score"],
            "filter_cutoff_hz": int(300 + closest_point["distress_score"] * 3200),
        },
        "narrative": target_reg["narrative"],
    }


@app.get("/api/nasa/eyes-on-earth")
def get_eyes_on_earth_image():
    """
    Returns the latest true-color satellite mosaic scraped from NASA Eyes on Earth (bottom-right panel image).
    """
    data = fetch_current_earth_image()
    if not data:
        raise HTTPException(
            status_code=503, detail="Unable to fetch NASA Eyes on Earth imagery."
        )

    media_type = "image/jpeg"
    if data.startswith(b"\x89PNG"):
        media_type = "image/png"
    elif data.startswith(b"RIFF") and b"WEBP" in data[:12]:
        media_type = "image/webp"

    return Response(
        content=data,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=1800",
            "Access-Control-Allow-Origin": "*",
        },
    )


@app.get("/api/nasa/precipitation")
def get_realtime_precipitation_image():
    """
    Returns the latest real-time global precipitation composite image scraped from NASA SVS 4285.
    """
    data = fetch_realtime_precipitation_image()
    if not data:
        raise HTTPException(
            status_code=503, detail="Unable to fetch NASA precipitation imagery."
        )
    return Response(
        content=data,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=1800",
            "Access-Control-Allow-Origin": "*",
        },
    )


@app.get("/api/nasa/eyes-on-earth/url")
def get_eyes_on_earth_url():
    """
    Returns the direct scraped source image URL for NASA Eyes on Earth (Visible Earth 24h mosaic),
    along with CORS support information and fallback proxy endpoint.
    """
    url = scrape_eyes_on_earth_image_url()
    return {
        "status": "success",
        "dataset": "eyes_on_earth",
        "image_url": url,
        "cors_supported": True,
        "fallback_url": "/api/nasa/eyes-on-earth",
        "local_cache_url": "/textures/eyes_on_earth_now.jpg",
    }


@app.get("/api/nasa/precipitation/url")
def get_realtime_precipitation_url_endpoint():
    """
    Returns the direct scraped source image URL for NASA SVS 4285 Real-Time Global Precipitation,
    along with CORS support information and fallback proxy endpoint.
    """
    url = scrape_realtime_precipitation_url()
    return {
        "status": "success",
        "dataset": "precipitation",
        "image_url": url,
        "cors_supported": False,
        "fallback_url": "/api/nasa/precipitation",
        "local_cache_url": "/textures/imergert_1080p.now.png",
    }


@app.get("/api/nasa/worldview-snow-rain")
def get_worldview_snow_rain_image(t: str = None):
    """
    Returns the latest real-time Snow and Rain (IMERG Precipitation Rate & Land Mask)
    mosaic scraped from NASA Worldview / GIBS WMS.
    """
    url = DEFAULT_WORLDVIEW_URL
    realtime = t is None or t == "now" or t == "realtime"
    if t and not realtime:
        url = f"https://worldview.earthdata.nasa.gov/?l=IMERG_Precipitation_Rate,Land_Mask&t={t}"

    data = fetch_worldview_snow_rain_image(url, realtime=realtime)
    if not data:
        raise HTTPException(
            status_code=503,
            detail="Unable to fetch NASA Worldview Snow and Rain imagery.",
        )
    return Response(
        content=data,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=1800",
            "Access-Control-Allow-Origin": "*",
        },
    )


@app.get("/api/nasa/worldview-snow-rain/url")
def get_worldview_snow_rain_url_endpoint(t: str = None):
    """
    Returns the direct scraped source image URL for NASA Worldview Current Snow and Rain,
    along with CORS support information and fallback proxy endpoint.
    """
    url = DEFAULT_WORLDVIEW_URL
    realtime = t is None or t == "now" or t == "realtime"
    if t and not realtime:
        url = f"https://worldview.earthdata.nasa.gov/?l=IMERG_Precipitation_Rate,Land_Mask&t={t}"

    direct_url = scrape_worldview_snow_rain_url(url, realtime=realtime)
    return {
        "status": "success",
        "dataset": "worldview_snow_rain",
        "title": "Current Snow and Rain (NASA Worldview)",
        "source_worldview_url": url,
        "image_url": direct_url,
        "cors_supported": True,
        "fallback_url": "/api/nasa/worldview-snow-rain",
        "local_cache_url": "/textures/worldview_snow_and_rain.png",
    }


@app.get("/api/nasa/worldview-sst")
def get_worldview_sst_image(t: str = None):
    """
    Returns the latest real-time Sea Surface Temperature (GHRSST L4 MUR)
    mosaic scraped from NASA Worldview / GIBS WMS.
    """
    url = DEFAULT_WORLDVIEW_SST_URL
    realtime = t is None or t == "now" or t == "realtime"
    if t and not realtime:
        url = f"https://worldview.earthdata.nasa.gov/?l=Coastlines_15m,GHRSST_L4_MUR_Sea_Surface_Temperature&t={t}"

    data = fetch_worldview_sst_image(url, realtime=realtime)
    if not data:
        raise HTTPException(
            status_code=503,
            detail="Unable to fetch NASA Worldview Sea Surface Temperature imagery.",
        )
    return Response(
        content=data,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=1800",
            "Access-Control-Allow-Origin": "*",
        },
    )


@app.get("/api/nasa/worldview-sst/url")
def get_worldview_sst_url_endpoint(t: str = None):
    """
    Returns the direct scraped source image URL for NASA Worldview Sea Surface Temperature,
    along with CORS support information and fallback proxy endpoint.
    """
    url = DEFAULT_WORLDVIEW_SST_URL
    realtime = t is None or t == "now" or t == "realtime"
    if t and not realtime:
        url = f"https://worldview.earthdata.nasa.gov/?l=Coastlines_15m,GHRSST_L4_MUR_Sea_Surface_Temperature&t={t}"

    direct_url = scrape_worldview_sst_url(url, realtime=realtime)
    return {
        "status": "success",
        "dataset": "worldview_sst",
        "title": "Sea Surface Temperature (NASA Worldview GHRSST MUR)",
        "source_worldview_url": url,
        "image_url": direct_url,
        "cors_supported": True,
        "fallback_url": "/api/nasa/worldview-sst",
        "local_cache_url": "/textures/sea_surface_temperature.png",
    }


@app.get("/api/nasa/status")
def get_nasa_scrape_status():
    """
    Returns metadata about scraped NASA datasets.
    """
    wms_template = scrape_eyes_on_earth_wms_template()
    precip_url = scrape_realtime_precipitation_url()
    earth_url = scrape_eyes_on_earth_image_url()
    worldview_url = scrape_worldview_snow_rain_url(DEFAULT_WORLDVIEW_URL, realtime=True)
    sst_url = scrape_worldview_sst_url(DEFAULT_WORLDVIEW_SST_URL, realtime=True)
    return {
        "status": "active",
        "worldview_sst": {
            "source": DEFAULT_WORLDVIEW_SST_URL,
            "direct_url": sst_url,
            "title": "Sea Surface Temperature (GHRSST L4 MUR & Coastlines)",
            "endpoint": "/api/nasa/worldview-sst",
            "url_endpoint": "/api/nasa/worldview-sst/url",
        },
        "worldview_snow_rain": {
            "source": DEFAULT_WORLDVIEW_URL,
            "direct_url": worldview_url,
            "title": "Current Snow and Rain (IMERG Precipitation Rate & Land Mask)",
            "endpoint": "/api/nasa/worldview-snow-rain",
            "url_endpoint": "/api/nasa/worldview-snow-rain/url",
        },
        "eyes_on_earth": {
            "source": "https://eyes.nasa.gov/apps/earth/",
            "direct_url": earth_url,
            "wms_template": wms_template,
            "layer": "MODIS_Terra_CorrectedReflectance_TrueColor / VIIRS",
            "endpoint": "/api/nasa/eyes-on-earth",
            "url_endpoint": "/api/nasa/eyes-on-earth/url",
        },
        "precipitation": {
            "source": "https://svs.gsfc.nasa.gov/4285/",
            "direct_url": precip_url,
            "title": "Near Real-Time Global Precipitation (GPM IMERG)",
            "endpoint": "/api/nasa/precipitation",
            "url_endpoint": "/api/nasa/precipitation/url",
        },
    }
