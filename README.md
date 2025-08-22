# FTA Grant Database

A modern, responsive web application for searching and exploring Federal Transit Administration grant awards. Built with vanilla JavaScript and powered by Supabase.

**Live Demo:** [ftagrants.com](https://ftagrants.com)

## Features

- **Smart Search** - Server-side search across 2,200+ federal transit grants
- **Advanced Filtering** - Filter by year, program type, and funding amount
- **Email Capture** - Lead generation with database storage
- **CSV Export** - Download filtered results with date stamps
- **Infinite Scroll** - Smooth pagination loading 6 grants at a time
- **Dark Mode** - Toggle between light and dark themes
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Real-time Search** - Instant results with optimized database queries

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript ES6+
- **Backend:** Supabase (PostgreSQL database, real-time APIs)
- **Styling:** Modern glassmorphism design with CSS custom properties
- **Hosting:** Netlify with automatic deployments
- **Icons:** Lucide React icon library

## Project Structure

```
fta-grants/
├── index.html          # Main application HTML
├── styles.css          # Glassmorphism styling and responsive design
├── script.js           # Application logic and Supabase integration
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites
- Modern web browser with JavaScript enabled
- Internet connection (for CDN resources and database)

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/levimccollum/fta-grants.git
   cd fta-grants
   ```

2. Open `index.html` in your browser or serve with a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. Navigate to `http://localhost:8000`

## Database Schema

The application uses Supabase with the following main tables:

### `grants` table
- `id` (bigint, primary key)
- `fiscal_year` (integer) - Grant fiscal year
- `opportunity_id` (text) - Unique FTA opportunity identifier
- `grant_program` (text) - Program type/category
- `project_sponsor` (text) - Organization receiving the grant
- `project_description` (text) - Detailed project description
- `funding` (bigint) - Grant amount in dollars
- `created_at` (timestamp) - Record creation time

### `emails` table
- `id` (bigint, primary key)
- `email` (text) - Captured email address
- `created_at` (timestamp) - Capture timestamp

## Key Features Implementation

### Smart Loading System
- Loads only relevant grants based on search queries
- Server-side filtering to work within Supabase free tier limits
- Optimized database functions for filter options

### Email Capture
- Modal-based email collection before CSV downloads
- Email validation and database storage
- Privacy-focused with minimal data collection

### Advanced Search
- Full-text search across multiple grant fields
- Pill-based filtering for years and programs
- Funding range filtering with numeric inputs

### Performance Optimizations
- Lazy loading with infinite scroll
- Efficient database queries with proper indexing
- Minimal payload with selective field loading

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## Development Notes

### Supabase Configuration
The application connects to Supabase using environment-specific configuration. Row Level Security (RLS) policies ensure data access control:

- `grants` table: Public read access for search functionality
- `emails` table: Public insert access for lead capture

### Database Functions
Custom PostgreSQL functions for efficient filter loading:
- `get_distinct_years()` - Returns all unique fiscal years
- `get_distinct_programs()` - Returns all unique grant programs

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Data Source

Grant data sourced from the Federal Transit Administration's publicly available grant databases. Data is updated periodically to reflect new grant awards.

## Contact

**Levi McCollum**
- Portfolio: [levimccollum.com](https://levimccollum.com)
- GitHub: [@levimccollum](https://github.com/levimccollum)
- Email: [contact@levimccollum.com](mailto:contact@levimccollum.com)

## Acknowledgments

- Federal Transit Administration for public grant data
- Supabase for backend infrastructure
- Lucide for icon library
- Netlify for hosting platform