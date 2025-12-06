"""
SQLAlchemy models for Chancify AI database.
"""

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text,
    DECIMAL, ForeignKey, JSON, ARRAY, UniqueConstraint, Index, Float
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class User(Base):
    """User authentication table."""
    
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255))  # Nullable for OAuth users
    first_name = Column(String(100))
    last_name = Column(String(100))
    
    # OAuth fields
    google_id = Column(String(255), unique=True)
    provider = Column(String(20), default="local")  # "local", "google"
    
    # Account status
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_login = Column(DateTime(timezone=True))
    
    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False)


class UserProfile(Base):
    """User profile information."""
    
    __tablename__ = "user_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    
    # Personal Information
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(255))
    high_school_name = Column(String(255))
    graduation_year = Column(Integer)
    
    # Profile Status
    profile_complete = Column(Boolean, default=False)
    last_updated = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="profile")
    academic_data = relationship("AcademicData", back_populates="profile", uselist=False)
    extracurriculars = relationship("Extracurricular", back_populates="profile")
    saved_colleges = relationship("SavedCollege", back_populates="profile")
    calculations = relationship("ProbabilityCalculation", back_populates="profile")


class AcademicData(Base):
    """Academic information for a user."""
    
    __tablename__ = "academic_data"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("user_profiles.id"), nullable=False)
    
    # GPA Information
    gpa_unweighted = Column(DECIMAL(3, 2))
    gpa_weighted = Column(DECIMAL(3, 2))
    gpa_scale = Column(String(10))  # "4.0", "5.0", "100", "other"
    class_rank = Column(Integer)
    class_size = Column(Integer)
    
    # Standardized Testing
    sat_total = Column(Integer)
    sat_math = Column(Integer)
    sat_reading_writing = Column(Integer)
    act_composite = Column(Integer)
    test_optional_choice = Column(Boolean)
    
    # Curriculum (stored as JSON for flexibility)
    ap_courses = Column(JSON, default=list)
    ib_program = Column(JSON, default=dict)
    honors_courses = Column(JSON, default=list)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    profile = relationship("UserProfile", back_populates="academic_data")


class Extracurricular(Base):
    """Extracurricular activities for a user."""
    
    __tablename__ = "extracurriculars"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("user_profiles.id"), nullable=False)
    
    # Activity Information
    activity_name = Column(String(255), nullable=False)
    category = Column(String(50))  # Academic, Arts, Athletics, etc.
    leadership_positions = Column(ARRAY(String), default=list)
    years_participated = Column(ARRAY(Integer), default=list)
    hours_per_week = Column(DECIMAL(4, 1))
    weeks_per_year = Column(Integer)
    description = Column(Text)
    achievements = Column(JSON, default=list)
    
    # Display order
    display_order = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class College(Base):
    """College/university reference data."""
    
    __tablename__ = "colleges"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic Information
    name = Column(String(255), nullable=False, unique=True)
    common_name = Column(String(255))
    location_city = Column(String(100))
    location_state = Column(String(50))
    
    # Admissions Data
    acceptance_rate = Column(DECIMAL(5, 4))
    acceptance_rate_ed1 = Column(DECIMAL(5, 4))
    acceptance_rate_ea = Column(DECIMAL(5, 4))
    acceptance_rate_rd = Column(DECIMAL(5, 4))
    
    # Academic Profile
    sat_25th = Column(Integer)
    sat_75th = Column(Integer)
    act_25th = Column(Integer)
    act_75th = Column(Integer)
    gpa_average = Column(DECIMAL(3, 2))
    
    # Policies
    test_policy = Column(String(20))  # Required, Optional, Blind
    financial_aid_policy = Column(String(20))  # Need-blind, Need-aware
    uses_common_app = Column(Boolean)
    
    # Factor Weights (custom per college)
    custom_weights = Column(JSON)
    
    # Metadata
    data_source = Column(String(100))
    last_updated = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    saved_by_users = relationship("SavedCollege", back_populates="college")
    calculations = relationship("ProbabilityCalculation", back_populates="college")


