// ============================================================================
// PERFORMANCE OPTIMIZATION MODULE
// Optimized ScrollTrigger, Caching, and Mobile/Desktop Performance
// ============================================================================

// ============================================================================
// 1. PERFORMANCE DETECTION & ADAPTIVE QUALITY
// ============================================================================
class PerformanceManager {
    constructor() {
        this.isLowEnd = false;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isTouch = 'ontouchstart' in window;
        this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        this.detect();
    }

    detect() {
        // Check device memory (if available)
        const memory = navigator.deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 2;
        
        // Low-end detection criteria
        this.isLowEnd = (
            memory < 4 || 
            cores < 4 || 
            this.isMobile ||
            this.prefersReducedMotion
        );

        // Apply performance class to body
        if (this.isLowEnd) {
            document.body.classList.add('low-perf');
        }

        return this.isLowEnd;
    }

    getParticleCount() {
        if (this.prefersReducedMotion) return 0;
        if (this.isMobile) return 3000;
        if (this.isLowEnd) return 5000;
        return 15000;
    }

    getCursorParticleCount() {
        if (this.prefersReducedMotion) return 0;
        if (this.isMobile) return 0; // No cursor particles on mobile
        if (this.isLowEnd) return 500;
        return 1500;
    }

    shouldUseBloom() {
        return !this.isLowEnd && !this.prefersReducedMotion;
    }

    shouldUseGrain() {
        return !this.prefersReducedMotion;
    }

    getGrainFPS() {
        if (this.isMobile) return 12;
        if (this.isLowEnd) return 15;
        return 18;
    }
}

// ============================================================================
// 2. SCROLL TRIGGER OPTIMIZATION
// ============================================================================
class OptimizedScrollTrigger {
    constructor() {
        this.triggers = new Map();
        this.rafId = null;
        this.isScrolling = false;
        this.scrollTimeout = null;
    }

    // Batch ScrollTrigger creation with optimized settings
    createBatch(configs) {
        const batch = [];
        
        configs.forEach(config => {
            const optimizedConfig = {
                ...config,
                // Optimize refresh rate
                refreshPriority: config.refreshPriority || 0,
                // Use markers only in dev
                markers: false,
                // Optimize scrub
                scrub: config.scrub === true ? 1 : config.scrub,
                // Add invalidation
                invalidateOnRefresh: config.invalidateOnRefresh !== false,
                // Optimize pin spacing
                pinSpacing: config.pinSpacing !== false,
                // Add anticipatePin for smoother pinning
                anticipatePin: config.anticipatePin !== false ? 1 : 0
            };

            const trigger = ScrollTrigger.create(optimizedConfig);
            batch.push(trigger);
            
            if (config.id) {
                this.triggers.set(config.id, trigger);
            }
        });

        return batch;
    }

    // Debounced refresh
    refresh(delay = 100) {
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            ScrollTrigger.refresh();
        }, delay);
    }

    // Kill specific trigger
    kill(id) {
        const trigger = this.triggers.get(id);
        if (trigger) {
            trigger.kill();
            this.triggers.delete(id);
        }
    }

    // Kill all triggers
    killAll() {
        this.triggers.forEach(trigger => trigger.kill());
        this.triggers.clear();
    }
}

// ============================================================================
// 3. ASSET CACHING & PRELOADING
// ============================================================================
class AssetCache {
    constructor() {
        this.cache = new Map();
        this.preloadQueue = [];
        this.isPreloading = false;
    }

