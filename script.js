// Mobile hamburger menu (loaded with `defer` on every page, so the DOM is ready)
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');

function setMenu(open) {
    hamburger.classList.toggle('active', open);
    navMenu.classList.toggle('active', open);
    document.body.classList.toggle('no-scroll', open);
}

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => setMenu(!navMenu.classList.contains('active')));

    // Close the menu when a link is tapped
    navMenu.addEventListener('click', e => {
        if (e.target.closest('a')) setMenu(false);
    });
}

// Home page: photo slideshow that slides to the next photo every few seconds
const slideshow = document.getElementById('slideshow');
const slides = slideshow ? slideshow.querySelectorAll('.slides img') : [];
if (slides.length > 1) {
    const track = slideshow.querySelector('.slides');
    const dots = document.createElement('div');
    dots.className = 'slide-dots';
    let current = 0;
    let timer;
    let hovering = false;
    let pageLoaded = false;

    // Only the photo after the current one is fetched ahead of time, so visitors who don't stay don't download them all
    const preload = i => {
        const img = slides[i % slides.length];
        if (!img.dataset.src) return;
        img.srcset = img.dataset.srcset;
        img.src = img.dataset.src;
        delete img.dataset.src;
    };

    function showSlide(i) {
        current = (i + slides.length) % slides.length;
        track.style.transform = `translateX(-${current * 100}%)`;
        dots.querySelectorAll('button').forEach((d, n) => d.setAttribute('aria-current', n === current));
        preload(current); // in case someone jumps straight to a photo with the dots
        if (pageLoaded) preload(current + 1);
    }

    function restartTimer() {
        clearInterval(timer);
        // Skip turns while the tab is in the background
        if (!hovering) timer = setInterval(() => { if (!document.hidden) showSlide(current + 1); }, 4000);
    }

    slides.forEach((img, n) => {
        const dot = document.createElement('button');
        dot.setAttribute('aria-label', `Show photo ${n + 1}`);
        dot.addEventListener('click', () => { showSlide(n); restartTimer(); });
        dots.appendChild(dot);
    });
    slideshow.appendChild(dots);

    // Previous / next arrows on the sides (they fade in when hovering over the photos)
    [['prev', 'Previous photo', '\u2039', -1], ['next', 'Next photo', '\u203A', 1]].forEach(([cls, label, symbol, step]) => {
        const arrow = document.createElement('button');
        arrow.className = `slide-arrow ${cls}`;
        arrow.setAttribute('aria-label', label);
        arrow.textContent = symbol;
        arrow.addEventListener('click', () => { showSlide(current + step); restartTimer(); });
        slideshow.appendChild(arrow);
    });

    // Pause while the mouse is over the photos
    slideshow.addEventListener('mouseenter', () => { hovering = true; clearInterval(timer); });
    slideshow.addEventListener('mouseleave', () => { hovering = false; restartTimer(); });

    window.addEventListener('load', () => { pageLoaded = true; preload(current + 1); });

    showSlide(0);
    restartTimer();
}

// Home page: Google Calendar is heavy, so it only loads once the visitor scrolls close to it
const calendars = document.querySelectorAll('iframe[data-src]');
const loadCalendar = frame => { frame.src = frame.dataset.src; frame.removeAttribute('data-src'); };
if ('IntersectionObserver' in window) {
    const watcher = new IntersectionObserver(entries => entries.forEach(e => {
        if (e.isIntersecting) { loadCalendar(e.target); watcher.unobserve(e.target); }
    }));
    calendars.forEach(frame => watcher.observe(frame));
} else {
    calendars.forEach(loadCalendar);
}
