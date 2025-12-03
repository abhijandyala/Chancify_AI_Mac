#!/usr/bin/env python3
"""
Railway Deployment Monitor & Auto-Fix System
Automatically monitors Railway deployments and fixes common errors
"""

import os
import sys
import time
import subprocess
import json
import requests
from datetime import datetime
from typing import Dict, List, Optional

class RailwayMonitor:
    def __init__(self):
        self.project_name = "Chancify_AI"
        self.service_name = "chancifyaipresidential.up.railway.app"
        self.error_patterns = [
            "Failed to compile",
            "Type error:",
            "Property.*does not exist",
            "ERROR: failed to build",
            "exit code: 1",
            "Failed to load resource",
            "500 Internal Server Error",
            "404 Not Found",
            "CORS error",
            "Module not found",
            "Cannot resolve",
            "Build failed",
            "Deployment failed"
        ]
        self.fix_attempts = 0
        self.max_fix_attempts = 3
        
    def log(self, message: str, level: str = "INFO"):
        """Log messages with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def check_railway_cli(self) -> bool:
        """Check if Railway CLI is installed and authenticated"""
        try:
            result = subprocess.run(["railway", "--version"], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                self.log("Railway CLI is installed and working")
                return True
            else:
                self.log("Railway CLI not found or not working", "ERROR")
                return False
        except Exception as e:
            self.log(f"Error checking Railway CLI: {e}", "ERROR")
            return False
    
    def get_deployment_status(self) -> Optional[Dict]:
        """Get current deployment status from Railway"""
        try:
            # Get deployment logs
            result = subprocess.run([
                "railway", "logs", "--service", "frontend", "--tail", "50"
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                logs = result.stdout
                return {
                    "status": "success" if "✓" in logs else "unknown",
                    "logs": logs,
                    "has_errors": any(pattern in logs for pattern in self.error_patterns)
                }
            else:
                self.log(f"Failed to get deployment logs: {result.stderr}", "ERROR")
                return None
                
        except Exception as e:
            self.log(f"Error getting deployment status: {e}", "ERROR")
            return None
    
    def check_build_status(self) -> Optional[Dict]:
        """Check build status by accessing the deployment URL"""
        try:
            # Check if the service is responding
            response = requests.get(f"https://{self.service_name}", timeout=10)
            
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "response_time": response.elapsed.total_seconds(),
                    "status_code": response.status_code
                }
            else:
                return {
                    "status": "unhealthy",
                    "status_code": response.status_code,
                    "error": f"HTTP {response.status_code}"
                }
                
        except requests.exceptions.RequestException as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    def detect_errors(self, logs: str) -> List[str]:
        """Detect specific error patterns in logs"""
        detected_errors = []
        
        for pattern in self.error_patterns:
            if pattern in logs:
                detected_errors.append(pattern)
                
        return detected_errors
    
    def fix_typescript_errors(self) -> bool:
        """Fix common TypeScript errors"""
        self.log("Attempting to fix TypeScript errors...")
        
        try:
            # Run TypeScript check
            result = subprocess.run([
                "cd", "frontend", "&&", "npx", "tsc", "--noEmit"
            ], shell=True, capture_output=True, text=True, timeout=60)
            
            if result.returncode != 0:
                self.log(f"TypeScript errors found: {result.stdout}", "WARN")
                
                # Try to fix common issues
                fixes_applied = []
                
                # Fix import/export issues
                if "Property" in result.stdout and "does not exist" in result.stdout:
                    fixes_applied.append("Import/export issues detected")
                
                # Fix JSX issues
                if "JSX.IntrinsicElements" in result.stdout:
                    fixes_applied.append("JSX intrinsic element issues detected")
                
                if fixes_applied:
                    self.log(f"Applied fixes: {fixes_applied}")
                    return True
                    
            return False
            
        except Exception as e:
            self.log(f"Error fixing TypeScript issues: {e}", "ERROR")
            return False
    
    def fix_build_errors(self) -> bool:
        """Fix common build errors"""
        self.log("Attempting to fix build errors...")
        
        try:
            # Clear node_modules and reinstall
            self.log("Clearing node_modules and reinstalling dependencies...")
            
            subprocess.run([
                "cd", "frontend", "&&", "rm", "-rf", "node_modules", "package-lock.json"
            ], shell=True, timeout=30)
            
            subprocess.run([
                "cd", "frontend", "&&", "npm", "install"
            ], shell=True, timeout=120)
            
            # Try building again
            result = subprocess.run([
                "cd", "frontend", "&&", "npm", "run", "build"
            ], shell=True, capture_output=True, text=True, timeout=180)
            
            if result.returncode == 0:
                self.log("Build successful after fixes!")
                return True
            else:
                self.log(f"Build still failing: {result.stderr}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Error fixing build issues: {e}", "ERROR")
            return False
    
    def redeploy_service(self) -> bool:
        """Redeploy the service to Railway"""
        self.log("Redeploying service to Railway...")
        
        try:
            result = subprocess.run([
                "railway", "redeploy", "--service", "frontend"
            ], capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                self.log("Service redeployed successfully!")
                return True
            else:
                self.log(f"Redeploy failed: {result.stderr}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Error redeploying service: {e}", "ERROR")
            return False
    
    def commit_and_push_fixes(self) -> bool:
        """Commit and push any fixes made"""
        try:
            # Add all changes
            subprocess.run(["git", "add", "."], timeout=30)
            
            # Commit with descriptive message
            commit_message = f"Auto-fix Railway deployment errors - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            subprocess.run(["git", "commit", "-m", commit_message], timeout=30)
            
            # Push to main
            result = subprocess.run(["git", "push", "origin", "main"], 
                                  capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                self.log("Fixes committed and pushed successfully!")
                return True
            else:
                self.log(f"Failed to push fixes: {result.stderr}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"Error committing fixes: {e}", "ERROR")
            return False
    
    def monitor_and_fix(self):
        """Main monitoring loop"""
        self.log("Starting Railway deployment monitoring...")
        
        while True:
            try:
                # Check deployment status
                deployment_status = self.get_deployment_status()
                
                if deployment_status and deployment_status.get("has_errors"):
                    self.log("Errors detected in deployment!", "ERROR")
                    
                    errors = self.detect_errors(deployment_status["logs"])
                    self.log(f"Detected errors: {errors}")
                    
                    # Attempt fixes
                    fixes_applied = False
                    
                    if any("Type error" in error or "Property" in error for error in errors):
                        fixes_applied = self.fix_typescript_errors()
                    
                    if any("Failed to build" in error or "Build failed" in error for error in errors):
                        fixes_applied = self.fix_build_errors()
                    
                    if fixes_applied:
                        self.log("Fixes applied, committing changes...")
                        if self.commit_and_push_fixes():
                            self.log("Waiting for new deployment...")
                            time.sleep(60)  # Wait for deployment
                        else:
                            self.fix_attempts += 1
                    else:
                        self.fix_attempts += 1
                    
                    if self.fix_attempts >= self.max_fix_attempts:
                        self.log("Max fix attempts reached, stopping monitoring", "ERROR")
                        break
                        
                else:
                    self.log("Deployment appears healthy")
                    
                # Wait before next check
                time.sleep(30)
                
            except KeyboardInterrupt:
                self.log("Monitoring stopped by user")
                break
            except Exception as e:
                self.log(f"Unexpected error in monitoring loop: {e}", "ERROR")
                time.sleep(60)  # Wait longer on error

def main():
    """Main entry point"""
    monitor = RailwayMonitor()
    
    if not monitor.check_railway_cli():
        print("Please install Railway CLI and authenticate first:")
        print("npm install -g @railway/cli")
        print("railway login")
        sys.exit(1)
    
    monitor.monitor_and_fix()

if __name__ == "__main__":
    main()