class SavedCollege(Base):
    """Colleges saved by users with application details."""
    
    __tablename__ = "saved_colleges"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("user_profiles.id"), nullable=False)
    college_id = Column(UUID(as_uuid=True), ForeignKey("colleges.id"), nullable=False)
    
    # Application Plan
    application_round = Column(String(10))  # ED1, ED2, EA, RD
    intended_major = Column(String(100))
    demonstrated_interest_score = Column(DECIMAL(3, 1))
    campus_visited = Column(Boolean, default=False)
    
    # User Notes
    notes = Column(Text)
    category = Column(String(20))  # reach, target, safety
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Ensure unique combination
    __table_args__ = (
        UniqueConstraint('profile_id', 'college_id', name='unique_user_college'),
    )
    
    # Relationships
    profile = relationship("UserProfile", back_populates="saved_colleges")
    college = relationship("College", back_populates="saved_by_users")


class ProbabilityCalculation(Base):
    """Cached probability calculation results."""
    
    __tablename__ = "probability_calculations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("user_profiles.id"), nullable=False)
    college_id = Column(UUID(as_uuid=True), ForeignKey("colleges.id"), nullable=False)
    
    # Input Factors (snapshot)
    factor_scores = Column(JSON, nullable=False)
    
    # Results
    composite_score = Column(DECIMAL(6, 2))
    probability = Column(DECIMAL(5, 4))
    percentile_estimate = Column(DECIMAL(5, 2))
    
    # Audit Trail
    audit_breakdown = Column(JSON)
    policy_notes = Column(JSON)
    
    # Metadata
    calculation_version = Column(String(10), default="1.0")
    calculated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    profile = relationship("UserProfile", back_populates="calculations")
    college = relationship("College", back_populates="calculations")


class ScorecardCollege(Base):
    """
    College reference data sourced from U.S. College Scorecard.
    This is separate from the legacy College table and keyed by the official Scorecard ID.
    """

    __tablename__ = "scorecard_colleges"

    scorecard_id = Column(Integer, primary_key=True, autoincrement=False)

    # Identifiers
    opeid = Column(String(20))
    opeid6 = Column(String(20))

    # Basic information
    name = Column(String(255), nullable=False)
    city = Column(String(100))
    state = Column(String(10))
    zip = Column(String(20))
    region_id = Column(Integer)
    school_url = Column(String(512))
    ownership = Column(String(50))  # public / private nonprofit / for-profit
    predominant_degree = Column(Integer)
    locale = Column(Integer)

    # Size
    student_size = Column(Integer)

    # Admissions
    admission_rate = Column(Float)  # latest.admissions.admission_rate.overall
    sat_avg = Column(Float)  # latest.admissions.sat_scores.average.overall
    sat_math = Column(Float)
    sat_ebrw = Column(Float)
    act_mid = Column(Float)  # latest.admissions.act_scores.midpoint.cumulative

    # Costs
    cost_attendance = Column(Integer)  # latest.cost.attendance.academic_year
    tuition_in_state = Column(Integer)
    tuition_out_of_state = Column(Integer)
    net_price = Column(Integer)  # latest.cost.net_price.overall

    # Outcomes
    completion_rate = Column(Float)  # latest.completion.rate_suppressed.overall
    earnings_10yr = Column(Integer)  # latest.earnings.10_yrs_after_entry.median
    repayment_3yr = Column(Float)  # latest.repayment.3_yr_repayment.overall

    # Derived buckets to speed up filtering
    selectivity_bucket = Column(String(20))  # very_selective | selective | moderate | open | unknown
    size_bucket = Column(String(20))  # small | medium | large | unknown
    cost_bucket = Column(String(20))  # low | medium | high | unknown

    # Metadata
    data_year = Column(Integer)  # latest data year fetched
    last_synced_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    image = relationship("CollegeImage", back_populates="college", uselist=False)

    __table_args__ = (
        Index("ix_scorecard_state", "state"),
        Index("ix_scorecard_selectivity", "selectivity_bucket"),
        Index("ix_scorecard_net_price", "net_price"),
        Index("ix_scorecard_size", "student_size"),
    )


class CollegeImage(Base):
    """
    Cached image metadata per college (Google Places, etc.).
    One row per scorecard_college to avoid repeated external API calls.
    """

    __tablename__ = "college_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    college_id = Column(Integer, ForeignKey("scorecard_colleges.scorecard_id"), unique=True, nullable=False)

    provider = Column(String(50), default="google_places")
    place_id = Column(String(255))
    photo_reference = Column(String(512))
    image_url = Column(String(1024))
    has_image = Column(Boolean, default=False)

    last_fetched_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    college = relationship("ScorecardCollege", back_populates="image")
