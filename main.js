import * as THREE from 'three';
        import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
        import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
        import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
        import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

        // -------------------------------------------------------------
        // CONFIG & STATE
        // -------------------------------------------------------------
        const SCENE_MODES = {
            cinema:        { accent: '#E8A832', bg: '#07080B', cursorColor: 0xFFD088, glowColor: 'rgba(200,135,30,0.4)', grain: 0.05, gradientBottom: 'rgba(3,3,4,0.8)',   textColor: '#F4F0E8' },
            goldenWarmth:  { accent: '#FFBE2B', bg: '#090704', cursorColor: 0xFFD66A, glowColor: 'rgba(255,190,43,0.45)', grain: 0.04, gradientBottom: 'rgba(3,3,4,0.8)',   textColor: '#F4F0E8' },
            darkEditorial: { accent: '#CC2200', bg: '#080404', cursorColor: 0xFF2200, glowColor: 'rgba(180,20,0,0.6)',  grain: 0.09, gradientBottom: 'rgba(3,3,4,0.8)',   textColor: '#F4F0E8' },
            pureWhite:     { accent: '#FFFFFF', bg: '#06040C', cursorColor: 0xFFFFFF, glowColor: 'rgba(255,255,255,0.55)', grain: 0.02, gradientBottom: 'rgba(3,3,4,0.8)', textColor: '#8b0000' },
        };

        const SHOWREEL = [
            { title: 'LUCE & OMBRA — EST. 2025', mood: 'darkEditorial' },
            { title: 'KALAKARS — BOLLYVERSE',   mood: 'goldenWarmth'  },
            { title: 'PURE VISION — 2025',       mood: 'pureWhite'    },
        ];

        let lenis;
        let voidStage;
        let showreelInst;

        // -------------------------------------------------------------
        // UTILITIES
        // -------------------------------------------------------------
        // Split text for 3D animation
        function splitText(selector) {
            const el = document.querySelector(selector);
            if(!el) return [];
            const text = el.innerText;
            el.innerHTML = '';
            const chars = [];
            text.split('').forEach(char => {
                const span = document.createElement('span');
                span.innerText = char === ' ' ? '\u00A0' : char;
                span.className = 'char';
                el.appendChild(span);
                chars.push(span);
            });
            return chars;
        }

        // Text Scramble Effect
        class TextScramble {
            constructor(el) {
                this.el = el;
                this.chars = '!<>-_\\/[]{}—=+*^?#_';
                this.update = this.update.bind(this);
            }
            setText(newText) {
                const oldText = this.el.innerText;
                const length = Math.max(oldText.length, newText.length);
                const promise = new Promise((resolve) => this.resolve = resolve);
                this.queue = [];
                for (let i = 0; i < length; i++) {
                    const from = oldText[i] || '';
                    const to = newText[i] || '';
                    const start = Math.floor(Math.random() * 40);
                    const end = start + Math.floor(Math.random() * 40);
                    this.queue.push({ from, to, start, end });
                }
                cancelAnimationFrame(this.frameRequest);
                this.frame = 0;
                this.update();
                return promise;
            }
            update() {
                let output = '';
                let complete = 0;
                for (let i = 0, n = this.queue.length; i < n; i++) {
                    let { from, to, start, end, char } = this.queue[i];
                    if (this.frame >= end) {
                        complete++;
                        output += to;
                    } else if (this.frame >= start) {
                        if (!char || Math.random() < 0.28) {
                            char = this.randomChar();
                            this.queue[i].char = char;
                        }
                        output += `<span style="color:var(--smoke)">${char}</span>`;
                    } else {
                        output += from;
                    }
                }
                this.el.innerHTML = output;
                if (complete === this.queue.length) {
                    this.resolve();
                } else {
                    this.frameRequest = requestAnimationFrame(this.update);
                    this.frame++;
                }
            }
            randomChar() {
                return this.chars[Math.floor(Math.random() * this.chars.length)];
            }
        }

        // -------------------------------------------------------------
        // FILM GRAIN ENGINE
        // -------------------------------------------------------------
        class FilmGrainEngine {
            constructor() {
                this.canvas = document.createElement('canvas');
                this.ctx = this.canvas.getContext('2d', { alpha: true });
                this.fps = 18;
                this.intensity = 0.05;
                
                Object.assign(this.canvas.style, {
                    position: 'fixed', inset: '0', width: '100vw', height: '100vh',
                    pointerEvents: 'none', zIndex: '9997', mixBlendMode: 'overlay',
                    opacity: this.intensity
                });
                document.body.appendChild(this.canvas);
                this.resize();
                window.addEventListener('resize', () => this.resize());
                this.last = 0;
                this.loop(0);
            }
            resize() {
                const dpr = Math.min(window.devicePixelRatio, 1.2);
                this.canvas.width = Math.floor(window.innerWidth * dpr * 0.5);
                this.canvas.height = Math.floor(window.innerHeight * dpr * 0.5);
            }
            frame() {
                const w = this.canvas.width; const h = this.canvas.height;
                const d = this.ctx.createImageData(w, h);
                const px = d.data;
                for(let i = 0; i < w * h * 4; i += 4) {
                    const v = Math.random() * 255;
                    px[i] = v; px[i+1] = v * 0.9; px[i+2] = v * 0.8; // Warm bias
                    px[i+3] = 25;
                }
                this.ctx.putImageData(d, 0, 0);
            }
            loop(t) {
                if(t - this.last > 1000 / this.fps) {
                    this.frame();
                    this.last = t;
                }
                requestAnimationFrame(ts => this.loop(ts));
            }
            setIntensity(val) {
                gsap.to(this.canvas, { opacity: val, duration: 0.6 });
            }
        }
        const grain = new FilmGrainEngine();

        // -------------------------------------------------------------
        // MAGNETIC CURSOR
        // -------------------------------------------------------------
        class CinematicCursor {
            constructor() {
                this.mouse = { x: -100, y: -100 };
                this.ring = { x: -100, y: -100 };
                this.trails = Array.from({length: 4}, (_, i) => ({
                    el: document.getElementById(`c-trail-${i}`),
                    x: -100, y: -100,
                    lag: Math.pow(0.8, i) * 0.15
                }));
                this.ringEl = document.getElementById('c-ring');
                this.labelEl = document.getElementById('c-label');
                
                document.addEventListener('mousemove', e => {
                    this.mouse.x = e.clientX;
                    this.mouse.y = e.clientY;
                });

                document.addEventListener('mousedown', () => gsap.to(this.ringEl, { scale: 0.7, duration: 0.1, ease: 'power2.in' }));
                document.addEventListener('mouseup', () => gsap.to(this.ringEl, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' }));

                this.bindInteractions();
                this.render();
            }
            bindInteractions() {
                document.querySelectorAll('[data-cursor]').forEach(el => {
                    el.addEventListener('mouseenter', () => {
                        const txt = el.getAttribute('data-cursor');
                        this.labelEl.innerText = txt;
                        gsap.to(this.ringEl, { width: 64, height: 64, backgroundColor: 'rgba(var(--scene-accent-rgb), 0.1)', borderColor: 'var(--scene-accent)', duration: 0.3 });
                        gsap.to(this.labelEl, { opacity: 1, duration: 0.2 });
                    });
                    el.addEventListener('mouseleave', () => {
                        gsap.to(this.ringEl, { width: 32, height: 32, backgroundColor: 'transparent', borderColor: 'rgba(232,168,50,0.55)', duration: 0.3 });
                        gsap.to(this.labelEl, { opacity: 0, duration: 0.2 });
                    });
                });

                // Update theme matching for cards
                document.querySelectorAll('.project-card, .category-title-card, .client-item').forEach(card => {
                    card.addEventListener('mouseenter', () => {
                        const mood = card.dataset.mood || 'goldenWarmth';
                        if(mood && SCENE_MODES[mood]) {
                            const color = SCENE_MODES[mood].accent;
                            gsap.to(this.ringEl, { borderColor: color, duration: 0.4 });
                            gsap.to(this.trails, { backgroundColor: color, duration: 0.4, stagger: 0.05 });
                        }
                    });
                    card.addEventListener('mouseleave', () => {
                        gsap.to(this.ringEl, { borderColor: 'rgba(232,168,50,0.55)', duration: 0.6 });
                        gsap.to(this.trails, { backgroundColor: 'var(--scene-accent)', duration: 0.6 });
                    });
                });
            }
            render() {
                const lerp = (a, b, t) => a + (b - a) * t;
                this.ring.x = lerp(this.ring.x, this.mouse.x, 0.15);
                this.ring.y = lerp(this.ring.y, this.mouse.y, 0.15);
                this.ringEl.style.transform = `translate(${this.ring.x}px, ${this.ring.y}px)`;

                let px = this.mouse.x, py = this.mouse.y;
                this.trails.forEach((t, i) => {
                    t.x = lerp(t.x, px, t.lag);
                    t.y = lerp(t.y, py, t.lag);
                    t.el.style.transform = `translate(${t.x}px, ${t.y}px)`;
                    px = t.x; py = t.y;
                });
                requestAnimationFrame(() => this.render());
            }
        }

        // -------------------------------------------------------------
        // TIMECODE & SCROLL PROGRESS
        // -------------------------------------------------------------
        const tcEl = document.getElementById('timecode');
        const start = Date.now();
        function updateTC() {
            const ms = Date.now() - start;
            const f = Math.floor(ms / (1000/24)) % 24;
            const s = Math.floor(ms / 1000) % 60;
            const m = Math.floor(ms / 60000) % 60;
            const h = Math.floor(ms / 3600000);
            const p = n => String(n).padStart(2,'0');
            tcEl.textContent = `TC ${p(h)}:${p(m)}:${p(s)}:${p(f)}`;
            requestAnimationFrame(updateTC);
        }
        updateTC();

        // -------------------------------------------------------------
        // THREE.JS VOID STAGE
        // -------------------------------------------------------------
        class VoidStage {
            constructor() {
                this.scene = new THREE.Scene();
                this.camera = new THREE.PerspectiveCamera(65, window.innerWidth/window.innerHeight, 0.1, 100);
                this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('webgl-canvas'), alpha: true, antialias: false });
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                
                this.camera.position.set(0, 1.6, 5);
                this.mouse = new THREE.Vector2();
                this.cursorPos = new THREE.Vector3(0,0,0);
                this.clock = new THREE.Clock();
                
                // Tracker for cursor particles
                this.lastLightPos = new THREE.Vector3();

                this.build();
                this.buildCursorParticles();
                this.buildPost();
                
                window.addEventListener('resize', () => this.resize());
                document.addEventListener('mousemove', e => {
                    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
                });

                this.animate();
            }
            build() {
                // Dust Particles
                const count = 15000;
                const geo = new THREE.BufferGeometry();
                const pos = new Float32Array(count * 3);
                for(let i=0; i<count*3; i++) {
                    pos[i] = (Math.random() - 0.5) * 30;
                }
                geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
                const mat = new THREE.PointsMaterial({
                    size: 0.05,
                    color: 0xaaaaaa,
                    transparent: true,
                    opacity: 0.4,
                    blending: THREE.AdditiveBlending
                });
                this.dust = new THREE.Points(geo, mat);
                this.scene.add(this.dust);

                // Volumetric Cursor Light
                this.light = new THREE.PointLight(SCENE_MODES.cinema.cursorColor, 5, 20);
                this.scene.add(this.light);
                
                // Dim Ambient
                this.scene.add(new THREE.AmbientLight(0x111116, 0.5));
            }
            buildCursorParticles() {
                this.maxParticles = 1500;
                this.particleGeo = new THREE.BufferGeometry();
                this.particlePositions = new Float32Array(this.maxParticles * 3);
                this.particleLife = new Float32Array(this.maxParticles);
                this.particleVelocities = [];

                for (let i = 0; i < this.maxParticles; i++) {
                    this.particleVelocities.push(new THREE.Vector3());
                    this.particlePositions[i * 3] = 9999; // hide initially by pushing far away
                    this.particleLife[i] = 0;
                }

                this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
                this.particleGeo.setAttribute('life', new THREE.BufferAttribute(this.particleLife, 1));

                this.particleMat = new THREE.ShaderMaterial({
                    uniforms: {
                        uColor: { value: new THREE.Color(SCENE_MODES.cinema.cursorColor) }
                    },
                    vertexShader: `
                        attribute float life;
                        varying float vLife;
                        void main() {
                            vLife = life;
                            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                            gl_PointSize = (life * 15.0) * (10.0 / -mvPosition.z);
                            gl_Position = projectionMatrix * mvPosition;
                        }
                    `,
                    fragmentShader: `
                        uniform vec3 uColor;
                        varying float vLife;
                        void main() {
                            if(vLife <= 0.0) discard;
                            vec2 coord = gl_PointCoord - vec2(0.5);
                            float dist = length(coord);
                            if(dist > 0.5) discard;
                            
                            // Soft glow circle
                            float alpha = (0.5 - dist) * 2.0 * vLife;
                            gl_FragColor = vec4(uColor, alpha);
                        }
                    `,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });

                this.particles = new THREE.Points(this.particleGeo, this.particleMat);
                this.scene.add(this.particles);
                this.particleIdx = 0;
            }
            buildPost() {
                this.composer = new EffectComposer(this.renderer);
                this.composer.addPass(new RenderPass(this.scene, this.camera));
                this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.5, 0.6);
                this.composer.addPass(this.bloom);

                // ---- Wave Distortion Shader Pass ----
                const WaveDistortionShader = {
                    uniforms: {
                        tDiffuse:  { value: null },
                        uTime:     { value: 0.0 },
                        uStrength: { value: 0.0 },   // animated 0→peak→0
                        uFreq:     { value: 14.0 },  // ripple frequency
                        uSpeed:    { value: 8.0 },   // wave travel speed
                        uColor:    { value: new THREE.Color(0xE8A832) }, // tint flash
                        uTint:     { value: 0.0 },   // tint amount
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform sampler2D tDiffuse;
                        uniform float uTime;
                        uniform float uStrength;
                        uniform float uFreq;
                        uniform float uSpeed;
                        uniform vec3  uColor;
                        uniform float uTint;
                        varying vec2 vUv;

                        void main() {
                            // Radial ripple from centre
                            vec2 center = vUv - 0.5;
                            float dist  = length(center);
                            float wave  = sin(dist * uFreq - uTime * uSpeed) * uStrength;

                            vec2 offset = normalize(center + 0.001) * wave;

                            // === RED · GOLD · WHITE Chromatic Split ===
                            // Three samples at different UV displacements
                            vec4 sRed   = texture2D(tDiffuse, vUv + offset * 1.65); // outermost → Red fringe
                            vec4 sGold  = texture2D(tDiffuse, vUv + offset * 0.90); // middle    → Gold fringe
                            vec4 sWhite = texture2D(tDiffuse, vUv - offset * 0.15); // innermost → White / neutral

                            // Convert displaced samples to luminance so tint colours read pure
                            float lumR = dot(sRed.rgb,  vec3(0.299, 0.587, 0.114));
                            float lumG = dot(sGold.rgb, vec3(0.299, 0.587, 0.114));

                            // Apply target palette to each layer
                            vec3 redLayer   = lumR * vec3(1.00, 0.102, 0.188); // #FF1A30 — cinematic red
                            vec3 goldLayer  = lumG * vec3(0.910, 0.659, 0.196); // #E8A832 — warm gold
                            vec3 whiteLayer = sWhite.rgb;                        // natural / white

                            // Blend factor: 0 when no warp, 1 at peak warp
                            float amt = clamp(uStrength * 18.0, 0.0, 1.0);

                            // Average the three coloured layers for the aberrated composite
                            vec3 aberrated = (redLayer + goldLayer + whiteLayer) / 3.0;
                            vec3 rgb = mix(whiteLayer, aberrated, amt);

                            vec4 col = vec4(rgb, 1.0);

                            // Colour tint flash (animates red → gold → white via JS uniform)
                            col.rgb = mix(col.rgb, uColor, uTint * (1.0 - dist * 1.4));

                            gl_FragColor = col;
                        }
                    `
                };
                this.distortPass = new ShaderPass(WaveDistortionShader);
                this.composer.addPass(this.distortPass);


                this._distortTime = 0;
                this._lastMoodKey = null;
            }
            
            triggerBurst() {
                const u = this.distortPass.uniforms;
                gsap.killTweensOf(u.uStrength);
                gsap.killTweensOf(u.uTint);
                gsap.killTweensOf(u.uColor.value);
                u.uColor.value.setHex(0xFF1A30);
                gsap.timeline()
                    .to(u.uStrength, { value: 0.1, duration: 0.2, ease: 'power2.in' })
                    .to(u.uStrength, { value: 0.0,   duration: 0.8, ease: 'expo.out' })
                    .to(u.uTint,     { value: 0.25,  duration: 0.15, ease: 'power1.in'  }, 0)
                    .to(u.uTint,     { value: 0.0,   duration: 0.7, ease: 'power2.out' }, 0.15)
                    .to(u.uColor.value, { r: 1.0, g: 0.8, b: 0.4, duration: 0.1, ease: 'none' }, 0.05)
                    .to(u.uColor.value, { r: 1.0,   g: 1.0,   b: 1.0,   duration: 0.05, ease: 'none' }, 0.15);
            }

            setMood(modeKey) {
                if(modeKey === this._lastMoodKey) return;
                this._lastMoodKey = modeKey;
                const mode = SCENE_MODES[modeKey];
                document.documentElement.style.setProperty('--scene-accent', mode.accent);
                
                // Set RGB variable for transparent backgrounds
                const hex = mode.accent.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                document.documentElement.style.setProperty('--scene-accent-rgb', `${r},${g},${b}`);

                gsap.to(this.light.color, { r: new THREE.Color(mode.cursorColor).r, g: new THREE.Color(mode.cursorColor).g, b: new THREE.Color(mode.cursorColor).b, duration: 1 });
                
                // Sync the cursor particles color with the active mood
                if (this.particleMat) {
                    gsap.to(this.particleMat.uniforms.uColor.value, { 
                        r: new THREE.Color(mode.cursorColor).r, 
                        g: new THREE.Color(mode.cursorColor).g, 
                        b: new THREE.Color(mode.cursorColor).b, 
                        duration: 1 
                    });
                }
                
                grain.setIntensity(mode.grain);
                // Text colour: dark crimson for pureWhite, default cream for all others
                // Scoped to landing page specific variable
                gsap.to(document.documentElement, {
                    '--landing-light': mode.textColor,
                    duration: 0.8,
                    onUpdate: () => document.documentElement.style.setProperty('--landing-light', mode.textColor)
                });
                document.documentElement.style.setProperty('--landing-light', mode.textColor);

                // --- Work Glow Gradient Update ---
                const workGlow = document.getElementById('work-glow');
                if (workGlow) {
                    gsap.to(workGlow, {
                        background: `radial-gradient(circle at center, rgba(${r},${g},${b}, 0.25) 0%, transparent 65%)`,
                        duration: 1.2
                    });
                }

                // --- Fire distortion burst ---
                const u = this.distortPass.uniforms;
                // kill any running tween on colour/strength/tint
                gsap.killTweensOf(u.uStrength);
                gsap.killTweensOf(u.uTint);
                gsap.killTweensOf(u.uColor.value);
                // Colour flash sequence: Red → Gold → White over ~150ms
                // Start at cinematic red
                u.uColor.value.setHex(0xFF1A30);
                gsap.timeline()
                    // Warp strength: surge then decay
                    .to(u.uStrength, { value: 0.058, duration: 0.18, ease: 'power2.in' })
                    .to(u.uStrength, { value: 0.0,   duration: 0.65, ease: 'expo.out' })
                    // Tint intensity: hit then fade out over 150ms + 500ms tail
                    .to(u.uTint,     { value: 0.18,  duration: 0.15, ease: 'power1.in'  }, 0)
                    .to(u.uTint,     { value: 0.0,   duration: 0.50, ease: 'power2.out' }, 0.15)
                    // Colour: Red (0ms) → Gold (50ms) → White (100ms) → settles
                    .to(u.uColor.value, { r: 0.910, g: 0.659, b: 0.196, duration: 0.05, ease: 'none' }, 0.00)
                    .to(u.uColor.value, { r: 1.0,   g: 1.0,   b: 1.0,   duration: 0.05, ease: 'none' }, 0.05)
                    .to(u.uColor.value, { r: 0.91,  g: 0.659, b: 0.196, duration: 0.35, ease: 'power2.out' }, 0.10);
            }
            resize() {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.composer.setSize(window.innerWidth, window.innerHeight);
            }
            animate() {
                const t = this.clock.getElapsedTime();
                
                // Dust gentle rotation
                this.dust.rotation.y = t * 0.02;
                
                // Raycast mouse to world plane for light
                const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
                vector.unproject(this.camera);
                const dir = vector.sub(this.camera.position).normalize();
                const distance = -this.camera.position.z / dir.z;
                const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
                
                // Lerp light position
                this.light.position.lerp(pos, 0.1);

                // --- Cinematic Cursor Particles Logic ---
                const distMoved = this.light.position.distanceTo(this.lastLightPos);
                if (distMoved > 0.02) { // Minimum movement threshold to emit
                    // Emit particles based on speed
                    const emitCount = Math.min(Math.floor(distMoved * 150), 60); 
                    for (let i = 0; i < emitCount; i++) {
                        this.particleIdx = (this.particleIdx + 1) % this.maxParticles;
                        const idx = this.particleIdx;
                        
                        // Scatter positions slightly around the cursor light
                        this.particlePositions[idx * 3] = this.light.position.x + (Math.random() - 0.5) * 0.25;
                        this.particlePositions[idx * 3 + 1] = this.light.position.y + (Math.random() - 0.5) * 0.25;
                        this.particlePositions[idx * 3 + 2] = this.light.position.z + (Math.random() - 0.5) * 0.25;
                        
                        // Set explosive random drift velocities
                        this.particleVelocities[idx].set(
                            (Math.random() - 0.5) * 0.4, 
                            (Math.random() - 0.5) * 0.4 + 0.1, // Slight bias to drift upwards
                            (Math.random() - 0.5) * 0.4
                        );
                        
                        // Reset Life
                        this.particleLife[idx] = 1.0 + (Math.random() * 0.5); 
                    }
                    this.lastLightPos.copy(this.light.position);
                }

                // Update living particles
                for (let i = 0; i < this.maxParticles; i++) {
                    if (this.particleLife[i] > 0) {
                        this.particleLife[i] -= 0.025; // Decay rate
                        
                        // Move
                        this.particlePositions[i * 3] += this.particleVelocities[i].x * 0.02;
                        this.particlePositions[i * 3 + 1] += this.particleVelocities[i].y * 0.02;
                        this.particlePositions[i * 3 + 2] += this.particleVelocities[i].z * 0.02;
                        
                        // Apply simulated air friction
                        this.particleVelocities[i].multiplyScalar(0.92);
                    } else {
                        // Move dead particles far out of frame
                        this.particlePositions[i * 3] = 9999; 
                    }
                }
                
                // Alert WebGL that attributes changed
                this.particleGeo.attributes.position.needsUpdate = true;
                this.particleGeo.attributes.life.needsUpdate = true;
                // --- End Particle Logic ---

                // Camera breathing
                this.camera.position.y = 1.6 + Math.sin(t * 0.5) * 0.1;
                this.camera.position.x += (this.mouse.x * 0.5 - this.camera.position.x) * 0.05;

                // Advance distortion shader time uniform
                this.distortPass.uniforms.uTime.value = t;

                this.composer.render();
                requestAnimationFrame(() => this.animate());
            }
        }

        // -------------------------------------------------------------
        // PRELOADER SEQUENCE
        // -------------------------------------------------------------
        function runPreloader() {
            return new Promise(resolve => {
                const tl = gsap.timeline({ onComplete: resolve });
                
                tl.to('.clapperboard', { opacity: 1, y: 0, filter: 'blur(0px) brightness(1)', duration: 1.5, ease: 'power2.out' })
                  .to('.load-bar', { width: '100%', duration: 2.5, ease: 'none' }, "-=1")
                  .to('.clapper-arm', { rotation: 0, duration: 0.15, ease: "expo.in" })
                  .to('.preloader-flash', { opacity: 1, duration: 0.05 })
                  .to('#preloader', { opacity: 0, duration: 1, pointerEvents: 'none' })
                  .set('#preloader', { display: 'none' });
            });
        }

        // -------------------------------------------------------------
        // HOME SHOWREEL ENGINE
        // -------------------------------------------------------------
        class Showreel {
            constructor() {
                this.clips = document.querySelectorAll('.reel-clip');
                this.idx = 0;
                this.titleFx = new TextScramble(document.getElementById('np-title'));
                this.interval = setInterval(() => this.next(), 6000);
            }
            next() {
                const prev = this.idx;
                this.idx = (this.idx + 1) % SHOWREEL.length;
                const data = SHOWREEL[this.idx];

                // Crossfade
                gsap.to(this.clips[this.idx], { opacity: 1, scale: 1.0, duration: 2 });
                gsap.to(this.clips[prev], { opacity: 0, scale: 1.05, duration: 2 });

                // ONLY update mood if hero is visible to prevent flashes while scrolling
                if (window.scrollY < window.innerHeight * 0.5) {
                    voidStage.setMood(data.mood);
                    const mode = SCENE_MODES[data.mood];
                    const gradBottom = mode.gradientBottom || 'rgba(3,3,4,0.8)';
                    gsap.to('#hero-grade', { background: `linear-gradient(to bottom, ${mode.glowColor} 0%, ${gradBottom} 100%)`, duration: 1.5 });
                }

                // Update text
                this.titleFx.setText(data.title);
                
                // Chromatic Aberration hit
                gsap.fromTo(document.documentElement, { '--ca': '4px' }, { '--ca': '0px', duration: 0.4, ease: 'power2.out' });
            }
            stop() { clearInterval(this.interval); }
        }

        
        function initHeroTilt() {
            const heroPanel = document.querySelector('.hero-glass-panel');
            if (!heroPanel) return;
            // Ensure we don't bind multiple times
            if(heroPanel.dataset.tiltBound) return;
            heroPanel.dataset.tiltBound = "true";

            document.addEventListener('mousemove', (e) => {
                if(window.scrollY > window.innerHeight) return;
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                const tx = (e.clientX - cx) / cx;
                const ty = (e.clientY - cy) / cy;
                gsap.to(heroPanel, { rotateX: ty * -8, rotateY: tx * 8, duration: 2, ease: 'power2.out', transformPerspective: 1000 });
            });
        }
        
        function initHomeScroll() {
            // Fade out hero reel/grade for a smooth transition into the dark Philosophy section
            gsap.to('.hero-container', {
                opacity: 0,
                ease: 'none',
                scrollTrigger: {
                    trigger: '#philosophy',
                    start: 'top bottom', // when philosophy top hits viewport bottom
                    end: 'top 10%',      // when philosophy top reaches 10% from top
                    scrub: true
                }
            });

            // Home Philosophy Marquee Scrolling Parallax
            gsap.to('.bg-text-1', {
                xPercent: -15,
                ease: 'none',
                scrollTrigger: { trigger: '.philosophy-section', start: 'top bottom', end: 'bottom top', scrub: true }
            });
            gsap.to('.bg-text-2', {
                xPercent: 15,
                ease: 'none',
                scrollTrigger: { trigger: '.philosophy-section', start: 'top bottom', end: 'bottom top', scrub: true }
            });
            gsap.to('.bg-text-3', {
                xPercent: -15,
                ease: 'none',
                scrollTrigger: { trigger: '.philosophy-section', start: 'top bottom', end: 'bottom top', scrub: true }
            });

            // Home Philosophy Text Reveal Fade
            gsap.from('.philosophy-content > *', {
                y: 40,
                opacity: 0,
                stagger: 0.15,
                duration: 1.2,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: '.philosophy-section',
                    start: 'top 75%',
                    toggleActions: 'play none none reverse'
                }
            });
        }

        // -------------------------------------------------------------
        // ABOUT SECTION ANIMATIONS & TILT
        // -------------------------------------------------------------
        function initAboutAnimations() {
            // Background horizontal text scroll
            gsap.to('.about-bg-text', {
                xPercent: -30,
                ease: 'none',
                scrollTrigger: {
                    trigger: '#about',
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            });

            // Parallax on main image content
            gsap.to('.about-main-img', {
                yPercent: 15,
                ease: 'none',
                scrollTrigger: {
                    trigger: '.about-img-wrap',
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            });

            // Heavy parallax on floating secondary image to separate depth
            gsap.to('.about-float-img-wrap', {
                yPercent: -40,
                ease: 'none',
                scrollTrigger: {
                    trigger: '#about',
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            });

            // Reveal Animation Timeline
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: "#about",
                    start: "top 60%",
                    toggleActions: "play none none reverse"
                }
            });

            // Text staggered fly-up
            tl.fromTo('.about-title-line', 
                { y: '110%', rotateZ: 5 }, 
                { y: '0%', rotateZ: 0, duration: 1.2, stagger: 0.1, ease: 'power4.out' }
            );

            tl.fromTo('.about-reveal, .about-desc', 
                { opacity: 0, y: 30 }, 
                { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: 'power3.out' }, 
                "-=0.8"
            );

            // Images pop in
            tl.fromTo('.about-img-wrap',
                { opacity: 0, y: 100, rotateX: 10 },
                { opacity: 1, y: 0, rotateX: 0, duration: 1.5, ease: 'power3.out' },
                "-=1.2"
            );
            tl.fromTo('.about-float-img-wrap',
                { opacity: 0, x: -50, y: 50 },
                { opacity: 1, x: 0, y: 0, duration: 1.5, ease: 'power3.out' },
                "-=1"
            );
            tl.fromTo('.about-badge',
                { opacity: 0, scale: 0.5 },
                { opacity: 1, scale: 1, duration: 1, ease: 'back.out(1.5)' },
                "-=1"
            );

            // Clients Grid Animation
            gsap.from('.client-item', {
                opacity: 0,
                y: 30,
                stagger: 0.1,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: '.client-reveal',
                    start: 'top 80%',
                    toggleActions: 'play none none reverse'
                }
            });
        }

        function initAboutTilt() {
            const aboutPanel = document.querySelector('.about-img-wrap');
            const floatPanel = document.querySelector('.about-float-img-wrap');
            const badge = document.querySelector('.about-badge');
            
            if (!aboutPanel) return;

            document.addEventListener('mousemove', (e) => {
                const rect = aboutPanel.getBoundingClientRect();
                // Optimization: only calculate if roughly in viewport
                if(rect.top > window.innerHeight || rect.bottom < 0) return;

                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                const tx = (e.clientX - cx) / cx;
                const ty = (e.clientY - cy) / cy;
                
                // Rotate the main box
                gsap.to(aboutPanel, { rotateX: ty * -8, rotateY: tx * 8, duration: 2, ease: 'power2.out', transformPerspective: 1000 });
                // Float the secondary items
                gsap.to(floatPanel, { x: tx * -25, y: ty * -25, duration: 2, ease: 'power2.out' });
                gsap.to(badge, { x: tx * -40, y: ty * -40, duration: 2, ease: 'power2.out' });
            });
        }

        function initMagneticInteractions() {
            if(window._magneticBound) return;
            window._magneticBound = true;
            
            // Magnetic Buttons
            const magnetics = document.querySelectorAll('.nav-link, .cta-button, .filter-btn, .project-card');
            magnetics.forEach(btn => {
                const isCard = btn.classList.contains('project-card');
                const pullPower = isCard ? 0.05 : 0.2;
                
                btn.addEventListener('mousemove', (e) => {
                    const rect = btn.getBoundingClientRect();
                    const rx = e.clientX - rect.left - rect.width / 2;
                    const ry = e.clientY - rect.top - rect.height / 2;
                    
                    if(isCard) {
                        // Card pull effect is subtle, mostly pulls the cursor ring
                        const ringEl = document.getElementById('c-ring');
                        const ox = rx * 0.4;
                        const oy = ry * 0.4;
                        // We don't move the card itself much, but we could
                        gsap.to(btn, { x: rx * 0.02, y: ry * 0.02, duration: 0.4 });
                    } else {
                        gsap.to(btn, { x: rx * pullPower, y: ry * pullPower, scale: 1.05, duration: 0.4, ease: 'power2.out', color: 'var(--scene-accent)', textShadow: '0 0 10px var(--gold-bloom)' });
                    }
                });
                btn.addEventListener('mouseleave', () => {
                    gsap.to(btn, { x: 0, y: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.3)', color: '', textShadow: 'none' });
                });
                btn.addEventListener('mousedown', () => {
                    gsap.to(btn, { scale: 0.95, duration: 0.1, ease: 'power2.in' });
                });
                btn.addEventListener('mouseup', () => {
                    gsap.to(btn, { scale: 1.05, duration: 0.3, ease: 'back.out(2)' });
                });
            });

            // Scroll for Contact Head
            gsap.utils.toArray('.contact-head').forEach(el => {
                gsap.from(el, { y: 60, opacity: 0, scale: 0.9, duration: 1.5, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 80%", toggleActions: "play none none reverse" }});
            });
        }

        // -------------------------------------------------------------
        // CLIENT SPOTLIGHT INTERACTION
        // -------------------------------------------------------------
        function initClientSpotlight() {
            const spotlightWrapper = document.getElementById('clients-spotlight');
            const ringEl = document.getElementById('c-ring');
            const trails = document.querySelectorAll('.cursor-trail');
            const lensEl = document.getElementById('clients-lens');
            
            if(!spotlightWrapper) return;

            spotlightWrapper.addEventListener('mousemove', (e) => {
                const rect = spotlightWrapper.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // Update CSS variables for the CSS Mask and Lens position
                spotlightWrapper.style.setProperty('--mx', `${x}px`);
                spotlightWrapper.style.setProperty('--my', `${y}px`);
            });

            spotlightWrapper.addEventListener('mouseenter', () => {
                // Hide global cursor, fade in premium lens
                gsap.to(ringEl, { opacity: 0, duration: 0.2 });
                gsap.to(trails, { opacity: 0, duration: 0.2 });
                gsap.to(lensEl, { opacity: 1, duration: 0.4, ease: 'power2.out' });
            });

            spotlightWrapper.addEventListener('mouseleave', () => {
                // Restore global cursor, hide premium lens
                gsap.to(ringEl, { opacity: 1, duration: 0.4 });
                gsap.to(trails, { opacity: 1, duration: 0.2 });
                gsap.to(lensEl, { opacity: 0, duration: 0.4, ease: 'power2.in' });
            });
        }

        // -------------------------------------------------------------
        // SERVICES 3D DECK
        // -------------------------------------------------------------
        let serviceDeck = [];
        let isShuffling = false;

        function initServicesDeck() {
            serviceDeck = Array.from(document.querySelectorAll('.service-card-3d'));
            if(!serviceDeck.length) return;
            
            // Hide everything initially until scrolled into view
            gsap.set(serviceDeck, { opacity: 0, y: 150 });
            gsap.set('.quick-index-header', { scaleX: 0, opacity: 0 });
            gsap.set('.quick-index-item, #services-section .lg\\:w-5\\/12 > *:not(.quick-index-header)', { opacity: 0, x: -30 });

            // Scroll trigger for the Services section
            ScrollTrigger.create({
                trigger: "#services-section",
                start: "top 75%",
                onEnter: () => {
                    renderDeck(1.2); // Animate deck in
                    
                    // Animate typography and index pills in
                    gsap.fromTo('.quick-index-header', { scaleX: 0, opacity: 0 }, { opacity: 1, scaleX: 1, transformOrigin: 'left', duration: 1, ease: "power3.out" });
                    gsap.fromTo('.quick-index-item, #services-section .lg\\:w-5\\/12 > *:not(.quick-index-header)', 
                        { opacity: 0, x: -30 }, 
                        { opacity: 1, x: 0, stagger: 0.05, duration: 1, ease: "power3.out", delay: 0.2 });
                },
                once: true
            });

            // Click interactions
            const deckContainer = document.querySelector('.service-deck');
            if(deckContainer) deckContainer.addEventListener('click', shuffleDeck);
            
            const shuffleBtn = document.getElementById('shuffle-btn');
            if(shuffleBtn) shuffleBtn.addEventListener('click', shuffleDeck);

            // Quick Index Pills interaction
            const quickIndexItems = document.querySelectorAll('.quick-index-item');
            quickIndexItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    const targetIdx = parseInt(item.getAttribute('data-target-index'));
                    bringToFront(targetIdx);
                });
            });
        }

        function updateActivePill() {
            if(!serviceDeck.length) return;
            const topCardOriginalIndex = parseInt(serviceDeck[0].dataset.originalIndex);
            
            document.querySelectorAll('.quick-index-item').forEach(item => {
                if (parseInt(item.getAttribute('data-target-index')) === topCardOriginalIndex) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }

        function renderDeck(duration = 0.8) {
            serviceDeck.forEach((card, i) => {
                const props = { x: 0, rotateZ: 0, duration: duration, ease: "expo.out", overwrite: true };
                if (i === 0) {
                    gsap.to(card, { ...props, y: 0, scale: 1, opacity: 1, zIndex: 10 });
                } else if (i === 1) {
                    gsap.to(card, { ...props, y: 40, scale: 0.95, opacity: 0.6, zIndex: 9 });
                } else if (i === 2) {
                    gsap.to(card, { ...props, y: 80, scale: 0.90, opacity: 0.2, zIndex: 8 });
                } else {
                    gsap.to(card, { x: 0, y: 120, scale: 0.85, opacity: 0, zIndex: 1, rotateZ: 0, duration: duration, overwrite: true }); // Hidden instantly behind
                }
            });
            updateActivePill();
        }

        function shuffleDeck() {
            if(isShuffling || !serviceDeck.length) return;
            isShuffling = true;
            
            const topCard = serviceDeck.shift();
            
            // Animate top card out (fly up and spin right)
            gsap.to(topCard, {
                y: '-120%', 
                x: '30%',
                rotateZ: 15, 
                opacity: 0, 
                scale: 0.9,
                duration: 0.6, 
                ease: "power3.in",
                overwrite: true,
                onComplete: () => {
                    // Reset its physical position behind the stack instantly
                    gsap.set(topCard, { y: 120, x: 0, rotateZ: 0, scale: 0.85, opacity: 0, zIndex: 0 });
                    serviceDeck.push(topCard);
                }
            });

            // Render the rest smoothly
            renderDeck(0.8);
            
            // Unlock interactions smoothly
            setTimeout(() => { isShuffling = false; }, 300);
        }

        function bringToFront(targetIndex) {
            if(isShuffling || !serviceDeck.length) return;
            
            let topCardOriginalIndex = parseInt(serviceDeck[0].dataset.originalIndex);
            if (topCardOriginalIndex === targetIndex) return; // already at top

            isShuffling = true;
            const topCard = serviceDeck.shift();
            
            // Quick flip animation for current top card to get out of the way
            gsap.to(topCard, {
                y: '-120%', x: '30%', rotateZ: 15, opacity: 0, scale: 0.9, duration: 0.4, ease: "power3.in",
                overwrite: true,
                onComplete: () => {
                    gsap.set(topCard, { y: 120, x: 0, rotateZ: 0, scale: 0.85, opacity: 0, zIndex: 0 });
                    serviceDeck.push(topCard);
                }
            });

            // Rapidly shift array until target is at index 0 immediately
            while(serviceDeck.length > 0 && parseInt(serviceDeck[0].dataset.originalIndex) !== targetIndex) {
                 let card = serviceDeck.shift();
                 gsap.set(card, { y: 120, x: 0, rotateZ: 0, scale: 0.85, opacity: 0, zIndex: 0 });
                 serviceDeck.push(card);
            }
            
            // Render new state
            renderDeck(0.6);
            setTimeout(() => { isShuffling = false; }, 300);
        }

        // -------------------------------------------------------------
        // WORK SPINE (Video Gateway -> Horizontal Scroll -> Emptying Phase)
        // -------------------------------------------------------------
        let spineScrollTrigger;
        
        function initWorkSpine() {
            const track = document.getElementById('spine-track');
            
            // Initial State setup for the Video Player effect
            gsap.set('.work-content', { opacity: 0, scale: 1.05 });

            // Master Timeline for Gateway Expansion + Horizontal Scroll + Exit Sequence
            spineScrollTrigger = gsap.timeline({
                scrollTrigger: {
                    trigger: "#work",
                    start: "top top",
                    end: "+=8000", // Increased scroll distance significantly to fit all chapters
                    pin: true,
                    scrub: 1,
                    invalidateOnRefresh: true,
                    id: "workSpine",
                    onUpdate: function(self) {
                        const prog = self.progress;
                        
                        // Snap the mood back if closed or scrolled completely off
                        if (prog < 0.10) {
                            if (voidStage._lastMoodKey !== 'cinema') voidStage.setMood('cinema');
                            return;
                        }

                        // Determine the active category based on scroll position
                        const activeCards = document.querySelectorAll('.project-card:not([style*="display: none"]), .category-title-card');
                        if (activeCards.length === 0) return;
                        
                        const cx = window.innerWidth / 2;
                        let closest = activeCards[0];
                        let minDist = Infinity;
                        
                        activeCards.forEach(card => {
                            const rect = card.getBoundingClientRect();
                            // Shift the center calculation slightly left so the category lights up as it approaches
                            const dist = Math.abs((cx * 0.8) - (rect.left + rect.width/2));
                            if(dist < minDist) { minDist = dist; closest = card; }
                            
                            // Parallax effect ONLY on project cards, not category titles
                            if (card.classList.contains('project-card')) {
                                const norm = Math.max(0, 1 - dist / (window.innerWidth * 0.5));
                                gsap.set(card, { 
                                    scale: 0.85 + norm * 0.15, 
                                    filter: `brightness(${0.3 + norm * 0.7})` 
                                });
                            }
                        });

                        // Update Mood
                        if(prog < 0.9 && closest && closest.dataset.mood) {
                            voidStage.setMood(closest.dataset.mood);
                        }

                        // Highlight correct Navigation Filter Button
                        let activeFilter = 'ALL';
                        if (prog > 0.1) {
                            // Find the last category title card that has passed the center
                            const catCards = document.querySelectorAll('.category-title-card');
                            catCards.forEach(cat => {
                                const rect = cat.getBoundingClientRect();
                                if (rect.left < window.innerWidth * 0.7) {
                                    activeFilter = cat.dataset.category;
                                }
                            });
                        }
                        
                        // Update Dropdown UI
                        const activeTextEl = document.querySelector('.active-chapter-text');
                        const displayFilter = activeFilter === 'ALL' ? 'ALL CHAPTERS' : activeFilter;
                        if (activeTextEl && activeTextEl.innerText !== displayFilter) {
                            activeTextEl.innerText = displayFilter;
                        }

                        const filterBtns = document.querySelectorAll('.filter-btn');
                        filterBtns.forEach(b => {
                            if (b.textContent.trim().toUpperCase() === activeFilter) {
                                b.classList.add('active', 'text-[var(--scene-accent)]');
                                b.classList.remove('text-white/60');
                            } else {
                                b.classList.remove('active', 'text-[var(--scene-accent)]');
                                b.classList.add('text-white/60');
                            }
                        });
                    }
                }
            });

            // PHASE 1 (Duration 0 -> 1): Fade in full background gradient smoothly for seamless entry
            spineScrollTrigger.to('#work-gradient-container', { opacity: 0.8, ease: 'power2.inOut', duration: 1 }, 0);
            spineScrollTrigger.to('.gateway-bg-img', { scale: 1.1, ease: 'power2.inOut', duration: 1 }, 0);
            spineScrollTrigger.to('.gateway-ui', { opacity: 0, scale: 1.1, ease: 'power2.in', duration: 0.6 }, 0);
            spineScrollTrigger.to('.work-content', { opacity: 1, scale: 1, ease: 'power2.out', duration: 0.8 }, 0.2);
            spineScrollTrigger.to('.archive-back-btn', { opacity: 1, pointerEvents: 'auto', duration: 0.5 }, 0.5);
            spineScrollTrigger.set('.work-content', { pointerEvents: 'auto' }, 0.8);

            // PHASE 2 (Duration 1 -> 5): Horizontal Scrolling
            // We use -(track.scrollWidth - window.innerWidth / 2) to ensure the very last spacer pushes the cards completely off screen
            spineScrollTrigger.to(track, { x: () => -(track.scrollWidth - window.innerWidth / 2), ease: "none", duration: 4 }, 1);

            // PHASE 3 (Duration 4.2 -> 5): Clear the Stage & fade out gradient
            spineScrollTrigger.to('#work-gradient-container', { opacity: 0, ease: 'power2.inOut', duration: 0.8 }, 4.2);
            spineScrollTrigger.to('.work-header, .archive-back-btn, .work-glow', { opacity: 0, ease: 'power2.inOut', duration: 0.8 }, 4.2);
            const isDesktop = window.innerWidth > 768;
            spineScrollTrigger.to('.gateway-bg-img', { scale: 1, ease: 'power2.inOut', duration: 1 }, 4);
            spineScrollTrigger.to('.work-content', { opacity: 0, scale: 0.9, ease: 'power2.in', duration: 0.6 }, 4);
            spineScrollTrigger.set('.work-content', { pointerEvents: 'none' }, 4);
            spineScrollTrigger.to('.gateway-ui', { opacity: 1, scale: 1, ease: 'power2.out', duration: 0.8 }, 4.2);

            // Click Interaction to fast-forward into the work section from the closed gateway state
            const gatewayWindow = document.querySelector('.gateway-window');
            gatewayWindow.addEventListener('click', () => {
                const st = ScrollTrigger.getById("workSpine");
                if (st && st.progress < 0.15) { 
                    const targetScroll = st.start + (st.end - st.start) * 0.2;
                    lenis.scrollTo(targetScroll, { duration: 1.5, ease: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
                }
            });

            // Back Button Click Interaction
            const backBtn = document.querySelector('.archive-back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    lenis.scrollTo('.philosophy-section', { offset: 0, duration: 1.5, ease: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
                });
            }

            // Dropdown Menu Interaction
            const chapterToggle = document.querySelector('.chapter-toggle');
            const chapterMenu = document.querySelector('.chapter-menu');
            const chapterChevron = document.getElementById('chapter-chevron');
            let menuOpen = false;

            if (chapterToggle && chapterMenu) {
                chapterToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    menuOpen = !menuOpen;
                    if(menuOpen) {
                        gsap.to(chapterMenu, { opacity: 1, y: 0, pointerEvents: 'auto', duration: 0.4, ease: 'power3.out' });
                        gsap.fromTo('.filter-btn', { opacity: 0, x: -10 }, { opacity: 1, x: 0, stagger: 0.05, duration: 0.4, ease: 'power3.out' });
                        gsap.to(chapterChevron, { rotate: 180, duration: 0.4, ease: 'power2.out' });
                    } else {
                        closeChapterMenu();
                    }
                });

                document.addEventListener('click', () => {
                    if(menuOpen) closeChapterMenu();
                });
            }

            function closeChapterMenu() {
                menuOpen = false;
                gsap.to(chapterMenu, { opacity: 0, y: -10, pointerEvents: 'none', duration: 0.3, ease: 'power2.in' });
                gsap.to(chapterChevron, { rotate: 0, duration: 0.4, ease: 'power2.out' });
            }

            // Chapter Navigation (Filter Buttons)
            const filterBtns = document.querySelectorAll('.filter-btn');
            filterBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const filter = e.target.textContent.trim().toUpperCase();
                    closeChapterMenu();
                    
                    const st = ScrollTrigger.getById("workSpine");
                    if (!st) return;

                    if (filter === 'ALL' || filter === 'ALL CHAPTERS') {
                        // Scroll to the start of the horizontal track
                        const targetScroll = st.start + (st.end - st.start) * 0.2; 
                        lenis.scrollTo(targetScroll, { duration: 1.5, ease: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
                    } else {
                        // Scroll to specific Chapter
                        const catCard = document.querySelector(`.category-title-card[data-category="${filter}"]`);
                        if (catCard) {
                            const trackWidth = track.scrollWidth - window.innerWidth / 2;
                            const catLeft = catCard.offsetLeft;
                            
                            // Map the distance along the track to the timeline's progress
                            const fraction = Math.min(1, catLeft / trackWidth);
                            // The horizontal scroll phase spans progress 0.2 to 1.0 (which is 80% of the timeline)
                            const totalProgress = 0.2 + (fraction * 0.8);
                            
                            const targetScroll = st.start + (st.end - st.start) * totalProgress;
                            lenis.scrollTo(targetScroll, { duration: 1.5, ease: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
                        }
                    }
                });
            });

            // Card 3D tilt hover logic
            document.querySelectorAll('.project-card').forEach(card => {
                const video = card.querySelector('video');
                const cardCursor = card.querySelector('.card-cursor-inner');
                
                card.addEventListener('mousemove', e => {
                    const r = card.getBoundingClientRect();
                    const x = (e.clientX - r.left) / r.width - 0.5;
                    const y = (e.clientY - r.top) / r.height - 0.5;
                    gsap.to(card.querySelector('.card-media'), { rotateY: x * 15, rotateX: -y * 15, duration: 0.4 });
                    
                    if(cardCursor) {
                        const mx = e.clientX - r.left;
                        const my = e.clientY - r.top;
                        gsap.to(cardCursor, { x: mx, y: my, xPercent: -50, yPercent: -50, scale: 1, duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
                    }
                });
                card.addEventListener('mouseenter', () => {
                    gsap.to(card.querySelector('.card-media'), { y: -5, duration: 0.4, ease: 'power2.out' });
                    if(video) { video.style.opacity = 1; video.play().catch(()=>{}); }
                });
                card.addEventListener('mouseleave', () => {
                    gsap.to(card.querySelector('.card-media'), { rotateY: 0, rotateX: 0, y: 0, duration: 0.8, ease: 'expo.out' });
                    if(cardCursor) { gsap.to(cardCursor, { scale: 0.8, duration: 0.4, ease: 'expo.out', overwrite: 'auto' }); }
                    if(video) { video.style.opacity = 0; video.pause(); }
                });
            });
        }

        // -------------------------------------------------------------
        // BOOTSTRAP
        // -------------------------------------------------------------
        window.addEventListener('DOMContentLoaded', async () => {
            // Apply floating wrappers to all cards dynamically to keep HTML clean
            document.querySelectorAll('.project-card').forEach((card, index) => {
                const wrapper = document.createElement('div');
                wrapper.className = `card-float-wrapper card-float-${index % 3}`;
                while (card.firstChild) {
                    wrapper.appendChild(card.firstChild);
                }
                card.appendChild(wrapper);
            });

            // Setup Lenis
            lenis = new Lenis({ duration: 2.0, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), direction: 'vertical', gestureDirection: 'vertical', smooth: true, mouseMultiplier: 1, smoothTouch: false, touchMultiplier: 2, infinite: false });
            lenis.on('scroll', ScrollTrigger.update);
            lenis.on('scroll', ({ progress }) => {
                document.getElementById('scroll-bar').style.transform = `scaleX(${progress})`;
            });
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);

            // Init Systems
            const cursor = new CinematicCursor();
            voidStage = new VoidStage();

            // Setup Nav Links Scramble & Routing (Unified Single Page)
            const navLinks = document.querySelectorAll('.nav-trigger');
            navLinks.forEach(link => {
                const scramble = link.dataset.text ? new TextScramble(link) : null;
                link.addEventListener('mouseenter', () => scramble && scramble.setText(link.dataset.text));
                link.addEventListener('click', e => {
                    e.preventDefault();
                    const target = link.dataset.target;
                    
                    // Route securely to their scroll points
                    if (target === 'hero') lenis.scrollTo(0, { offset: 0, duration: 1.5 });
                    else if (target === 'work') lenis.scrollTo('#work', { offset: 0, duration: 1.5 });
                    else if (target === 'services') lenis.scrollTo('#services-section', { offset: 0, duration: 1.5 });
                    else if (target === 'about') lenis.scrollTo('#about', { offset: 0, duration: 1.5 });
                    else if (target === 'contact') {
                        // Launch Digital Audit Overlay as the primary Contact route
                        openDaOverlay();
                    }
                });
            });

            // Mood Triggers for standard sections on scroll
            ScrollTrigger.create({ trigger: "#hero", start: "top center", onEnter: () => { if(showreelInst) voidStage.setMood(SHOWREEL[showreelInst.idx].mood); }, onEnterBack: () => { if(showreelInst) voidStage.setMood(SHOWREEL[showreelInst.idx].mood); } });
            ScrollTrigger.create({ trigger: "#philosophy", start: "top 75%", onEnter: () => voidStage.setMood('cinema'), onEnterBack: () => voidStage.setMood('cinema') });
            ScrollTrigger.create({ trigger: "#services-section", start: "top center", onEnter: () => voidStage.setMood('concertPurple'), onEnterBack: () => voidStage.setMood('concertPurple') });
            ScrollTrigger.create({ trigger: "#about", start: "top center", onEnter: () => voidStage.setMood('darkEditorial'), onEnterBack: () => voidStage.setMood('darkEditorial') });
            ScrollTrigger.create({ trigger: "#testimonials-section", start: "top center", onEnter: () => voidStage.setMood('goldenWarmth'), onEnterBack: () => voidStage.setMood('goldenWarmth') });

            // --- SETUP INITIAL INTRO TENSION ---
            gsap.set('header, .hero-slate, .hero-cats, .hero-now-playing, .hero-scroll', { opacity: 0, y: 20 });
            gsap.set('.reel-clip.active', { filter: 'blur(20px) brightness(0.1)', scale: 1.1 });
            
            const chars1 = splitText('#title-line-1');
            const chars2 = splitText('#title-line-2');
            const allChars = chars1.concat(chars2);
            gsap.set(allChars, { clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)', y: 40 });

            // RUN PRELOADER (The Tease)
            await runPreloader();
            
            // --- REVEAL MOMENT (The Reward) ---
            // 2. Discovered text mask reveal
            gsap.to(allChars, {
                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                y: 0,
                stagger: 0.06,
                duration: 2,
                ease: 'power4.out',
                delay: 0.2
            });

            // 3. Stabilization (Clarity) UI appears slowly
            gsap.to('header', { opacity: 1, y: 0, duration: 1.5, ease: 'power2.out', delay: 1.2 });
            gsap.to('.hero-slate, .hero-cats', { opacity: 1, y: 0, duration: 1.5, ease: 'power2.out', delay: 1.6 });
            gsap.to('.hero-now-playing, .hero-scroll', { opacity: 1, y: 0, duration: 1.5, ease: 'power2.out', delay: 2.0 });
            
            showreelInst = new Showreel();

            // --- DEFERRED INTERACTIVITY ---
            setTimeout(() => {
                initHeroTilt();
                initHomeScroll();
                initAboutAnimations(); // Initialize About Section Reveal
                initAboutTilt(); // Initialize About 3D interaction
                initClientSpotlight(); // Initialize The Client Logo Mask Hover Effect
                initWorkSpine(); // Initialize the dynamic work spine on load
                initServicesDeck(); // Initialize 3D Services Deck
                initMagneticInteractions();
            }, 2500); // Only activate mouse effects after reveal is stable



            // --- 3D CONTACT OVERLAY LOGIC ---
            let isContactOpen = false;
            const contactOverlay = document.getElementById('contact-overlay');
            const contactPerspective = document.getElementById('contact-perspective');
            const contactCard = document.querySelector('.contact-card-3d');
            
            function openContactOverlay() {
                if(isContactOpen) return;
                isContactOpen = true;
                
                // Freeze background
                lenis.stop();
                
                // Set mood to a vibrant Dark Editorial (Red) for the contact screen
                voidStage.setMood('darkEditorial');
                if (voidStage.triggerBurst) voidStage.triggerBurst();

                // Fade in overlay backdrop
                gsap.to(contactOverlay, { opacity: 1, pointerEvents: 'auto', duration: 0.6, ease: 'power2.out' });
                
                // 3D Card Entrance Animation
                gsap.fromTo(contactCard, 
                    { y: 150, rotateX: -30, scale: 0.8, opacity: 0 }, 
                    { y: 0, rotateX: 0, scale: 1, opacity: 1, duration: 1.2, ease: 'expo.out', delay: 0.1 }
                );
            }

            function closeContactOverlay() {
                if(!isContactOpen) return;
                isContactOpen = false;
                
                // Unfreeze background
                lenis.start();

                // Animate card out
                gsap.to(contactCard, { y: -100, rotateX: 20, scale: 0.9, opacity: 0, duration: 0.6, ease: 'power2.in' });
                
                // Fade out overlay backdrop
                gsap.to(contactOverlay, { opacity: 0, pointerEvents: 'none', duration: 0.6, ease: 'power2.in', delay: 0.2, onComplete: () => {
                    // Trigger a scroll update to revert the mood back to whatever section they are currently looking at
                    ScrollTrigger.refresh(true);
                }});
            }

            // Close button click
            document.querySelector('.contact-close-btn').addEventListener('click', closeContactOverlay);
            
            // Close on background click
            document.querySelector('.contact-backdrop').addEventListener('click', closeContactOverlay);

            // Escape key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && isContactOpen) closeContactOverlay();
            });

            // Interactive 3D Tilt Logic for Contact Card
            if(contactPerspective && contactCard) {
                contactPerspective.addEventListener('mousemove', (e) => {
                    if(!isContactOpen || window.innerWidth < 768) return; // Skip heavy tilt on mobile
                    
                    const rect = contactPerspective.getBoundingClientRect();
                    const cx = rect.left + rect.width / 2;
                    const cy = rect.top + rect.height / 2;
                    
                    // Calculate distance from center (-1 to 1)
                    const tx = (e.clientX - cx) / (rect.width / 2);
                    const ty = (e.clientY - cy) / (rect.height / 2);
                    
                    // Apply rotation to card
                    gsap.to(contactCard, { 
                        rotateX: ty * -15, // tilt up/down
                        rotateY: tx * 15,  // tilt left/right
                        duration: 1.5, 
                        ease: 'power3.out',
                        transformPerspective: 1200
                    });
                });

                // Reset tilt on mouse leave
                contactPerspective.addEventListener('mouseleave', () => {
                    if(!isContactOpen) return;
                    gsap.to(contactCard, { rotateX: 0, rotateY: 0, duration: 1.5, ease: 'elastic.out(1, 0.5)' });
                });
            }

            // --- DIGITAL AUDIT OVERLAY LOGIC (User's Script Ported) ---
            let isDaOpen = false;
            const daOverlay = document.getElementById('da-overlay');
            const projectStartBtn = document.getElementById('start-project-btn');
            const daCloseBtns = document.querySelectorAll('.da-close-btn');
            const daForm = document.getElementById('auditFormInner');

            // Three.js variables isolated for Audit overlay
            let daScene, daCamera, daRenderer, daParticles;
            let daShapes = [];
            let daReqFrame;

            function initDaThreeJS() {
                if (daRenderer) return; // Already initialized

                const canvas = document.getElementById('da-webgl-bg');
                daScene = new THREE.Scene();
                daCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                daRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
                daRenderer.setSize(window.innerWidth, window.innerHeight);
                daRenderer.setClearColor(0x000000, 0); // Transparent so CSS bg radiates through
                daCamera.position.z = 30;

                // Create Particle System
                const geometry = new THREE.BufferGeometry();
                const particleCount = 150;
                const positions = new Float32Array(particleCount * 3);
                const velocities = new Float32Array(particleCount * 3);
                const colors = new Float32Array(particleCount * 3);

                for (let i = 0; i < particleCount * 3; i += 3) {
                    positions[i] = (Math.random() - 0.5) * 100;
                    positions[i + 1] = (Math.random() - 0.5) * 100;
                    positions[i + 2] = (Math.random() - 0.5) * 100;

                    velocities[i] = (Math.random() - 0.5) * 0.3;
                    velocities[i + 1] = (Math.random() - 0.5) * 0.3;
                    velocities[i + 2] = (Math.random() - 0.5) * 0.3;

                    // Mix of Red and Golden colors
                    if (Math.random() > 0.5) {
                        colors[i] = 0.90; // Netflix Red (#E50914)
                        colors[i + 1] = 0.04;
                        colors[i + 2] = 0.08;
                    } else {
                        colors[i] = 0.91; // Golden (#E8A832 approx)
                        colors[i + 1] = 0.66;
                        colors[i + 2] = 0.20;
                    }
                }

                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

                const material = new THREE.PointsMaterial({
                    size: 0.6,
                    vertexColors: true,
                    opacity: 0.7,
                    transparent: true,
                    sizeAttenuation: true
                });

                daParticles = new THREE.Points(geometry, material);
                daScene.add(daParticles);

                window.addEventListener('resize', () => {
                    if(!isDaOpen) return;
                    daCamera.aspect = window.innerWidth / window.innerHeight;
                    daCamera.updateProjectionMatrix();
                    daRenderer.setSize(window.innerWidth, window.innerHeight);
                });
            }

            // Industry Toggle Logic
            window.toggleOtherIndustry = function(select) {
                const otherGroup = document.getElementById('other-industry-group');
                const otherInput = document.getElementById('da-industry-other');
                if (select.value === 'other') {
                    otherGroup.style.display = 'block';
                    otherInput.required = true;
                    otherInput.focus();
                } else {
                    otherGroup.style.display = 'none';
                    otherInput.required = false;
                }
            };

            function animateDa() {
                if (!isDaOpen) return;
                daReqFrame = requestAnimationFrame(animateDa);

                // Rotate Particles
                daParticles.rotation.x += 0.0001;
                daParticles.rotation.y += 0.0002;

                // Update Particle Positions
                const positions = daParticles.geometry.attributes.position.array;
                const velocities = daParticles.geometry.attributes.velocity.array;

                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] += velocities[i];
                    positions[i + 1] += velocities[i + 1];
                    positions[i + 2] += velocities[i + 2];

                    if (Math.abs(positions[i]) > 50) velocities[i] *= -1;
                    if (Math.abs(positions[i + 1]) > 50) velocities[i + 1] *= -1;
                    if (Math.abs(positions[i + 2]) > 50) velocities[i + 2] *= -1;
                }
                daParticles.geometry.attributes.position.needsUpdate = true;

                // Rotate Shapes
                daShapes.forEach(child => {
                    child.rotation.x += child.userData.speed;
                    child.rotation.y += child.userData.speed * 1.3;
                });

                daRenderer.render(daScene, daCamera);
            }

            function openDaOverlay() {
                if(isDaOpen) return;
                isDaOpen = true;
                lenis.stop(); // Freeze main background scrolling
                
                initDaThreeJS();
                animateDa(); // Start WebGL loop specifically for overlay

                gsap.to(daOverlay, { opacity: 1, pointerEvents: 'auto', duration: 0.6, ease: 'power2.out' });
                daOverlay.scrollTop = 0; // ensure it opens at top

                // Trigger fresh GSAP stagger for reliable form and feature appearance
                gsap.fromTo('.da-animate-element', 
                    { y: 40, opacity: 0 }, 
                    { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
                );
            }

            function closeDaOverlay() {
                if(!isDaOpen) return;
                isDaOpen = false;
                cancelAnimationFrame(daReqFrame); // Stop loop to save resources

                // Quickly fade out inner content
                gsap.to('.da-animate-element', { y: -20, opacity: 0, duration: 0.3, ease: 'power2.in' });

                gsap.to(daOverlay, { 
                    opacity: 0, 
                    pointerEvents: 'none', 
                    duration: 0.6, 
                    ease: 'power2.inOut',
                    delay: 0.1,
                    onComplete: () => {
                        lenis.start();
                    }
                });
            }

            if (projectStartBtn) projectStartBtn.addEventListener('click', openDaOverlay);
            daCloseBtns.forEach(btn => btn.addEventListener('click', closeDaOverlay));

            // Form Submit Simulation for Audit overlay
            if (daForm) {
                daForm.addEventListener('submit', function (e) {
                    e.preventDefault();
                    const submitBtn = this.querySelector('.submit-btn');
                    const originalText = submitBtn.textContent;

                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Submitting...';
                    submitBtn.style.opacity = '0.7';

                    // Simulate API Request
                    setTimeout(() => {
                        submitBtn.textContent = '✓ Request Sent!';
                        submitBtn.style.background = 'linear-gradient(135deg, #00C851 0%, #007E33 100%)';
                        submitBtn.style.opacity = '1';

                        setTimeout(() => {
                            submitBtn.textContent = originalText;
                            submitBtn.style.background = '';
                            submitBtn.disabled = false;
                            daForm.reset();
                            closeDaOverlay();
                        }, 2500);

                    }, 1800);
                });
            }
            
            // --- CINEMATIC PROJECT REVEAL ---
            let revealScrollTriggers = []; // Store triggers to clean them up
            let activeCardsList = [];
            let currentRevealIndex = 0;

            function populateRevealData(index) {
                const card = activeCardsList[index];
                if (!card) return;
                currentRevealIndex = index;

                const baseTitle = card.querySelector('.card-name').innerText;
                const imgSrc = card.querySelector('img').src;
                
                // Read exact layout data from card, or fallback to smart defaults
                const titleLeft = card.dataset.titleLeft ? card.dataset.titleLeft.replace(/\\n/g, '\n') : baseTitle.split(' ')[0] || 'Limitless';
                const titleRight = card.dataset.titleRight ? card.dataset.titleRight.replace(/\\n/g, '\n') : baseTitle.split(' ')[1] || 'Productions';
                
                const metaTl = card.dataset.metaTl || "FASHION FILM";
                const metaTr = card.dataset.metaTr || "EDITORIAL";
                const metaBc = card.dataset.metaBc || baseTitle;
                
                const desc = card.dataset.desc || "Engineered with cinematic precision. Original frames shot globally, polished beautifully.";
                const cardVideo = card.querySelector('video');
                const reelSrc = card.dataset.reel || (cardVideo ? cardVideo.src : '');
                
                // Populate Typography
                document.querySelector('.pr-title-left').innerText = titleLeft;
                document.querySelector('.pr-title-right').innerText = titleRight;
                document.querySelector('.pr-meta-tl').innerText = metaTl;
                document.querySelector('.pr-meta-tr').innerText = metaTr;
                document.querySelector('.pr-meta-bl').innerText = `0${index + 1}.`;
                document.querySelector('.pr-meta-bc').innerText = metaBc;
                document.querySelector('.pr-meta-br').innerText = `.${String(activeCardsList.length).padStart(2, '0')}`;
                
                // Populate deep-dive cinematic showcase
                document.getElementById('pr-extended-title').innerText = baseTitle.replace('\n', ' ');
                document.getElementById('pr-extended-desc').innerHTML = desc;
                
                // Populate Instagram handle above portrait reels
                const igHandle = card.dataset.instagram || '';
                const igEl = document.getElementById('pr-instagram-handle');
                const igText = document.getElementById('pr-instagram-text');
                if (igHandle && igEl && igText) {
                    igText.innerText = igHandle;
                    igEl.href = `https://instagram.com/${igHandle.replace('@', '')}`;
                    igEl.style.display = 'flex';
                } else if (igEl) {
                    igEl.style.display = 'none';
                }

                const prMedia = document.querySelector('.pr-media');
                prMedia.innerHTML = `<img src="${imgSrc}">`;
                
                const reelWrap = document.querySelector('.pr-reel-wrapper');
                const infoWrap = document.querySelector('.pr-info-wrapper');
                
                // Inject Full Screen Reel and Autoplay Engine
                if (reelSrc) {
                    reelWrap.innerHTML = `
                        <video class="pr-reel-video" src="${reelSrc}" loop playsinline muted></video>
                        <div class="pr-reel-gradient"></div>
                    `;
                    
                    setTimeout(() => {
                        const vid = reelWrap.querySelector('video');
                        const pill = document.querySelector('.pr-cursor-pill');
                        
                        // Force Autoplay immediately
                        if (vid) {
                            vid.play().catch(e => console.warn("Playback blocked:", e));
                        }
                        
                        reelWrap.onmouseenter = () => pill.innerText = vid.paused ? 'PLAY' : 'PAUSE';
                        reelWrap.onmouseleave = () => pill.innerText = '';
                        
                        // Click to pause/play
                        reelWrap.onclick = () => {
                            if (vid.paused) {
                                vid.play().catch(e => console.warn("Playback blocked:", e));
                                pill.innerText = 'PAUSE';
                            } else {
                                vid.pause();
                                pill.innerText = 'PLAY';
                            }
                        };
                    }, 50);
                } else {
                    reelWrap.innerHTML = `<img class="pr-reel-video" src="${imgSrc}" style="object-fit: cover; width: 100%; height: 100%;"><div class="pr-reel-gradient"></div>`;
                }

                // Inject Description at bottom
                infoWrap.innerHTML = `<div class="pr-desc">${desc}</div>`;

                // --- NEW: Populate Deep-Dive Portrait Reels ---
                const p1 = card.dataset.reel1 || '';
                const p2 = card.dataset.reel2 || '';
                const p3 = card.dataset.reel3 || '';
                
                const vid1 = document.getElementById('pr-portrait-1');
                const vid2 = document.getElementById('pr-portrait-2');
                const vid3 = document.getElementById('pr-portrait-3');
                
                if (vid1) {
                    vid1.src = p1;
                    vid1.closest('.group').style.display = p1 ? 'flex' : 'none';
                    if(p1) vid1.load();
                }
                if (vid2) {
                    vid2.src = p2;
                    vid2.closest('.group').style.display = p2 ? 'flex' : 'none';
                    if(p2) vid2.load();
                }
                if (vid3) {
                    vid3.src = p3;
                    vid3.closest('.group').style.display = p3 ? 'flex' : 'none';
                    if(p3) vid3.load();
                }
                
                const reveal = document.getElementById('project-reveal');
                reveal._activeCard = card;
            }

            function switchProjectReveal(direction) {
                let nextIndex = currentRevealIndex + direction;
                if(nextIndex < 0) nextIndex = activeCardsList.length - 1;
                if(nextIndex >= activeCardsList.length) nextIndex = 0;

                const scroller = document.getElementById('project-reveal');
                gsap.to(scroller, { scrollTop: 0, duration: 0.4, ease: 'power2.inOut' });
                
                // Vertical distance for the cascade effect
                const yDist = window.innerHeight * 0.4 * direction;

                // Dynamic Cascading/Stack Animation (Vertical & Scale)
                gsap.to('.pr-center-stage, .pr-info-wrapper, .pr-title-side', { y: -yDist, opacity: 0, duration: 0.5, ease: 'power2.inOut' });
                gsap.to('.pr-reel-wrapper', { y: -yDist, opacity: 0, duration: 0.5, ease: 'power2.inOut', onComplete: () => {
                    populateRevealData(nextIndex);
                    
                    // Prep incoming elements (start from the opposite side)
                    gsap.set('.pr-center-stage, .pr-info-wrapper, .pr-title-side', { y: yDist, opacity: 0 });
                    gsap.set('.pr-reel-wrapper', { y: yDist, opacity: 0 });
                    
                    // Slide and scale in staggered
                    gsap.to('.pr-reel-wrapper', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' });
                    gsap.to('.pr-center-stage', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.1 });
                    gsap.to('.pr-title-left', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.15 });
                    gsap.to('.pr-title-right', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.2 });
                    gsap.to('.pr-info-wrapper', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.25 });
                }});
            }

            // Interconnected Navigation Listeners
            document.querySelector('.pr-nav-prev').addEventListener('click', () => switchProjectReveal(-1));
            document.querySelector('.pr-nav-next').addEventListener('click', () => switchProjectReveal(1));

            // Mouse wheel scroll for interconnected navigation (DISABLED TO ALLOW SCROLLING DOWN)
            let isSwitchingProject = false;
            const revealContainer = document.getElementById('project-reveal');
            /*
            revealContainer.addEventListener('wheel', (e) => {
                if(!revealContainer.classList.contains('active')) return;
                if(isSwitchingProject) return;
                
                // Set threshold to ensure trackpad inertia doesn't multi-fire
                if(Math.abs(e.deltaY) > 25) {
                    isSwitchingProject = true;
                    switchProjectReveal(e.deltaY > 0 ? 1 : -1);
                    setTimeout(() => { isSwitchingProject = false; }, 1200); // Lockout during transition
                }
            }, { passive: true });
            */

            // Keyboard Navigation (Arrow Keys & Escape)
            document.addEventListener('keydown', (e) => {
                const reveal = document.getElementById('project-reveal');
                if (!reveal.classList.contains('active')) return; // Only trigger if overlay is open
                
                if (e.key === 'ArrowLeft') {
                    switchProjectReveal(-1);
                } else if (e.key === 'ArrowRight') {
                    switchProjectReveal(1);
                } else if (e.key === 'Escape') {
                    document.querySelector('.pr-close').click();
                }
            });

            document.querySelectorAll('.project-card').forEach((card, index) => {
                card.addEventListener('click', () => {
                    const reveal = document.getElementById('project-reveal');
                    if (reveal.classList.contains('active')) return;
                    
                    lenis.stop(); // Freeze background
                    
                    // Fetch visible cards to maintain filter accuracy
                    activeCardsList = Array.from(document.querySelectorAll('.project-card:not([style*="display: none"])'));
                    const activeIndex = activeCardsList.indexOf(card);
                    
                    // Reset card 3D tilt instantly so bounding box is perfectly calculated without mid-animation distortion
                    gsap.set(card.querySelector('.card-media'), { rotateY: 0, rotateX: 0, y: 0 });
                    
                    // Aberration burst
                    if (voidStage.triggerBurst) voidStage.triggerBurst();

                    // Copy Data to Overlay using central function
                    populateRevealData(activeIndex !== -1 ? activeIndex : index);

                    const rect = card.querySelector('.card-media').getBoundingClientRect();
                    const prMedia = document.querySelector('.pr-media');
                    
                    // Reset overlay scroll
                    const scroller = document.getElementById('project-reveal');
                    scroller.scrollTop = 0;
                    
                    // Set initial bounds for seamless pop
                    gsap.set(prMedia, { 
                        opacity: 1,
                        x: rect.left, 
                        y: rect.top, 
                        width: rect.width, 
                        height: rect.height,
                        borderRadius: '6px'
                    });
                    
                    gsap.set(reveal, { display: 'block', opacity: 0 });
                    reveal.classList.add('active');
                    
                    // Hide background elements
                    gsap.to('.project-card', { opacity: 0, duration: 0.6, ease: 'power2.out' });
                    gsap.to('header, .work-header', { opacity: 0, y: -20, duration: 0.6 });
                    
                    // 1. Reveal Container Fade In
                    gsap.to(reveal, { opacity: 1, duration: 0.4, ease: 'power2.inOut' });
                    
                    // 2. Background Wallpaper expansion
                    gsap.to(prMedia, { 
                        x: 0, y: 0, 
                        width: '100vw', height: '100vh', 
                        borderRadius: '0px', 
                        duration: 0.9, 
                        ease: 'power4.inOut',
                        onComplete: () => { prMedia.style.opacity = 0; } // Fade out pop background so swiping is clean
                    });

                    // 3. Reveal the Reel and Typography Staggered
                    gsap.set('.pr-title-side', { y: 60, opacity: 0 });
                    gsap.set('.pr-center-stage, .pr-info-wrapper', { y: 30, opacity: 0 });
                    gsap.set('.pr-reel-wrapper', { opacity: 0, scale: 1.05 });
                    
                    gsap.to('.pr-reel-wrapper', { scale: 1, opacity: 1, duration: 1.0, ease: 'power3.out', delay: 0.3 });
                    gsap.to('.pr-center-stage', { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out', delay: 0.4 });
                    gsap.to('.pr-title-left', { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out', delay: 0.5 });
                    gsap.to('.pr-title-right', { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out', delay: 0.6 });
                    gsap.to('.pr-info-wrapper', { y: 0, opacity: 1, duration: 1.0, ease: 'power3.out', delay: 0.7 });
                    
                    // 4. UI Elements
                    gsap.to('.pr-close, .pr-cursor-pill, .pr-nav-btn', { opacity: 1, scale: 1, duration: 0.8, delay: 0.7 });

            // Mouse movement tracking for reveal pill
                    const revealPill = document.querySelector('.pr-cursor-pill');
                    revealPill.innerText = ''; // reset text
                    const onRevealMove = (e) => {
                        gsap.to(revealPill, { x: e.clientX, y: e.clientY, duration: 0.3, ease: 'power2.out' });
                    };
                    reveal.addEventListener('mousemove', onRevealMove);
                    reveal._onRevealMove = onRevealMove;

                    // NEW: Initialize 3D tilt for portrait reels if not already done
                    if (!reveal._tiltInit) {
                        initPortraitTilt();
                        reveal._tiltInit = true;
                    }

                    // Save data for seamless exit
                    reveal.dataset.ox = rect.left;
                    reveal.dataset.oy = rect.top;
                    reveal.dataset.ow = rect.width;
                    reveal.dataset.oh = rect.height;
                    reveal._activeCard = card;
                });
            });

            function initPortraitTilt() {
                const containers = document.querySelectorAll('.pr-client-details .group');
                containers.forEach(container => {
                    const wrap = container.querySelector('.relative');
                    if (!wrap) return;
                    
                    container.addEventListener('mousemove', (e) => {
                        if (window.innerWidth < 768) return;
                        const rect = container.getBoundingClientRect();
                        const x = (e.clientX - rect.left) / rect.width;
                        const y = (e.clientY - rect.top) / rect.height;
                        const dx = (x - 0.5) * 16;
                        const dy = (y - 0.5) * -16;
                        
                        gsap.to(wrap, {
                            rotateY: dx,
                            rotateX: dy,
                            duration: 1,
                            ease: 'power2.out',
                            transformPerspective: 1000
                        });
                    });
                    
                    container.addEventListener('mouseleave', () => {
                        gsap.to(wrap, {
                            rotateY: 0,
                            rotateX: 0,
                            duration: 1.5,
                            ease: 'elastic.out(1, 0.3)'
                        });
                    });
                });
            }

            document.querySelector('.pr-close').addEventListener('click', () => {
                const reveal = document.getElementById('project-reveal');
                const ox = reveal.dataset.ox;
                const oy = reveal.dataset.oy;
                const ow = reveal.dataset.ow;
                const oh = reveal.dataset.oh;
                const card = reveal._activeCard;

                // Show global cursor
                gsap.to('#c-ring, .cursor-trail', { scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out' });
                
                setTimeout(() => {
                    const tl = gsap.timeline({
                        onComplete: () => {
                            reveal.classList.remove('active');
                            gsap.set(reveal, { display: 'none' });
                            lenis.start();
                            // Restore background
                            gsap.to('.project-card', { opacity: 1, duration: 0.8, ease: 'power2.out' });
                            gsap.to('header, .work-header', { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' });
                        }
                    });
                    
                    // Remove mouse listener
                    reveal.removeEventListener('mousemove', reveal._onRevealMove);

                    // Restore pop background for smooth collapse
                    const prMedia = document.querySelector('.pr-media');
                    prMedia.style.opacity = 1;

                    // Hide UI
                    tl.to('.pr-reel-wrapper, .pr-center-stage, .pr-info-wrapper, .pr-title-side, .pr-close, .pr-cursor-pill, .pr-nav-btn', { opacity: 0, y: 20, duration: 0.3, ease: 'power2.in' })
                      // Shrink media back to card size
                      .to('.pr-media', { 
                          x: ox, 
                          y: oy, 
                          width: ow, 
                          height: oh, 
                          borderRadius: '6px', 
                          duration: 0.8, 
                          ease: 'power4.inOut' 
                      }, 0.1)
                      // Fade out overlay entirely
                      .to(reveal, { opacity: 0, duration: 0.3 }, 0.6);
                }, 100);
            });
        });