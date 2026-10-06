import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.join(__dirname, '..');

try {
  console.log('Configuring git user...');
  execSync('git config user.name "v0[bot]"', { cwd: projectDir, stdio: 'inherit' });
  execSync('git config user.email "v0[bot]@users.noreply.github.com"', { cwd: projectDir, stdio: 'inherit' });

  console.log('Adding changes...');
  execSync('git add -A', { cwd: projectDir, stdio: 'inherit' });

  console.log('Committing changes...');
  const commitMessage = `Improve website accessibility, keyboard navigation, and mobile responsiveness

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

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>`;

  execSync(`git commit -m "${commitMessage}"`, { cwd: projectDir, stdio: 'inherit' });

  console.log('Pushing to GitHub...');
  execSync('git push origin website-improvements', { cwd: projectDir, stdio: 'inherit' });

  console.log('✓ Changes committed and pushed to website-improvements branch');
} catch (error) {
  console.error('Error during commit/push:', error.message);
  process.exit(1);
}