    // Preload images with priority
    async preloadImage(src, priority = 'low') {
        if (this.cache.has(src)) {
            return this.cache.get(src);
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            
            // Set loading priority
            if ('loading' in HTMLImageElement.prototype) {
                img.loading = priority === 'high' ? 'eager' : 'lazy';
            }
            
            // Set decode priority
            if ('decoding' in img) {
                img.decoding = priority === 'high' ? 'sync' : 'async';
            }

            img.onload = () => {
                this.cache.set(src, img);
                resolve(img);
            };
            
            img.onerror = reject;
            img.src = src;
        });
    }

    // Preload video with metadata only
    async preloadVideo(src, fullLoad = false) {
        if (this.cache.has(src)) {
            return this.cache.get(src);
        }

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = fullLoad ? 'auto' : 'metadata';
            video.muted = true;
            video.playsInline = true;

            video.onloadedmetadata = () => {
                this.cache.set(src, video);
                resolve(video);
            };

            video.onerror = reject;
            video.src = src;
        });
    }

    // Batch preload with priority queue
    async batchPreload(assets, onProgress) {
        const total = assets.length;
        let loaded = 0;

        const promises = assets.map(async (asset) => {
            try {
                if (asset.type === 'image') {
                    await this.preloadImage(asset.src, asset.priority);
                } else if (asset.type === 'video') {
                    await this.preloadVideo(asset.src, asset.fullLoad);
                }
                
                loaded++;
                if (onProgress) {
                    onProgress(loaded / total);
                }
            } catch (error) {
                console.warn(`Failed to preload: ${asset.src}`, error);
            }
        });

        await Promise.all(promises);
    }

    // Get cached asset
    get(src) {
        return this.cache.get(src);
    }

    // Clear cache
    clear() {
        this.cache.clear();
    }
}

