"""
Augment training data with MISC-derived features and merge Reddit dataset.

Outputs:
    data/processed/training_data_real_all_misc.csv

Steps:
1) Load base training data (training_data_real_all.csv).
2) Load reddit_admissions_dataset.csv if present.
3) Compute misc feature columns from misc_bullets_json using extract_misc_signals.
4) Add default/neutral metadata fields for reddit rows.
5) Align columns, fill missing columns, and fill NaNs with column means (numeric) or defaults.
"""

import json
from pathlib import Path
from typing import List

import numpy as np
import pandas as pd

from ml.preprocessing.misc_features import extract_misc_signals


BASE_PATH = Path("data/processed/training_data_real_all.csv")
REDDIT_PATH = Path("data/processed/reddit_admissions_dataset.csv")
OUTPUT_PATH = Path("data/processed/training_data_real_all_misc.csv")

MISC_SIGNAL_COLS: List[str] = [
    "misc_has_internship",
    "misc_has_research",
    "misc_has_competition",
    "misc_has_summer_program",
    "misc_has_nonprofit",
    "misc_has_work",
    "misc_has_leadership",
    "misc_has_service",
    "misc_has_award",
    "misc_award_tier_national",
    "misc_award_tier_state",
    "misc_award_tier_regional",
    "misc_award_tier_school",
    "misc_has_rigor_ib",
    "misc_has_rigor_dual_enroll",
    "misc_has_rigor_cambridge",
    "misc_has_ap_exam",
    "misc_count_testing",
    "misc_count_academics",
    "misc_count_awards",
    "misc_count_leadership",
    "misc_count_service",
    "misc_count_work",
    "misc_count_projects",
]


def compute_misc_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add misc signal columns (all floats) based on misc_bullets_json if present."""
    for col in MISC_SIGNAL_COLS:
        df[col] = 0.0

    if "misc_bullets_json" not in df.columns:
        return df

    for idx, row in df.iterrows():
        raw = row.get("misc_bullets_json")
        if not isinstance(raw, str) or not raw.strip():
            continue
        try:
            bullets = json.loads(raw)
            if not isinstance(bullets, list):
                continue
            bullets = [str(b) for b in bullets if isinstance(b, str)]
        except Exception:
            continue
        signals = extract_misc_signals(bullets, use_openai=False)
        df.loc[idx, "misc_has_internship"] = signals["has_internship"]
        df.loc[idx, "misc_has_research"] = signals["has_research"]
        df.loc[idx, "misc_has_competition"] = signals["has_competition"]
        df.loc[idx, "misc_has_summer_program"] = signals["has_summer_program"]
        df.loc[idx, "misc_has_nonprofit"] = signals["has_nonprofit"]
        df.loc[idx, "misc_has_work"] = signals["has_work"]
        df.loc[idx, "misc_has_leadership"] = signals["has_leadership"]
        df.loc[idx, "misc_has_service"] = signals["has_service"]
        df.loc[idx, "misc_has_award"] = signals["has_award"]
        df.loc[idx, "misc_award_tier_national"] = signals["award_tier_national"]
        df.loc[idx, "misc_award_tier_state"] = signals["award_tier_state"]
        df.loc[idx, "misc_award_tier_regional"] = signals["award_tier_regional"]
        df.loc[idx, "misc_award_tier_school"] = signals["award_tier_school"]
        df.loc[idx, "misc_has_rigor_ib"] = signals["has_rigor_ib"]
        df.loc[idx, "misc_has_rigor_dual_enroll"] = signals["has_rigor_dual_enroll"]
        df.loc[idx, "misc_has_rigor_cambridge"] = signals["has_rigor_cambridge"]
        df.loc[idx, "misc_has_ap_exam"] = signals["has_ap_exam"]
        df.loc[idx, "misc_count_testing"] = signals["count_testing"]
        df.loc[idx, "misc_count_academics"] = signals["count_academics"]
        df.loc[idx, "misc_count_awards"] = signals["count_awards"]
        df.loc[idx, "misc_count_leadership"] = signals["count_leadership"]
        df.loc[idx, "misc_count_service"] = signals["count_service"]
        df.loc[idx, "misc_count_work"] = signals["count_work"]
        df.loc[idx, "misc_count_projects"] = signals["count_projects"]

    return df


def ensure_columns(df: pd.DataFrame, template_cols: List[str]) -> pd.DataFrame:
    for col in template_cols:
        if col not in df.columns:
            df[col] = np.nan
    return df


def main():
    if not BASE_PATH.exists():
        raise FileNotFoundError(f"Base training data not found: {BASE_PATH}")

    base_df = pd.read_csv(BASE_PATH)
    print(f"Base training rows: {len(base_df)}")

    # Start with base columns as template
    template_cols = list(base_df.columns)

    # Load reddit dataset if available
    if REDDIT_PATH.exists():
        reddit_df = pd.read_csv(REDDIT_PATH)
        print(f"Reddit rows: {len(reddit_df)}")

        # Map decision -> outcome
        if "decision" in reddit_df.columns:
            reddit_df["outcome"] = reddit_df["decision"]
        else:
            reddit_df["outcome"] = np.nan

        # Required metadata defaults
        reddit_df["acceptance_rate"] = reddit_df.get("acceptance_rate", 0.5)
        reddit_df["selectivity_tier"] = reddit_df.get("selectivity_tier", "Moderately Selective")
        reddit_df["formula_probability"] = reddit_df.get("formula_probability", 0.5)
        reddit_df["final_probability"] = reddit_df.get("final_probability", 0.5)
        reddit_df["profile_strength"] = reddit_df.get("profile_strength", 5.0)

        # Align columns to template
        reddit_df = ensure_columns(reddit_df, template_cols)

        # Compute misc features for reddit and base
        reddit_df = compute_misc_features(reddit_df)
    else:
        print("Reddit dataset not found; continuing with base only.")
        reddit_df = pd.DataFrame(columns=template_cols + MISC_SIGNAL_COLS)

    # Compute misc features for base (will remain zeros unless misc_bullets_json exists)
    base_df = compute_misc_features(base_df)

    # Ensure both have all columns (template + misc signals)
    all_cols = list(dict.fromkeys(template_cols + MISC_SIGNAL_COLS))
    base_df = ensure_columns(base_df, all_cols)
    reddit_df = ensure_columns(reddit_df, all_cols)

    combined = pd.concat([base_df[all_cols], reddit_df[all_cols]], ignore_index=True)
    print(f"Combined rows: {len(combined)}")

    # Fill NaNs: numeric with column mean; categorical with mode or default
    num_cols = combined.select_dtypes(include=[np.number]).columns
    cat_cols = [c for c in combined.columns if c not in num_cols]

    for col in num_cols:
        if combined[col].isna().any():
            combined[col].fillna(combined[col].mean(), inplace=True)
    for col in cat_cols:
        if combined[col].isna().any():
            combined[col].fillna("Unknown", inplace=True)

    combined.to_csv(OUTPUT_PATH, index=False)
    print(f"Wrote augmented training data to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

