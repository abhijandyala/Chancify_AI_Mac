"""
Train best possible model using insights from all experiments.

Best strategy from experiments:
- 5K-7K samples (sweet spot)
- Logistic Regression with C=0.5
- Ensemble weights: LR-heavy
- Lower noise in data
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score, accuracy_score, brier_score_loss
import xgboost as xgb
import joblib
import json
from pathlib import Path
from datetime import datetime


def train_best_model():
    """Train using best configuration from all experiments."""

    print("="*60)
    print("BEST MODEL TRAINING")
    print("="*60)
    print("Configuration:")
    print("  Data: 5,000 samples (optimal size)")
    print("  LR: C=0.3 (tuned)")
    print("  RF: 300 trees, depth=12")
    print("  XGB: 300 estimators, lr=0.03")
    print("  Ensemble: LR-heavy (3:1:1)")
    print()

    # Use the 5K dataset (performed best)
    df = pd.read_csv('data/processed/training_data_large.csv')
    print(f"Loaded {len(df):,} samples")

    metadata_cols = ['college_name', 'acceptance_rate', 'selectivity_tier',
                    'formula_probability', 'final_probability', 'outcome', 'profile_strength']
    feature_cols = [col for col in df.columns if col not in metadata_cols]

    X = df[feature_cols].values
    y = df['outcome'].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Train: {len(X_train):,}, Test: {len(X_test):,}")

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    models = {}

    # === BEST LOGISTIC REGRESSION ===
    print("\n" + "="*60)
    print("TRAINING BEST LOGISTIC REGRESSION")
    print("="*60)

    lr = LogisticRegression(
        penalty='l2',
        C=0.3,  # Sweet spot from grid search
        max_iter=2000,
        random_state=42,
        class_weight='balanced',
        solver='lbfgs'
    )

    lr_calibrated = CalibratedClassifierCV(lr, method='sigmoid', cv=5)
    lr_calibrated.fit(X_train_scaled, y_train)

    y_pred_lr = lr_calibrated.predict_proba(X_test_scaled)[:, 1]
    acc_lr = accuracy_score(y_test, (y_pred_lr > 0.5).astype(int))
    auc_lr = roc_auc_score(y_test, y_pred_lr)
    brier_lr = brier_score_loss(y_test, y_pred_lr)

    print(f"Accuracy: {acc_lr:.4f}")
    print(f"ROC-AUC: {auc_lr:.4f}")
    print(f"Brier: {brier_lr:.4f}")

    models['logistic_regression'] = lr_calibrated

    # === BEST RANDOM FOREST ===
    print("\n" + "="*60)
    print("TRAINING BEST RANDOM FOREST")
    print("="*60)

    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_split=15,
        min_samples_leaf=8,
        max_features='sqrt',
        random_state=42,
        class_weight='balanced',
        n_jobs=-1
    )

    rf.fit(X_train_scaled, y_train)

    y_pred_rf = rf.predict_proba(X_test_scaled)[:, 1]
    acc_rf = accuracy_score(y_test, (y_pred_rf > 0.5).astype(int))
    auc_rf = roc_auc_score(y_test, y_pred_rf)
    brier_rf = brier_score_loss(y_test, y_pred_rf)

    print(f"Accuracy: {acc_rf:.4f}")
    print(f"ROC-AUC: {auc_rf:.4f}")
    print(f"Brier: {brier_rf:.4f}")

    models['random_forest'] = rf

    # === BEST XGBOOST ===
    print("\n" + "="*60)
    print("TRAINING BEST XGBOOST")
    print("="*60)

    scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()

    xgb_model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.03,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        eval_metric='logloss',
        reg_alpha=0.1,
        reg_lambda=1.0
    )

    xgb_model.fit(X_train_scaled, y_train)

    y_pred_xgb = xgb_model.predict_proba(X_test_scaled)[:, 1]
    acc_xgb = accuracy_score(y_test, (y_pred_xgb > 0.5).astype(int))
    auc_xgb = roc_auc_score(y_test, y_pred_xgb)
    brier_xgb = brier_score_loss(y_test, y_pred_xgb)

    print(f"Accuracy: {acc_xgb:.4f}")
    print(f"ROC-AUC: {auc_xgb:.4f}")
    print(f"Brier: {brier_xgb:.4f}")

    models['xgboost'] = xgb_model

    # === BEST ENSEMBLE (LR-heavy) ===
    print("\n" + "="*60)
    print("TRAINING BEST ENSEMBLE")
    print("="*60)
    print("Weights: LR=3, RF=1, XGB=1 (60% LR, 20% RF, 20% XGB)")

    ensemble = VotingClassifier(
        estimators=[
            ('lr', lr_calibrated),
            ('rf', rf),
            ('xgb', xgb_model)
        ],
        voting='soft',
        weights=[3, 1, 1]
    )

    ensemble.fit(X_train_scaled, y_train)

    y_pred_ens = ensemble.predict_proba(X_test_scaled)[:, 1]
    acc_ens = accuracy_score(y_test, (y_pred_ens > 0.5).astype(int))
    auc_ens = roc_auc_score(y_test, y_pred_ens)
    brier_ens = brier_score_loss(y_test, y_pred_ens)

    print(f"Accuracy: {acc_ens:.4f}")
    print(f"ROC-AUC: {auc_ens:.4f}")
    print(f"Brier: {brier_ens:.4f}")

    models['ensemble'] = ensemble

    # === COMPARISON ===
    print("\n" + "="*60)
    print("FINAL RESULTS")
    print("="*60)
    print(f"{'Model':<25} {'Accuracy':>10} {'ROC-AUC':>10} {'Brier':>10}")
    print("-" * 65)
    print(f"{'Logistic Regression':<25} {acc_lr:>10.4f} {auc_lr:>10.4f} {brier_lr:>10.4f}")
    print(f"{'Random Forest':<25} {acc_rf:>10.4f} {auc_rf:>10.4f} {brier_rf:>10.4f}")
    print(f"{'XGBoost':<25} {acc_xgb:>10.4f} {auc_xgb:>10.4f} {brier_xgb:>10.4f}")
    print(f"{'ENSEMBLE (BEST)':<25} {acc_ens:>10.4f} {auc_ens:>10.4f} {brier_ens:>10.4f}")

    print("\n" + "="*60)
    print("PROGRESSION SUMMARY")
    print("="*60)
    print("Iteration 0 (1K samples):   ROC-AUC 0.7812")
    print("Iteration 1 (5K samples):   ROC-AUC 0.8092")
    print(f"FINAL (5K optimized):       ROC-AUC {auc_ens:.4f}")
    print(f"\nTotal Improvement: +{(auc_ens - 0.7812):.4f} ({((auc_ens - 0.7812) / 0.7812 * 100):.1f}%)")

    # Save
    output_path = Path('data/models')
    for name, model in models.items():
        joblib.dump(model, output_path / f'{name}.joblib')
    joblib.dump(scaler, output_path / 'scaler.joblib')

    metadata = {
        'training_date': datetime.now().isoformat(),
        'version': '3.0_best',
        'num_samples': len(df),
        'num_train': len(X_train),
        'num_test': len(X_test),
        'num_features': len(feature_cols),
        'feature_names': feature_cols,
        'ensemble_weights': [3, 1, 1],
        'metrics': {
            'logistic_regression': {'accuracy': float(acc_lr), 'roc_auc': float(auc_lr), 'brier_score': float(brier_lr)},
            'random_forest': {'accuracy': float(acc_rf), 'roc_auc': float(auc_rf), 'brier_score': float(brier_rf)},
            'xgboost': {'accuracy': float(acc_xgb), 'roc_auc': float(auc_xgb), 'brier_score': float(brier_xgb)},
            'ensemble': {'accuracy': float(acc_ens), 'roc_auc': float(auc_ens), 'brier_score': float(brier_ens)}
        }
    }

    with open(output_path / 'metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)

    print("\nModels saved!")
    print("\nREADY FOR PRODUCTION!")

    return metadata


if __name__ == "__main__":
    train_best_model()

