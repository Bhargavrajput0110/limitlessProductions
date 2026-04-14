// ============================================================================
// OPTIMIZED WORK SECTION - Fix Lag & Video Freezing
// ============================================================================

// Performance configuration
const WORK_CONFIG = {
  // Reduce scroll distance for smoother performance
  scrollDistance: window.innerWidth < 768 ? 3000 : 6000,
  
  // Throttle scroll updates (60fps max)
  scrollThrottle: 16,
  
  // Video optimization
  videoPreloadDistance: 500, // Start preloading when within 500px
  videoUnloadDistance: 1000, // Unload when 1000px away
  
  // Parallax optimization
  enableParallax: window.innerWidth >= 768 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  
  // Card detection optimization
  cardCheckInterval: 100, // Check active card every 100ms instead of every frame
};

// ============================================================================
// OPTIMIZED VIDEO MANAGER
// ============================================================================
class VideoManager {
  constructor() {
    this.videos = new Map();
    this.activeVideos = new Set();
    this.observer = null;
    this.init();
  }

  init() {
    // Use Intersection Observer for efficient video management
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const video = entry.target;
          
          if (entry.isIntersecting) {
            // Video is visible
            this.preloadVideo(video);
          } else {
            // Video is not visible
            this.unloadVideo(video);
          }
        });
      },
      {
        root: null,
        rootMargin: '500px', // Start preloading 500px before visible
        threshold: 0
      }
    );

    // Observe all videos
    document.querySelectorAll('.project-card video').forEach(video => {
      this.observer.observe(video);
      this.videos.set(video, {
        loaded: false,
        playing: false,
        src: video.dataset.src || video.src
      });
    });
  }

  preloadVideo(video) {
    const videoData = this.videos.get(video);
    if (!videoData || videoData.loaded) return;

    // Set src to start loading
    if (video.dataset.src && !video.src) {
      video.src = video.dataset.src;
    }

    // Preload metadata only (not full video)
    video.preload = 'metadata';
    video.load();
    
    videoData.loaded = true;
    this.videos.set(video, videoData);
  }

  unloadVideo(video) {
    const videoData = this.videos.get(video);
    if (!videoData) return;

    // Stop and unload video to free memory
    this.stopVideo(video);
    
    // Remove src to free memory (keep in dataset)
    if (video.src) {
      video.dataset.src = video.src;
      video.removeAttribute('src');
      video.load(); // This actually unloads the video
    }
    
    videoData.loaded = false;
    videoData.playing = false;
    this.videos.set(video, videoData);
  }

  playVideo(video) {
    const videoData = this.videos.get(video);
    if (!videoData || videoData.playing) return;

    // Ensure video is loaded
    if (!video.src && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }

    // Play with error handling
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          videoData.playing = true;
          this.activeVideos.add(video);
          this.videos.set(video, videoData);
        })
        .catch(error => {
          console.warn('Video play failed:', error);
          videoData.playing = false;
          this.videos.set(video, videoData);
        });
    }
  }

  stopVideo(video) {
    const videoData = this.videos.get(video);
    if (!videoData || !videoData.playing) return;

    video.pause();
    video.currentTime = 0;
    
    videoData.playing = false;
    this.activeVideos.delete(video);
    this.videos.set(video, videoData);
  }

  stopAllVideos() {
    this.activeVideos.forEach(video => this.stopVideo(video));
  }

  destroy() {
    this.stopAllVideos();
    if (this.observer) {
      this.observer.disconnect();
    }
    this.videos.clear();
    this.activeVideos.clear();
  }
}

