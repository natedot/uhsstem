# uhsstem
# UHS STEM Academy Outreach Club

Welcome to the official repository for the **Union High School STEM Academy Outreach Club** website. Our mission is to inspire the next generation of innovators by partnering with local elementary schools to deliver hands-on science, technology, engineering, and math experiences.

## Project Overview

This website serves as the primary hub for our club, allowing us to coordinate schedules, communicate our mission, and connect with students, parents, and volunteers.

### Key Features

* **Outreach Mission**: Clearly defines our goal to make complex STEM concepts accessible and exciting for young learners.
* **Dual-View Academy Schedule**:
* **Monthly Calendar**: Provides a high-level view of upcoming events and workshops.
* **Agenda View**: Offers a streamlined, chronological list of specific event details for quick reference.


* **Responsive Design**: The site is fully optimized to look great on both desktop and mobile devices, featuring a "Dark Mode" aesthetic achieved through custom CSS filtering.
* **Leadership Portal**: A dedicated area for club members to manage project materials and requests.

## Technical Stack

* **HTML5**: Used for semantic structuring of the home, contact, and leadership pages.
* **CSS3**: Includes custom variables for consistent branding, Flexbox for side-by-side calendar layouts, and Media Queries to ensure mobile responsiveness.
* **Google Calendar API**: Integrates live scheduling data directly into our interface for real-time updates.

## Getting Started

To view or contribute to the site:

1. **Clone the repository**: `git clone [repository-url]`
2. **Run locally**: Open `index.html` in any modern web browser.
3. **Customization**: To update the calendar, simply replace the `src` URL within the `iframe` elements inside the `#calendar-section` div in `index.html`.

## Layout Structure

The home page utilizes a specific container ID (`#calendar-section`) to apply specialized styling to our dual-calendar layout. This ensures that styling rules remain isolated and do not conflict with other pages, such as the Leaders Hub.