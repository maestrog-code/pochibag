#!/usr/bin/env python3
import subprocess
import os
import sys

# Change to project directory
os.chdir('/vercel/share/v0-project')

try:
    # Check git status
    print("[v0] Checking git status...")
    status = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True)
    print(status.stdout)
    
    # Stage all changes
    print("[v0] Staging changes...")
    subprocess.run(['git', 'add', '.'], check=True)
    
    # Commit changes
    commit_message = """Improve website accessibility, performance and mobile responsiveness

- Add semantic HTML structure with proper landmarks
- Add skip-to-content link for keyboard navigation
- Enhance accessibility with ARIA labels and roles
- Improve focus states for keyboard users
- Add screen reader announcements for cart and search
- Better form handling with proper validation
- Enhanced mobile responsiveness
- Better keyboard navigation with Escape key support
- Optimize image rendering and animations
- Improve form accessibility and email validation"""
    
    print("[v0] Committing changes...")
    subprocess.run(['git', 'commit', '-m', commit_message], check=True)
    
    # Get current branch
    print("[v0] Checking current branch...")
    branch = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], capture_output=True, text=True)
    current_branch = branch.stdout.strip()
    print(f"[v0] Current branch: {current_branch}")
    
    # Push changes
    print(f"[v0] Pushing changes to {current_branch}...")
    subprocess.run(['git', 'push', 'origin', current_branch], check=True)
    
    print("[v0] Successfully pushed changes to GitHub!")
    
except subprocess.CalledProcessError as e:
    print(f"[v0] Error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"[v0] Unexpected error: {e}")
    sys.exit(1)
