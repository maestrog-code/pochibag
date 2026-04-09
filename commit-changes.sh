#!/bin/bash

# Navigate to project directory
cd /vercel/share/v0-project

# Configure git user for this commit
git config user.name "v0[bot]"
git config user.email "v0[bot]@users.noreply.github.com"

# Add all changes
git add -A

# Commit with descriptive message
git commit -m "Improve website accessibility, keyboard navigation, and mobile responsiveness

- Add semantic HTML structure with proper landmarks
- Implement keyboard navigation (Tab, Enter, Escape)
- Enhance accessibility with ARIA labels and focus states
- Add skip-to-content link for keyboard users
- Improve form validation and error messages
- Optimize mobile responsiveness across all breakpoints
- Add support for reduced motion preferences
- Enhance image loading and font rendering performance
- Improve search results with live region announcements
- Better cart feedback with screen reader support

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>"

# Push to the website-improvements branch
git push origin website-improvements

echo "✓ Changes committed and pushed to website-improvements branch"
