#!/bin/bash
# Run temperature forecasting pipeline
cd "$(dirname "$0")"
python runs/run_pipeline.py "$@"
