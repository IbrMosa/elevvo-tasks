// Scroll animations and interactivity
document.addEventListener('DOMContentLoaded', function() {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animateElements = document.querySelectorAll('.feature-card, .review-card, .pricing-card');
    animateElements.forEach(el => {
        observer.observe(el);
    });

    // Features carousel: centered large card with side previews
    (function initFeaturesCarousel() {
        const carousel = document.querySelector('.features-carousel');
        const track = document.querySelector('.features-grid');
        const prevBtn = document.querySelector('.features-carousel .carousel-btn.prev');
        const nextBtn = document.querySelector('.features-carousel .carousel-btn.next');
        if (!carousel || !track) return;

        // Build infinite loop by cloning edges
        const originalCards = Array.from(track.querySelectorAll('.feature-card'));
        if (originalCards.length === 0) return;
        const CLONE_COUNT = Math.min(2, originalCards.length); // clone up to 2 on each side

        // Prevent double-initialization (if rerun)
        if (track._infiniteInitialized) return;
        track._infiniteInitialized = true;

        const prependClones = [];
        const appendClones = [];
        for (let i = 0; i < CLONE_COUNT; i++) {
            const fromEnd = originalCards[originalCards.length - 1 - i].cloneNode(true);
            fromEnd.setAttribute('data-clone', 'true');
            prependClones.push(fromEnd);

            const fromStart = originalCards[i].cloneNode(true);
            fromStart.setAttribute('data-clone', 'true');
            appendClones.push(fromStart);
        }
        // Insert clones
        prependClones.reverse().forEach(n => track.insertBefore(n, track.firstChild));
        appendClones.forEach(n => track.appendChild(n));

        let cards = Array.from(track.querySelectorAll('.feature-card'));
        const clonesStart = CLONE_COUNT;
        const clonesEnd = CLONE_COUNT;
        let currentIndex = clonesStart; // start at first real item

        function updateButtons() {
            if (!prevBtn && !nextBtn) return;
            const atStart = track.scrollLeft <= 1;
            const maxScroll = track.scrollWidth - track.clientWidth - 1;
            const atEnd = track.scrollLeft >= maxScroll;
            if (prevBtn) prevBtn.disabled = atStart;
            if (nextBtn) nextBtn.disabled = atEnd;
        }

        function getClosestIndexToCenter() {
            const viewportCenter = track.scrollLeft + track.clientWidth / 2;
            let closestIdx = 0;
            let minDist = Infinity;
            cards.forEach((card, idx) => {
                const cardCenter = card.offsetLeft + card.offsetWidth / 2;
                const dist = Math.abs(cardCenter - viewportCenter);
                if (dist < minDist) {
                    minDist = dist;
                    closestIdx = idx;
                }
            });
            return closestIdx;
        }

        function applyCenterClasses(centerIdx) {
            cards.forEach((card, idx) => {
                card.classList.remove('is-center', 'is-near');
                if (idx === centerIdx) {
                    card.classList.add('is-center');
                } else if (Math.abs(idx - centerIdx) === 1) {
                    card.classList.add('is-near');
                }
            });
        }

        function centerCard(index, behavior = 'smooth') {
            let targetIndex = Math.max(0, Math.min(index, cards.length - 1));
            const card = cards[targetIndex];
            const targetLeft = card.offsetLeft + card.offsetWidth / 2 - track.clientWidth / 2;
            track.scrollTo({ left: targetLeft, behavior });
            currentIndex = targetIndex;

            // After scrolling, if we're in clones, jump to equivalent real slide without animation
            setTimeout(() => {
                // Wrapped to right end (beyond last real)
                if (currentIndex >= cards.length - clonesEnd) {
                    targetIndex = clonesStart; // first real
                    const real = cards[targetIndex];
                    const left = real.offsetLeft + real.offsetWidth / 2 - track.clientWidth / 2;
                    track.scrollTo({ left, behavior: 'auto' });
                    currentIndex = targetIndex;
                }
                // Wrapped to left end (before first real)
                if (currentIndex < clonesStart) {
                    targetIndex = (cards.length - clonesEnd - 1); // last real
                    const real = cards[targetIndex];
                    const left = real.offsetLeft + real.offsetWidth / 2 - track.clientWidth / 2;
                    track.scrollTo({ left, behavior: 'auto' });
                    currentIndex = targetIndex;
                }
                applyCenterClasses(currentIndex);
                updateButtons();
            }, 360);
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                const current = getClosestIndexToCenter();
                centerCard(current - 1);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const current = getClosestIndexToCenter();
                centerCard(current + 1);
            });
        }

        // Update center state on scroll (throttled by rAF)
        track.addEventListener('scroll', () => {
            if (track._ticking) return;
            track._ticking = true;
            requestAnimationFrame(() => {
                const idx = getClosestIndexToCenter();
                currentIndex = idx;
                applyCenterClasses(currentIndex);
                updateButtons();
                track._ticking = false;
            });
        });

        // Recenter on resize
        window.addEventListener('resize', () => {
            const idx = getClosestIndexToCenter();
            centerCard(idx);
        });

        // Auto-advance every 3.5s nonstop
        let autoTimer = null;

        function getCurrentCenteredIndex() { return currentIndex; }

        function nextAuto() {
            const current = getCurrentCenteredIndex();
            const next = (current + 1) % cards.length;
            centerCard(next);
        }

        function startAuto() {
            stopAuto();
            if (!prefersReduced) {
                autoTimer = setInterval(nextAuto, 3500);
            }
        }

        function stopAuto() {
            if (autoTimer) {
                clearInterval(autoTimer);
                autoTimer = null;
            }
        }

        // No pause on hover/touch: continuous autoplay

        // Initial center to first real card and start auto
        setTimeout(() => {
            centerCard(currentIndex, 'auto');
            startAuto();
        }, 0);
    })();

    // Smooth scrolling for CTA button
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', function(e) {
            e.preventDefault();
            const pricingSection = document.querySelector('.pricing');
            if (pricingSection) {
                pricingSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }

    // Pricing button interactions
    const pricingButtons = document.querySelectorAll('.pricing-button');
    pricingButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const planName = this.closest('.pricing-card').querySelector('h3').textContent;
            
            // Add a simple click animation
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);

            // Show a simple alert (in a real app, this would redirect to signup)
            alert(`Thank you for your interest in the ${planName} plan! This would redirect to our signup page.`);
        });
    });

    // Add hover effects for social links
    const socialLinks = document.querySelectorAll('.social-link');
    socialLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.1)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Parallax effect for hero section
    if (!prefersReduced && window.innerWidth > 768) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const hero = document.querySelector('.hero');
            if (hero) {
                const rate = scrolled * -0.5;
                hero.style.transform = `translateY(${rate}px)`;
            }
        });
    }

    // Add loading animation
    window.addEventListener('load', function() {
        document.body.classList.add('loaded');
    });

    // Mobile menu toggle (if needed in future)
    function createMobileMenu() {
        const nav = document.createElement('nav');
        nav.className = 'mobile-nav';
        nav.innerHTML = `
            <div class="mobile-nav-toggle">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <ul class="mobile-nav-menu">
                <li><a href="#features">Features</a></li>
                <li><a href="#reviews">Reviews</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        `;
        
        // Add mobile nav styles
        const style = document.createElement('style');
        style.textContent = `
            .mobile-nav {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: rgba(102, 126, 234, 0.95);
                backdrop-filter: blur(10px);
                z-index: 1000;
                padding: 15px 20px;
            }
            
            .mobile-nav-toggle {
                display: flex;
                flex-direction: column;
                cursor: pointer;
                width: 30px;
                height: 25px;
                justify-content: space-between;
            }
            
            .mobile-nav-toggle span {
                display: block;
                height: 3px;
                background: white;
                border-radius: 2px;
                transition: all 0.3s ease;
            }
            
            .mobile-nav-menu {
                display: none;
                list-style: none;
                margin-top: 20px;
            }
            
            .mobile-nav-menu li {
                margin-bottom: 15px;
            }
            
            .mobile-nav-menu a {
                color: white;
                text-decoration: none;
                font-weight: 500;
                transition: color 0.3s ease;
            }
            
            .mobile-nav-menu a:hover {
                color: #ff6b6b;
            }
            
            @media (max-width: 768px) {
                .mobile-nav {
                    display: block;
                }
            }
        `;
        document.head.appendChild(style);
        document.body.insertBefore(nav, document.body.firstChild);
    }

    // Initialize mobile menu for smaller screens
    if (window.innerWidth <= 768) {
        createMobileMenu();
    }

    // Tap-to-flip for review cards on touch/coarse pointers
    const isTouchCapable = ("ontouchstart" in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);
    if (isTouchCapable) {
        const reviewCards = document.querySelectorAll('.review-card.flip-card');
        reviewCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Avoid toggling when clicking interactive elements
                const tag = e.target.tagName.toLowerCase();
                if (tag === 'a' || tag === 'button') return;
                card.classList.toggle('flip');
            });
        });
    }

    // Add scroll-to-top functionality
    const scrollToTopButton = document.createElement('button');
    scrollToTopButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
    scrollToTopButton.className = 'scroll-to-top';
    scrollToTopButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    `;
    
    document.body.appendChild(scrollToTopButton);

    // Show/hide scroll to top button
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollToTopButton.style.opacity = '1';
            scrollToTopButton.style.visibility = 'visible';
        } else {
            scrollToTopButton.style.opacity = '0';
            scrollToTopButton.style.visibility = 'hidden';
        }
    });

    // Scroll to top functionality
    scrollToTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Add typing effect to hero title
    function typeWriter(element, text, speed = 100) {
        let i = 0;
        element.innerHTML = '';
        
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        type();
    }

    // Apply typing effect to hero title
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        setTimeout(() => {
            typeWriter(heroTitle, originalText, 150);
        }, 500);
    }

    // Add counter animation for pricing
    function animateCounters() {
        const counters = document.querySelectorAll('.amount');
        counters.forEach(counter => {
            const target = parseInt(counter.textContent);
            const increment = target / 50;
            let current = 0;
            
            const updateCounter = () => {
                if (current < target) {
                    current += increment;
                    counter.textContent = Math.ceil(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                }
            };
            
            updateCounter();
        });
    }

    // Trigger counter animation when pricing section is visible
    const pricingObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                pricingObserver.unobserve(entry.target);
            }
        });
    });

    const pricingSection = document.querySelector('.pricing');
    if (pricingSection) {
        pricingObserver.observe(pricingSection);
    }
});