// ============================================================================
// OPTIMIZED WORK SPINE
// ============================================================================
function initOptimizedWorkSpine(lenis, voidStage) {
  const track = document.getElementById('spine-track');
  if (!track) return;

  console.log('🎬 Initializing optimized work section...');

  // Initialize video manager
  const videoManager = new VideoManager();

  // Cache DOM queries
  const workGradient = document.getElementById('work-gradient-container');
  const gatewayBg = document.querySelector('.gateway-bg-img');
  const gatewayUI = document.querySelector('.gateway-ui');
  const workContent = document.querySelector('.work-content');
  const archiveBtn = document.querySelector('.archive-back-btn');
  const workGlow = document.getElementById('work-glow');
  const workHeader = document.querySelector('.work-header');

  // Cache all cards once
  const allCards = Array.from(
    document.querySelectorAll('.project-card, .category-title-card')
  );

  // Initial state
  gsap.set(workContent, { opacity: 0, scale: 1.05 });

  // Throttled update function
  let lastUpdate = 0;
  let updateTimeout = null;
  let lastClosestCard = null;

  function throttledUpdate(progress) {
    const now = performance.now();
    
    // Throttle to 60fps (16ms)
    if (now - lastUpdate < WORK_CONFIG.scrollThrottle) {
      return;
    }
    lastUpdate = now;

    // Early exit for closed state
    if (progress < 0.10) {
      if (voidStage._lastMoodKey !== 'cinema') {
        voidStage.setMood('cinema');
      }
      videoManager.stopAllVideos();
      return;
    }

    // Find closest card (optimized)
    const cx = window.innerWidth / 2;
    let closest = null;
    let minDist = Infinity;

    // Only check visible cards
    const visibleCards = allCards.filter(card => {
      const rect = card.getBoundingClientRect();
      return rect.left < window.innerWidth && rect.right > 0;
    });

    visibleCards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const dist = Math.abs((cx * 0.8) - (rect.left + rect.width / 2));
      
      if (dist < minDist) {
        minDist = dist;
        closest = card;
      }

      // Apply parallax only if enabled and card is project card
      if (WORK_CONFIG.enableParallax && card.classList.contains('project-card')) {
        const norm = Math.max(0, 1 - dist / (window.innerWidth * 0.5));
        
        // Use transform only (no filter for better performance)
        requestAnimationFrame(() => {
          card.style.transform = `scale(${0.85 + norm * 0.15})`;
          card.style.opacity = 0.3 + norm * 0.7;
        });
      }
    });

    // Update mood only if card changed
    if (closest && closest !== lastClosestCard) {
      lastClosestCard = closest;
      
      if (progress < 0.9 && closest.dataset.mood) {
        voidStage.setMood(closest.dataset.mood);
      }

      // Update filter buttons (debounced)
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        updateFilterButtons(progress, allCards);
      }, 100);
    }
  }

  // Create optimized timeline
  const workTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: "#work",
      start: "top top",
      end: `+=${WORK_CONFIG.scrollDistance}`,
      pin: true,
      scrub: 0.5, // Reduced scrub for smoother performance
      invalidateOnRefresh: true,
      anticipatePin: 1,
      id: "workSpine",
      onUpdate: (self) => throttledUpdate(self.progress)
    }
  });

  // Phase 1: Fade in (0 -> 1)
  workTimeline
    .to(workGradient, { opacity: 0.8, ease: 'power2.inOut', duration: 1 }, 0)
    .to(gatewayBg, { scale: 1.1, ease: 'power2.inOut', duration: 1 }, 0)
    .to(gatewayUI, { opacity: 0, scale: 1.1, ease: 'power2.in', duration: 0.6 }, 0)
    .to(workContent, { opacity: 1, scale: 1, ease: 'power2.out', duration: 0.8 }, 0.2)
    .to(archiveBtn, { opacity: 1, pointerEvents: 'auto', duration: 0.5 }, 0.5)
    .set(workContent, { pointerEvents: 'auto' }, 0.8);

  // Phase 2: Horizontal scroll (1 -> 4)
  workTimeline.to(track, {
    x: () => -(track.scrollWidth - window.innerWidth / 2),
    ease: "none",
    duration: 3 // Reduced from 4 for smoother scroll
  }, 1);

  // Phase 3: Fade out (3.5 -> 4)
  workTimeline
    .to(workGradient, { opacity: 0, ease: 'power2.inOut', duration: 0.5 }, 3.5)
    .to([workHeader, archiveBtn, workGlow], { opacity: 0, ease: 'power2.inOut', duration: 0.5 }, 3.5)
    .to(gatewayBg, { scale: 1, ease: 'power2.inOut', duration: 0.5 }, 3.5)
    .to(workContent, { opacity: 0, scale: 0.9, ease: 'power2.in', duration: 0.5 }, 3.5)
    .set(workContent, { pointerEvents: 'none' }, 3.5)
    .to(gatewayUI, { opacity: 1, scale: 1, ease: 'power2.out', duration: 0.5 }, 3.7);

  // Optimized card interactions
  initOptimizedCardInteractions(videoManager);

  return { workTimeline, videoManager };
}

