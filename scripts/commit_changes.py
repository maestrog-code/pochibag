#!/usr/bin/env python3
import subprocess
import os
import sys

# Change to project directory
project_dir = "/vercel/share/v0-project"
os.chdir(project_dir)

print(f"[v0] Working directory: {os.getcwd()}")
print(f"[v0] Git directory exists: {os.path.exists('.git')}")

try:
    # Configure git
    subprocess.run(["git", "config", "user.name", "v0[bot]"], check=True, cwd=project_dir)
    subprocess.run(["git", "config", "user.email", "v0[bot]@users.noreply.github.com"], check=True, cwd=project_dir)
    print("[v0] Git user configured")
    
    # Check status
    status = subprocess.run(["git", "status", "--short"], capture_output=True, text=True, cwd=project_dir)
    print("[v0] Git status:")
    print(status.stdout)
    
    # Add all changes
    subprocess.run(["git", "add", "."], check=True, cwd=project_dir)
    print("[v0] Changes staged")
    
    # Commit changes
    commit_msg = "Improve website: accessibility, keyboard navigation, mobile responsiveness, and performance"
    subprocess.run(["git", "commit", "-m", commit_msg], check=True, cwd=project_dir)
    print("[v0] Changes committed")
    
    # Check current branch
    branch = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True, cwd=project_dir)
    current_branch = branch.stdout.strip()
    print(f"[v0] Current branch: {current_branch}")
    
    # Push changes
    subprocess.run(["git", "push", "origin", current_branch], check=True, cwd=project_dir)
    print(f"[v0] Changes pushed to origin/{current_branch}")
    
    print("\n✅ Successfully committed and pushed improvements to GitHub!")
    
except subprocess.CalledProcessError as e:
    print(f"❌ Error during git operation: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)
