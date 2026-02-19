#!/bin/bash

set -eux

PORT=${1:-8001}

jlpm run build

cd _jlite_env
rm -r dist .jupyterlite.doit.db || true
jupyter lite build --contents content --output-dir dist --config jupyter_lite_config.json

cd dist
python -m http.server $PORT
