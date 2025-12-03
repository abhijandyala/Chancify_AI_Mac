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
    fi

# Copy data files that are outside the backend folder
# These files are referenced by data services using relative paths
COPY Tuition_InOut_2023.csv /app/Tuition_InOut_2023.csv
COPY College_State_Zip.csv /app/College_State_Zip.csv
COPY therealdatabase /app/therealdatabase

# Verify critical files exist (build will fail if not)
RUN ls -la /app/backend/data/raw/real_colleges_integrated.csv && \
    ls -la /app/backend/data/models/ensemble.joblib && \
    ls -la /app/backend/data/models/random_forest.joblib

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
# Force rebuild - Tue Dec  2 22:56:03 EST 2025