// ============================================================================
// OPTIMIZED CARD INTERACTIONS
// ============================================================================
function initOptimizedCardInteractions(videoManager) {
  const isMobile = window.innerWidth < 768;
  
  document.querySelectorAll('.project-card').forEach(card => {
    const video = card.querySelector('video');
    const cardMedia = card.querySelector('.card-media');
    const cardCursor = card.querySelector('.card-cursor-inner');
    
    let hoverTimeout = null;

    // Optimized mousemove (only on desktop)
    if (!isMobile && cardMedia) {
      let mouseMoveTimeout = null;
      
      card.addEventListener('mousemove', (e) => {
        // Debounce mousemove
        if (mouseMoveTimeout) return;
        
        mouseMoveTimeout = setTimeout(() => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5;
          const y = (e.clientY - r.top) / r.height - 0.5;
          
          // Use transform only (no rotateX/rotateY for better performance)
          requestAnimationFrame(() => {
            cardMedia.style.transform = `translateY(-5px) scale(1.02)`;
          });
          
          if (cardCursor) {
            const mx = e.clientX - r.left;
            const my = e.clientY - r.top;
            cardCursor.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%) scale(1)`;
          }
          
          mouseMoveTimeout = null;
        }, 16); // 60fps
      });
    }
    
    // Mouseenter - delayed video play
    card.addEventListener('mouseenter', () => {
      if (!isMobile && cardMedia) {
        gsap.to(cardMedia, { 
          y: -5, 
          scale: 1.02,
          duration: 0.3, 
          ease: 'power2.out' 
        });
      }
      
      // Delay video play to avoid lag
      if (video) {
        hoverTimeout = setTimeout(() => {
          video.style.opacity = 1;
          videoManager.playVideo(video);
        }, 200); // 200ms delay
      }
    });
    
    // Mouseleave - stop video immediately
    card.addEventListener('mouseleave', () => {
      // Clear hover timeout
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
      
      if (!isMobile && cardMedia) {
        gsap.to(cardMedia, {
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: 'power2.out'
        });
      }
      
      if (cardCursor) {
        cardCursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
      }
      
      // Stop video immediately
      if (video) {
        video.style.opacity = 0;
        videoManager.stopVideo(video);
      }
    });
  });
}

// ============================================================================
// UPDATE FILTER BUTTONS (Optimized)
// ============================================================================
function updateFilterButtons(progress, activeCards) {
  let activeFilter = 'ALL';
  
  if (progress > 0.1) {
    const catCards = document.querySelectorAll('.category-title-card');
    catCards.forEach(cat => {
      const rect = cat.getBoundingClientRect();
      if (rect.left < window.innerWidth * 0.7) {
        activeFilter = cat.dataset.category;
      }
    });
  }
  
  // Batch DOM updates
  requestAnimationFrame(() => {
    const activeTextEl = document.querySelector('.active-chapter-text');
    const displayFilter = activeFilter === 'ALL' ? 'ALL CHAPTERS' : activeFilter;
    
    if (activeTextEl && activeTextEl.innerText !== displayFilter) {
      activeTextEl.innerText = displayFilter;
    }

    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(b => {
      const isActive = b.textContent.trim().toUpperCase() === activeFilter;
      b.classList.toggle('active', isActive);
      b.classList.toggle('text-[var(--scene-accent)]', isActive);
      b.classList.toggle('text-white/60', !isActive);
    });
  });
}

// ============================================================================
// EXPORT
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initOptimizedWorkSpine, VideoManager };
}
