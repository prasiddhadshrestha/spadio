#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <input_video.mp4> <track_id>"
  exit 1
fi

INPUT="$1"
TRACK_ID="$2"
OUT_DIR="public/tracks/${TRACK_ID}"
mkdir -p "$OUT_DIR"

ffmpeg -i "$INPUT" -vf "fps=1,scale=1280:-1" -q:v 4 "${OUT_DIR}/frame_%03d.jpg"
echo "Extracted frames to ${OUT_DIR}/"
