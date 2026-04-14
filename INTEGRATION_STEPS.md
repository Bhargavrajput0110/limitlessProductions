
# Work Section Optimization - Integration Steps

## ✅ Completed Automatically
- [x] Updated video tags (src → data-src)
- [x] Added preload="none" to videos
- [x] Added CSS performance optimizations

## 🔧 Manual Steps Required

### Step 1: Update main.js

Find this line in your main.js:
```javascript
initWorkSpine();
```

Replace with:
```javascript
// Import optimized version
const { initOptimizedWorkSpine } = require('./work-section-optimized.js');

// Initialize with optimization
const { workTimeline, videoManager } = initOptimizedWorkSpine(lenis, voidStage);
```

### Step 2: Test Performance

Open your site and:
1. Scroll through work section (should be smooth 60fps)
2. Hover over project cards (videos should play without lag)
3. Check memory usage in DevTools (should be < 300MB)

### Step 3: Optimize Video Files (If Still Laggy)

Run this command for each video:
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -crf 28 \
  -preset slow \
  -vf "scale=1280:-2" \
  -movflags +faststart \
  -an \
  output.mp4
```

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
