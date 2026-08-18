# uhsstem
# UHS STEM Academy Website and Inventory Management

This is the repository for the STEM Academy Website and Inventory Management system.

## Project Overview

This website serves as the primary hub for our club, allowing us to:
* **Coordinate schedules**
* **Communicate our mission**
* **Simplify inventory requests and overall management**
* **Connect with students, parents, and volunteers**
  
### Key Features

* **Dual-View Academy Schedule and Calendar**:
* **Display Contact Info**
* **Request Materials**: Simplify material requests into one form
* **Interactive Spreadsheet**: Auto-populate material requests into classroom tabs - Archive and purge past inventory requests for future reference
* **Responsive Design**: The site is fully optimized to look great on both desktop and mobile devices, featuring a "Dark Mode" aesthetic achieved through custom CSS filtering.

## Technical Stack

* **HTML5**: Used for semantic structuring of the home, contact, and leadership pages.
* **CSS3**: Includes custom variables for consistent branding, Flexbox for side-by-side calendar layouts, and Media Queries to ensure mobile responsiveness.
* **Google Calendar API**: Integrates live scheduling data directly into our interface for real-time updates.
* **Google Scripts**
* **Google Sheets**

## Layout Structure

The home page utilizes a specific container ID (`#calendar-section`) to apply specialized styling to our dual-calendar layout. This ensures that styling rules remain isolated and do not conflict with other pages, such as the Leaders Hub.
