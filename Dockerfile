# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first for layer caching
COPY backend/requirements-essential.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code (main application)
COPY backend /app/backend

# EXPLICIT: Copy raw data files (might be filtered by .dockerignore)
# This ensures college CSV data is included for AI suggestions
COPY backend/data/raw /app/backend/data/raw
COPY backend/data/models /app/backend/data/models
COPY backend/models /app/backend/models

# Decompress large ML artifacts if only compressed versions are present
RUN set -e \
 && if [ -f /app/backend/data/models/ensemble.joblib.gz ]; then \
      gunzip -c /app/backend/data/models/ensemble.joblib.gz > /app/backend/data/models/ensemble.joblib; \
    fi \
 && if [ -f /app/backend/data/models/random_forest.joblib.gz ]; then \
      gunzip -c /app/backend/data/models/random_forest.joblib.gz > /app/backend/data/models/random_forest.joblib; \
    fi \
 && if [ -f /app/backend/data/models/logistic_regression.joblib.gz ]; then \
      gunzip -c /app/backend/data/models/logistic_regression.joblib.gz > /app/backend/data/models/logistic_regression.joblib; \
    fi \
 && if [ -f /app/backend/data/models/xgboost.joblib.gz ]; then \
      gunzip -c /app/backend/data/models/xgboost.joblib.gz > /app/backend/data/models/xgboost.joblib; \
    fi \
 && if [ -f /app/backend/data/models/scaler.joblib.gz ]; then \
      gunzip -c /app/backend/data/models/scaler.joblib.gz > /app/backend/data/models/scaler.joblib; \
    fi \
 && if [ -f /app/backend/data/models/feature_selector.joblib.gz ]; then \
      gunzip -c /app/backend/data/models/feature_selector.joblib.gz > /app/backend/data/models/feature_selector.joblib; \
    fi

# Copy data files that are outside the backend folder
# These files are referenced by data services using relative paths
COPY Tuition_InOut_2023.csv /app/Tuition_InOut_2023.csv
COPY College_State_Zip.csv /app/College_State_Zip.csv
COPY colleges_known_for_majors_full_heuristic.csv /app/colleges_known_for_majors_full_heuristic.csv
COPY therealdatabase /app/therealdatabase

# Verify critical files exist with graceful handling
# Required CSV file - build should fail if missing
RUN if [ ! -f /app/backend/data/raw/real_colleges_integrated.csv ]; then \
        echo "ERROR: Required file missing: real_colleges_integrated.csv" >&2 && \
        exit 1; \
    fi && \
    echo "✓ Verified: real_colleges_integrated.csv exists"

# Verify ML model files (may exist as .joblib or .joblib.gz)
# Only check for .joblib files that should exist after decompression or direct copy
RUN echo "Checking ML model files..." && \
    MISSING_MODELS=0 && \
    for model in ensemble logistic_regression random_forest xgboost scaler feature_selector; do \
        if [ -f /app/backend/data/models/${model}.joblib ]; then \
            echo "✓ Found: ${model}.joblib"; \
        elif [ -f /app/backend/data/models/${model}.joblib.gz ]; then \
            echo "⚠ Warning: ${model}.joblib.gz exists but ${model}.joblib not found (decompression may have failed)"; \
            MISSING_MODELS=$((MISSING_MODELS + 1)); \
        else \
            echo "⚠ Warning: ${model}.joblib and ${model}.joblib.gz not found"; \
            MISSING_MODELS=$((MISSING_MODELS + 1)); \
        fi; \
    done && \
    if [ $MISSING_MODELS -eq 0 ]; then \
        echo "✓ All model files verified"; \
    elif [ $MISSING_MODELS -eq 6 ]; then \
        echo "⚠ Warning: No model files found. Application may fail at runtime if models are required."; \
        echo "   This is acceptable if models will be loaded via external service or are optional."; \
    else \
        echo "⚠ Warning: $MISSING_MODELS model file(s) missing. Some features may be unavailable."; \
    fi

# Set environment variables
ENV PYTHONPATH=/app/backend:/app
ENV ENVIRONMENT=production
ENV PORT=8000

# Expose port
EXPOSE 8000

# Set working directory to backend for correct module resolution
WORKDIR /app/backend

# Start the application using shell form to expand $PORT
# Railway sets PORT environment variable at runtime
CMD python3 -m uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1 --log-level info
