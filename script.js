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