// ============================================================================
// 4. OPTIMIZED LENIS SETUP
// ============================================================================
function createOptimizedLenis(perfManager) {
    const config = {
        duration: perfManager.isMobile ? 1.2 : 2.0,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: !perfManager.prefersReducedMotion,
        smoothTouch: false, // Disable on touch for better performance
        touchMultiplier: perfManager.isMobile ? 1.5 : 2,
        wheelMultiplier: perfManager.isMobile ? 0.5 : 1,
        infinite: false,
        // Optimize for performance
        lerp: perfManager.isMobile ? 0.15 : 0.1,
    };

    const lenis = new Lenis(config);

    // Throttled scroll update
    let scrollTicking = false;
    lenis.on('scroll', () => {
        if (!scrollTicking) {
            window.requestAnimationFrame(() => {
                ScrollTrigger.update();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    });

    // Optimize GSAP ticker
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return lenis;
}

// ============================================================================
// 5. OPTIMIZED SCROLL ANIMATIONS
// ============================================================================
function initOptimizedScrollAnimations(perfManager, scrollTrigger) {
    const isMobile = perfManager.isMobile;
    const isLowEnd = perfManager.isLowEnd;

    // Hero fade out - optimized
    scrollTrigger.createBatch([{
        id: 'hero-fade',
        trigger: '#philosophy',
        start: 'top bottom',
        end: 'top 10%',
        scrub: isLowEnd ? 0.5 : 1,
        onUpdate: (self) => {
            // Use transform instead of opacity for better performance
            gsap.set('.hero-container', {
                opacity: 1 - self.progress,
                willChange: self.isActive ? 'opacity' : 'auto'
            });
        }
    }]);

    // Philosophy parallax - simplified on mobile
    if (!isMobile) {
        scrollTrigger.createBatch([
            {
                id: 'philosophy-parallax-1',
                trigger: '.philosophy-section',
                start: 'top bottom',
                end: 'bottom top',
                scrub: isLowEnd ? 0.5 : 1,
                onUpdate: (self) => {
                    const progress = self.progress;
                    gsap.set('.bg-text-1', {
                        x: `${-15 * progress}%`,
                        willChange: self.isActive ? 'transform' : 'auto'
                    });
                }
            },
            {
                id: 'philosophy-parallax-2',
                trigger: '.philosophy-section',
                start: 'top bottom',
                end: 'bottom top',
                scrub: isLowEnd ? 0.5 : 1,
                onUpdate: (self) => {
                    const progress = self.progress;
                    gsap.set('.bg-text-2', {
                        x: `${15 * progress}%`,
                        willChange: self.isActive ? 'transform' : 'auto'
                    });
                }
            },
            {
                id: 'philosophy-parallax-3',
                trigger: '.philosophy-section',
                start: 'top bottom',
                end: 'bottom top',
                scrub: isLowEnd ? 0.5 : 1,
                onUpdate: (self) => {
                    const progress = self.progress;
                    gsap.set('.bg-text-3', {
                        x: `${-15 * progress}%`,
                        willChange: self.isActive ? 'transform' : 'auto'
                    });
                }
            }
        ]);
    }

    // Philosophy content reveal - optimized
    const philosophyElements = gsap.utils.toArray('.philosophy-content > *');
    if (philosophyElements.length) {
        scrollTrigger.createBatch([{
            id: 'philosophy-reveal',
            trigger: '.philosophy-section',
            start: 'top 75%',
            toggleActions: 'play none none reverse',
            once: true, // Only animate once
            onEnter: () => {
                gsap.fromTo(philosophyElements,
                    { y: 40, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        stagger: isLowEnd ? 0.08 : 0.15,
                        duration: isLowEnd ? 0.8 : 1.2,
                        ease: 'power3.out',
                        clearProps: 'all' // Clean up after animation
                    }
                );
            }
        }]);
    }
}

// ============================================================================
// 6. OPTIMIZED WORK SPINE
// ============================================================================
function initOptimizedWorkSpine(perfManager, scrollTrigger, lenis, voidStage) {
    const track = document.getElementById('spine-track');
    if (!track) return;

    const isMobile = perfManager.isMobile;
    const isLowEnd = perfManager.isLowEnd;

    // Cache DOM queries
    const workGradient = document.getElementById('work-gradient-container');
    const gatewayBg = document.querySelector('.gateway-bg-img');
    const gatewayUI = document.querySelector('.gateway-ui');
    const workContent = document.querySelector('.work-content');
    const archiveBtn = document.querySelector('.archive-back-btn');
    const workGlow = document.getElementById('work-glow');
    const workHeader = document.querySelector('.work-header');

    // Initial state
    gsap.set(workContent, { opacity: 0, scale: 1.05 });

    // Optimized scroll distance based on device
    const scrollDistance = isMobile ? 4000 : 8000;
    const scrubValue = isLowEnd ? 0.5 : 1;

    // Create optimized timeline
    const workTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "#work",
            start: "top top",
            end: `+=${scrollDistance}`,
            pin: true,
            scrub: scrubValue,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            id: "workSpine",
            // Throttled update function
            onUpdate: debounce(function(self) {
                const prog = self.progress;
                
                // Early exit for closed state
                if (prog < 0.10) {
                    if (voidStage._lastMoodKey !== 'cinema') {
                        voidStage.setMood('cinema');
                    }
                    return;
                }

                // Optimized card detection - only check visible cards
                const activeCards = Array.from(
                    document.querySelectorAll('.project-card:not([style*="display: none"]), .category-title-card')
                );
                
                if (activeCards.length === 0) return;
                
                // Use IntersectionObserver-like logic
                const cx = window.innerWidth / 2;
                let closest = null;
                let minDist = Infinity;
                
                // Batch DOM reads
                const cardData = activeCards.map(card => {
                    const rect = card.getBoundingClientRect();
                    const dist = Math.abs((cx * 0.8) - (rect.left + rect.width/2));
                    return { card, rect, dist };
                });

                // Find closest
                cardData.forEach(({ card, rect, dist }) => {
                    if (dist < minDist) {
                        minDist = dist;
                        closest = card;
                    }
                    
                    // Apply parallax only to project cards and only if not mobile
                    if (!isMobile && card.classList.contains('project-card')) {
                        const norm = Math.max(0, 1 - dist / (window.innerWidth * 0.5));
                        // Use transform instead of filter for better performance
                        requestAnimationFrame(() => {
                            card.style.transform = `scale(${0.85 + norm * 0.15})`;
                            card.style.filter = `brightness(${0.3 + norm * 0.7})`;
                        });
                    }
                });

                // Update mood
                if (prog < 0.9 && closest && closest.dataset.mood) {
                    voidStage.setMood(closest.dataset.mood);
                }

                // Update filter buttons
                updateFilterButtons(prog, activeCards);
            }, 16) // Throttle to ~60fps
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

    // Phase 2: Horizontal scroll (1 -> 5)
    workTimeline.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth / 2),
        ease: "none",
        duration: 4
    }, 1);

    // Phase 3: Fade out (4.2 -> 5)
    workTimeline
        .to(workGradient, { opacity: 0, ease: 'power2.inOut', duration: 0.8 }, 4.2)
        .to([workHeader, archiveBtn, workGlow], { opacity: 0, ease: 'power2.inOut', duration: 0.8 }, 4.2)
        .to(gatewayBg, { scale: 1, ease: 'power2.inOut', duration: 1 }, 4)
        .to(workContent, { opacity: 0, scale: 0.9, ease: 'power2.in', duration: 0.6 }, 4)
        .set(workContent, { pointerEvents: 'none' }, 4)
        .to(gatewayUI, { opacity: 1, scale: 1, ease: 'power2.out', duration: 0.8 }, 4.2);

    // Optimized card interactions
    initOptimizedCardInteractions(perfManager);

    return workTimeline;
}

