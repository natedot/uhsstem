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

// Leaders Hub: resize the form iframe to fit the form, so there's no scroll box inside the page.
// The Apps Script form sends its height with postMessage whenever it changes.
const formFrame = document.getElementById('form-frame');
if (formFrame) {
    window.addEventListener('message', e => {
        if (!/^https:\/\/[\w-]+\.googleusercontent\.com$/.test(e.origin)) return;
        if (e.data && e.data.type === 'uhs-form-height') {
            formFrame.style.height = Math.min(Math.max(Number(e.data.height) || 0, 300), 6000) + 'px';
        }
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

    function showSlide(i) {
        current = (i + slides.length) % slides.length;
        track.style.transform = `translateX(-${current * 100}%)`;
        dots.querySelectorAll('button').forEach((d, n) => d.setAttribute('aria-current', n === current));
    }

    function restartTimer() {
        clearInterval(timer);
        timer = setInterval(() => showSlide(current + 1), 4000);
    }

    slides.forEach((img, n) => {
        const dot = document.createElement('button');
        dot.setAttribute('aria-label', `Show photo ${n + 1}`);
        dot.addEventListener('click', () => { showSlide(n); restartTimer(); });
        dots.appendChild(dot);
    });
    slideshow.appendChild(dots);

    // Pause while the mouse is over the photos
    slideshow.addEventListener('mouseenter', () => clearInterval(timer));
    slideshow.addEventListener('mouseleave', restartTimer);

    showSlide(0);
    restartTimer();
}
