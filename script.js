// This file is linked to all HTML pages.
// You can add interactive elements here later.

document.addEventListener('DOMContentLoaded', () => {
    console.log("UHS STEM Academy website scripts loaded successfully.");
    
    // Future code for mobile menu toggles or form validations can go here.
});

document.addEventListener("DOMContentLoaded", () => {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    if (hamburger && navMenu) {
        // Toggle the menu when the hamburger is clicked
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
        });

        // Close the menu automatically if a link is clicked
        document.querySelectorAll('nav ul li a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                document.body.classList.remove('no-scroll');
            });
        });
    }
});