// ============================================================================
// 7. OPTIMIZED CARD INTERACTIONS
// ============================================================================
function initOptimizedCardInteractions(perfManager) {
    const isMobile = perfManager.isMobile;
    
    document.querySelectorAll('.project-card').forEach(card => {
        const video = card.querySelector('video');
        const cardMedia = card.querySelector('.card-media');
        const cardCursor = card.querySelector('.card-cursor-inner');
        
        // Skip 3D tilt on mobile
        if (!isMobile) {
            card.addEventListener('mousemove', throttle((e) => {
                const r = card.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - 0.5;
                const y = (e.clientY - r.top) / r.height - 0.5;
                
                gsap.to(cardMedia, {
                    rotateY: x * 15,
                    rotateX: -y * 15,
                    duration: 0.4,
                    overwrite: 'auto'
                });
                
                if (cardCursor) {
                    const mx = e.clientX - r.left;
                    const my = e.clientY - r.top;
                    gsap.to(cardCursor, {
                        x: mx,
                        y: my,
                        xPercent: -50,
                        yPercent: -50,
                        scale: 1,
                        duration: 0.2,
                        ease: 'power2.out',
                        overwrite: 'auto'
                    });
                }
            }, 16));
        }
        
        card.addEventListener('mouseenter', () => {
            if (!isMobile) {
                gsap.to(cardMedia, { y: -5, duration: 0.4, ease: 'power2.out' });
            }
            
            if (video) {
                video.style.opacity = 1;
                // Use play promise to handle autoplay restrictions
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(() => {
                        // Autoplay was prevented
                        video.style.opacity = 0;
                    });
                }
            }
        });
        
        card.addEventListener('mouseleave', () => {
            if (!isMobile) {
                gsap.to(cardMedia, {
                    rotateY: 0,
                    rotateX: 0,
                    y: 0,
                    duration: 0.8,
                    ease: 'expo.out'
                });
            }
            
            if (cardCursor) {
                gsap.to(cardCursor, {
                    scale: 0.8,
                    duration: 0.4,
                    ease: 'expo.out',
                    overwrite: 'auto'
                });
            }
            
            if (video) {
                video.style.opacity = 0;
                video.pause();
            }
        });
    });
}

// ============================================================================
// 8. UTILITY FUNCTIONS
// ============================================================================

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Update filter buttons (extracted for reuse)
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
    
    // Batch DOM writes
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
// 9. EXPORT OPTIMIZED INITIALIZATION
// ============================================================================
export function initOptimizedPerformance() {
    // Initialize performance manager
    const perfManager = new PerformanceManager();
    
    // Initialize asset cache
    const assetCache = new AssetCache();
    
    // Initialize optimized scroll trigger
    const scrollTrigger = new OptimizedScrollTrigger();
    
    // Create optimized Lenis
    const lenis = createOptimizedLenis(perfManager);
    
    // Log performance mode
    console.log('Performance Mode:', {
        isLowEnd: perfManager.isLowEnd,
        isMobile: perfManager.isMobile,
        particleCount: perfManager.getParticleCount(),
        useBloom: perfManager.shouldUseBloom(),
        grainFPS: perfManager.getGrainFPS()
    });
    
    return {
        perfManager,
        assetCache,
        scrollTrigger,
        lenis
    };
}

// ============================================================================
// 10. PRELOAD CRITICAL ASSETS
// ============================================================================
export async function preloadCriticalAssets(assetCache, onProgress) {
    // Define critical assets
    const criticalAssets = [
        // Hero images
        { type: 'image', src: '/public/images/logo.png', priority: 'high' },
        // Add more critical assets here
    ];

    await assetCache.batchPreload(criticalAssets, onProgress);
}
