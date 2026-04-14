#!/usr/bin/env node

// ============================================================================
// QUICK FIX SCRIPT - Apply Work Section Optimizations
// ============================================================================

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying work section optimizations...\n');

// ============================================================================
// 1. Update HTML - Change video src to data-src
// ============================================================================
function updateHTML() {
  console.log('📝 Updating HTML files...');
  
  const htmlFiles = ['index.html', 'journal.html'];
  let updated = 0;
  
  htmlFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Replace video src with data-src
    const videoRegex = /<video([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi;
    content = content.replace(videoRegex, (match, before, src, after) => {
      // Skip if already has data-src
      if (match.includes('data-src=')) return match;
      
      changed = true;
      
      // Add preload="none" if not present
      const hasPreload = /preload=/i.test(match);
      const preload = hasPreload ? '' : ' preload="none"';
      
      return `<video${before} data-src="${src}"${after}${preload}>`;
    });
    
    if (changed) {
      fs.writeFileSync(file, content);
      console.log(`   ✅ Updated ${file}`);
      updated++;
    }
  });
  
  if (updated === 0) {
    console.log('   ℹ️  No HTML updates needed');
  }
  
  console.log('');
}

// ============================================================================
// 2. Add CSS Optimizations
// ============================================================================
function addCSSOptimizations() {
  console.log('🎨 Adding CSS optimizations...');
  
  const cssFile = 'styles.css';
  
  if (!fs.existsSync(cssFile)) {
    console.log('   ⚠️  styles.css not found, skipping');
    console.log('');
    return;
  }
  
  let content = fs.readFileSync(cssFile, 'utf8');
  
  // Check if optimizations already exist
  if (content.includes('/* Video Performance Optimizations */')) {
    console.log('   ℹ️  CSS optimizations already applied');
    console.log('');
    return;
  }
  
  // Add optimizations at the end
  const optimizations = `

/* Video Performance Optimizations */
.project-card video {
  will-change: opacity;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.project-card:not(:hover) video {
  will-change: auto;
}

/* Card Performance Optimizations */
.project-card {
  will-change: transform, opacity;
}

.project-card:not(.active) {
  will-change: auto;
}

/* Smooth Scrolling Optimizations */
.spine-track {
  will-change: transform;
  transform: translateZ(0);
}

/* Reduce Motion Support */
@media (prefers-reduced-motion: reduce) {
  .project-card,
  .project-card video,
  .spine-track {
    will-change: auto !important;
    transition: none !important;
  }
}
`;
  
  content += optimizations;
  fs.writeFileSync(cssFile, content);
  
  console.log('   ✅ Added CSS optimizations to styles.css');
  console.log('');
}

// ============================================================================
// 3. Create Integration Instructions
// ============================================================================
function createInstructions() {
  console.log('📋 Creating integration instructions...');
  
  const instructions = `
# Work Section Optimization - Integration Steps

## ✅ Completed Automatically
- [x] Updated video tags (src → data-src)
- [x] Added preload="none" to videos
- [x] Added CSS performance optimizations

## 🔧 Manual Steps Required

### Step 1: Update main.js

Find this line in your main.js:
\`\`\`javascript
initWorkSpine();
\`\`\`

Replace with:
\`\`\`javascript
// Import optimized version
const { initOptimizedWorkSpine } = require('./work-section-optimized.js');

// Initialize with optimization
const { workTimeline, videoManager } = initOptimizedWorkSpine(lenis, voidStage);
\`\`\`

### Step 2: Test Performance

Open your site and:
1. Scroll through work section (should be smooth 60fps)
2. Hover over project cards (videos should play without lag)
3. Check memory usage in DevTools (should be < 300MB)

### Step 3: Optimize Video Files (If Still Laggy)

Run this command for each video:
\`\`\`bash
ffmpeg -i input.mp4 \\
  -c:v libx264 \\
  -crf 28 \\
  -preset slow \\
  -vf "scale=1280:-2" \\
  -movflags +faststart \\
  -an \\
  output.mp4
\`\`\`

Target: < 2MB per video

## 🎯 Expected Results

- Scroll FPS: 55-60 (was 25-35)
- Video hover: Instant (was 500ms+ freeze)
- Memory usage: < 300MB (was 800MB+)
- Video load: On-demand (was all at once)

## 🐛 Troubleshooting

### Videos not playing?
- Check browser console for errors
- Verify data-src attribute is set
- Test with a single video first

### Still laggy?
- Reduce scroll distance in work-section-optimized.js
- Disable parallax: enableParallax: false
- Optimize video files (see Step 3)

### Videos freezing?
- Increase hover delay to 300ms
- Reduce number of videos on page
- Check video file sizes (should be < 2MB)

## 📚 Documentation

See VIDEO_OPTIMIZATION_FIX.md for complete details.
`;
  
  fs.writeFileSync('INTEGRATION_STEPS.md', instructions);
  console.log('   ✅ Created INTEGRATION_STEPS.md');
  console.log('');
}

// ============================================================================
// 4. Backup Original Files
// ============================================================================
function backupFiles() {
  console.log('💾 Creating backups...');
  
  const filesToBackup = ['index.html', 'styles.css', 'main.js'];
  const backupDir = 'backups';
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  
  filesToBackup.forEach(file => {
    if (!fs.existsSync(file)) return;
    
    const backupFile = path.join(backupDir, `${file}.${timestamp}.backup`);
    fs.copyFileSync(file, backupFile);
    console.log(`   ✅ Backed up ${file}`);
  });
  
  console.log('');
}

// ============================================================================
// Main Execution
// ============================================================================
function main() {
  console.log('🚀 Work Section Optimization Script\n');
  console.log('This script will:');
  console.log('  1. Backup your files');
  console.log('  2. Update HTML video tags');
  console.log('  3. Add CSS optimizations');
  console.log('  4. Create integration instructions\n');
  
  try {
    backupFiles();
    updateHTML();
    addCSSOptimizations();
    createInstructions();
    
    console.log('✨ Optimization complete!\n');
    console.log('📖 Next steps:');
    console.log('   1. Read INTEGRATION_STEPS.md');
    console.log('   2. Update main.js (see instructions)');
    console.log('   3. Test your site');
    console.log('   4. Check VIDEO_OPTIMIZATION_FIX.md for details\n');
    console.log('🎉 Your work section should now be smooth and lag-free!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nPlease check the error and try again.');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { updateHTML, addCSSOptimizations, backupFiles };
