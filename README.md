# Chancify AI

AI-powered college admissions probability calculator with personalized game plans.

## Overview

Chancify AI helps students understand their chances of admission to colleges based on comprehensive factors including:
- Academic performance (GPA, test scores, course rigor)
- Extracurricular activities and leadership
- Essays, recommendations, and interviews
- Special considerations (athletics, legacy, demographics)
- Application strategy and timing

### Deployment note
- Frontend and backend are aligned on main; set `NEXT_PUBLIC_API_URL`/`BACKEND_URL` to the active backend (Railway) before deploys.

## Project Structure

```
Chancify_AI/
├── backend/              # Python FastAPI backend + ML models
│   ├── api/             # API routes and endpoints
│   ├── models/          # ML models for probability calculations
│   ├── database/        # Database models and migrations
│   ├── core/            # Core business logic
│   └── config/          # Configuration files
├── frontend/            # Next.js React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API client services
│   │   └── utils/       # Utility functions
│   └── public/          # Static assets
├── data/                # Data files and configurations
│   ├── factors/         # Admissions factor definitions
│   ├── colleges/        # College-specific data
│   └── schemas/         # Data validation schemas
├── docs/                # Documentation
│   ├── methodology/     # Probability calculation methodology
│   └── api/             # API documentation
└── tests/               # Test suites
```

## Tech Stack

- **Frontend**: Next.js 14+ (React, TypeScript)
- **Backend**: Python 3.11+ with FastAPI
- **Database**: PostgreSQL 15+
- **ML/AI**: scikit-learn, pandas, numpy
- **Deployment**: Docker, Vercel (frontend), AWS/Railway (backend)

## ML Model Artifacts

The production ML models live under `backend/data/models/` and are versioned in compressed form (`*.joblib.gz`) to keep the repository size reasonable.
During Docker builds the compressed files are automatically decompressed into the expected `.joblib` paths.
For local development you can extract them with `gunzip -k backend/data/models/<model>.joblib.gz`.

## Development Phases

### Phase 1: Foundation (Current)
- ✅ Define admissions factors and weights
- ✅ Create project structure
- 🔄 Establish data schemas
- 🔄 Document calculation methodology

### Phase 2: Backend Infrastructure
- API development with FastAPI
- Database setup and models
- Authentication system

### Phase 3: ML Model Development
- Probability calculation engine
- Historical data analysis
- Model training and validation

### Phase 4: Frontend Development
- User input forms
- Results visualization
- Game plan generation UI

### Phase 5: Integration & Testing
- End-to-end integration
- User testing
- Performance optimization

## Getting Started

*Documentation will be updated as each phase is completed.*

## License

MIT

<!-- Deployment trigger: ensures both Railway services rebuild -->
