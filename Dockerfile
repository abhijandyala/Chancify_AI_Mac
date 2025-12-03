# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first for layer caching
COPY backend/requirements-essential.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend /app/backend

# Copy data files that are outside the backend folder
# These files are referenced by data services using relative paths
COPY Tuition_InOut_2023.csv /app/Tuition_InOut_2023.csv
COPY College_State_Zip.csv /app/College_State_Zip.csv
COPY therealdatabase /app/therealdatabase

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
