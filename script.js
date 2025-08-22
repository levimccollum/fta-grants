/**
 * FTA Grant Database - JavaScript
 * Handles search, filtering, pagination, and UI interactions
 */

// ============================================================================
// SUPABASE CONFIGURATION
// ============================================================================

// Initialize Supabase client
const supabaseUrl = 'https://hyhuogmwgdxwuprnwvqt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5aHVvZ213Z2R4d3Vwcm53dnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MDE3ODQsImV4cCI6MjA3MTI3Nzc4NH0.4ybMoZ9vCZCr721iOyqbZErZvO5TZg7clXohNFVbyms';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ============================================================================
// DATA AND CONFIGURATION
// ============================================================================

// Live grant data from Supabase
let sampleGrants = []; // Will be populated from database

// Configuration
const CONFIG = {
    GRANTS_PER_PAGE: 6,
    LOADING_DELAY: 300, // ms
    SCROLL_THRESHOLD: 200 // px from bottom to trigger loading
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

// Application state
const state = {
    currentGrants: [...sampleGrants],
    displayedGrants: [],
    currentPage: 0,
    isSearchActive: false,
    isLoading: false
};

// DOM element references
const elements = {
    initialState: null,
    resultsArea: null,
    searchInput: null,
    grantsContainer: null,
    resultsCount: null,
    modal: null,
    modalClose: null,
    filterModal: null,
    filterModalClose: null,
    filterButton: null,
    applyFiltersBtn: null,
    clearFiltersBtn: null,
    loadingIndicator: null
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format a number as currency (USD)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Generate filename with current date
 * @returns {string} Filename with date
 */
function generateDateFilename() {
    const today = new Date();
    const dateStr = today.getFullYear() + '-' + 
                   String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(today.getDate()).padStart(2, '0');
    return `fta-grants-${dateStr}.csv`;
}

/**
 * Escape CSV values properly
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCSVValue(value) {
    return `"${String(value).replace(/"/g, '""')}"`;
}

/**
 * Load all unique filter options using database functions
 * @returns {Promise<Object>} Object with years and programs arrays
 */
async function loadFilterOptions() {
    try {
        console.log('Loading filter options from Supabase...');
        
        // Get distinct years using database function
        const { data: yearData, error: yearError } = await supabase
            .rpc('get_distinct_years');
        
        // Get distinct programs using database function
        const { data: programData, error: programError } = await supabase
            .rpc('get_distinct_programs');
        
        if (yearError || programError) {
            console.error('Error loading filter options:', yearError || programError);
            return { years: [], programs: [] };
        }
        
        // Extract values
        const years = yearData.map(item => item.fiscal_year);
        const programs = programData.map(item => item.grant_program);
        
        console.log(`Loaded ${years.length} years and ${programs.length} programs for filters`);
        return { years, programs };
        
    } catch (err) {
        console.error('Error loading filter options:', err);
        return { years: [], programs: [] };
    }
}

/**
 * Load grants from Supabase with search and filters
 * @param {string} searchQuery - Search term
 * @param {Object} filters - Filter options
 * @param {number} limit - Number of grants to load
 * @returns {Promise<Array>} Array of grants
 */
async function loadGrantsFromSupabase(searchQuery = '', filters = {}, limit = 1000) {
    try {
        console.log('Searching grants in Supabase...');
        
        let query = supabase
            .from('grants')
            .select('*')
            .order('fiscal_year', { ascending: false });
        
        // Apply search filter on server-side
        if (searchQuery.trim()) {
            const searchTerm = searchQuery.trim();
            query = query.or(`project_sponsor.ilike.%${searchTerm}%,grant_program.ilike.%${searchTerm}%,project_description.ilike.%${searchTerm}%,opportunity_id.ilike.%${searchTerm}%`);
        }
        
        // Apply year filter
        if (filters.years && filters.years.length > 0) {
            query = query.in('fiscal_year', filters.years);
        }
        
        // Apply program filter
        if (filters.programs && filters.programs.length > 0) {
            query = query.in('grant_program', filters.programs);
        }
        
        // Apply funding range filters
        if (filters.fundingMin !== null && filters.fundingMin !== undefined && !isNaN(filters.fundingMin)) {
            query = query.gte('funding', parseInt(filters.fundingMin));
        }

        if (filters.fundingMax !== null && filters.fundingMax !== undefined && !isNaN(filters.fundingMax)) {
            query = query.lte('funding', parseInt(filters.fundingMax));
        }
        
        // Apply limit
        query = query.limit(limit);
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Error loading grants:', error);
            return [];
        }
        
        console.log(`Found ${data.length} grants matching criteria`);
        return data;
    } catch (err) {
        console.error('Database error:', err);
        return [];
    }
}

// ============================================================================
// FILTER MANAGEMENT
// ============================================================================

/**
 * Toggle active state of filter pill
 */
function togglePill() {
    this.classList.toggle('active');
}

/**
 * Populate filter pills with all available options
 */
async function populateFilters() {
    const yearPills = document.getElementById('yearPills');
    const programPills = document.getElementById('programPills');
    
    if (!yearPills || !programPills) {
        console.warn('Filter containers not found');
        return;
    }
    
    // Load all filter options from database
    const { years, programs } = await loadFilterOptions();
    
    // Create year pills
    yearPills.innerHTML = '';
    years.forEach(year => {
        const pill = createFilterPill(year, year, 'year');
        yearPills.appendChild(pill);
    });
    
    // Create program pills
    programPills.innerHTML = '';
    programs.forEach(program => {
        const pill = createFilterPill(program, program, 'program');
        programPills.appendChild(pill);
    });
    
    console.log(`Populated ${years.length} years and ${programs.length} programs`);
}

/**
 * Create a filter pill element
 * @param {string} text - Display text
 * @param {string} value - Value for filtering
 * @param {string} type - Type of filter (year/program)
 * @returns {HTMLElement} Filter pill element
 */
function createFilterPill(text, value, type) {
    const pill = document.createElement('div');
    pill.className = 'filter-pill';
    pill.textContent = text;
    pill.dataset.value = value;
    pill.dataset.type = type;
    pill.addEventListener('click', togglePill);
    return pill;
}

/**
 * Clear all active filters
 */
function clearFilters() {
    // Clear pill selections
    document.querySelectorAll('.filter-pill.active').forEach(pill => {
        pill.classList.remove('active');
    });
    
    // Clear funding range inputs
    const fundingMin = document.getElementById('fundingMin');
    const fundingMax = document.getElementById('fundingMax');
    if (fundingMin) fundingMin.value = '';
    if (fundingMax) fundingMax.value = '';
}

/**
 * Get currently active filter values
 * @returns {Object} Active filter values
 */
function getActiveFilters() {
    const activeYears = Array.from(document.querySelectorAll('.filter-pill[data-type="year"].active'))
        .map(pill => parseInt(pill.dataset.value));
    
    const activePrograms = Array.from(document.querySelectorAll('.filter-pill[data-type="program"].active'))
        .map(pill => pill.dataset.value);
    
    const fundingMin = document.getElementById('fundingMin');
    const fundingMax = document.getElementById('fundingMax');
    
    return {
        years: activeYears,
        programs: activePrograms,
        fundingMin: fundingMin?.value ? parseFloat(fundingMin.value) : null,
        fundingMax: fundingMax?.value ? parseFloat(fundingMax.value) : null
    };
}

// ============================================================================
// SEARCH AND FILTERING
// ============================================================================

/**
 * This function is now simplified since filtering happens on server-side
 * @param {string} searchQuery - Search term  
 * @param {Object} filters - Active filter values
 * @returns {Array} Current grants (already filtered from server)
 */
function filterGrants(searchQuery = '', filters = {}) {
    // Since we're doing server-side filtering, we just return current grants
    // The actual filtering happens in loadGrantsFromSupabase
    return state.currentGrants;
}

/**
 * Perform search with server-side filtering
 * @param {string} query - Search query
 */
async function searchGrants(query) {
    if (!query.trim()) {
        alert('Please enter a search term');
        return;
    }
    
    // Show loading state
    if (elements.loadingIndicator) {
        elements.loadingIndicator.classList.add('visible');
    }
    
    const filters = getActiveFilters();
    
    // Load grants from server with search and filters
    const grants = await loadGrantsFromSupabase(query, filters, 1000);
    
    // Update state
    state.currentGrants = grants;
    
    // Hide loading state
    if (elements.loadingIndicator) {
        elements.loadingIndicator.classList.remove('visible');
    }
    
    showResults();
    displayGrants(state.currentGrants, true);
}

/**
 * Apply filters and show results with server-side filtering
 */
async function applyFiltersAndSearch() {
    const query = elements.searchInput?.value.trim() || '';
    const filters = getActiveFilters();
    
    // Show loading state
    if (elements.loadingIndicator) {
        elements.loadingIndicator.classList.add('visible');
    }
    
    // Load grants from server with search and filters
    const grants = await loadGrantsFromSupabase(query, filters, 1000);
    
    // Update state
    state.currentGrants = grants;
    
    // Hide loading state
    if (elements.loadingIndicator) {
        elements.loadingIndicator.classList.remove('visible');
    }
    
    showResults();
    displayGrants(state.currentGrants, true);
}

// ============================================================================
// DISPLAY AND PAGINATION
// ============================================================================

/**
 * Create HTML for a grant card
 * @param {Object} grant - Grant data
 * @param {number} index - Grant index
 * @returns {string} HTML string
 */
function createGrantCard(grant, index) {
    return `
        <div class="grant-card" data-grant-index="${index}">
            <div class="grant-header">
                <div class="grant-sponsor">${grant.project_sponsor}</div>
                <div class="grant-year">${grant.fiscal_year}</div>
            </div>
            <div class="grant-program">${grant.grant_program}</div>
            <div class="grant-description">${grant.project_description}</div>
            <div class="grant-footer">
                <div class="grant-funding">${formatCurrency(parseInt(grant.funding))}</div>
                <div class="grant-id">${grant.opportunity_id}</div>
            </div>
        </div>
    `;
}

/**
 * Display grants with lazy loading
 * @param {Array} grants - Grants to display
 * @param {boolean} reset - Whether to reset pagination
 */
function displayGrants(grants, reset = true) {
    if (!elements.grantsContainer || !elements.resultsCount) return;
    
    if (reset) {
        // Reset pagination state
        state.displayedGrants = [];
        state.currentPage = 0;
        elements.grantsContainer.innerHTML = '';
    }
    
    state.currentGrants = grants;
    
    if (grants.length === 0) {
        elements.grantsContainer.innerHTML = '<div class="no-results">No grants found matching your criteria.</div>';
        elements.resultsCount.textContent = 'No grants found';
        return;
    }
    
    // Load first batch
    loadMoreGrants();
}

/**
 * Load more grants (lazy loading implementation)
 */
function loadMoreGrants() {
    if (state.isLoading) return;
    
    const startIndex = state.currentPage * CONFIG.GRANTS_PER_PAGE;
    const endIndex = Math.min(startIndex + CONFIG.GRANTS_PER_PAGE, state.currentGrants.length);
    
    if (startIndex >= state.currentGrants.length) return;
    
    state.isLoading = true;
    
    // Show loading indicator
    if (elements.loadingIndicator) {
        elements.loadingIndicator.classList.add('visible');
    }
    
    // Simulate loading delay for better UX
    setTimeout(() => {
        const newGrants = state.currentGrants.slice(startIndex, endIndex);
        
        // Add new grant cards to DOM
        newGrants.forEach((grant, index) => {
            const globalIndex = startIndex + index;
            const cardHTML = createGrantCard(grant, globalIndex);
            elements.grantsContainer.insertAdjacentHTML('beforeend', cardHTML);
            
            // Add click listener to new card
            const newCard = elements.grantsContainer.lastElementChild;
            if (newCard) {
                newCard.addEventListener('click', () => openGrantModal(grant));
            }
        });
        
        // Update state
        state.displayedGrants = state.displayedGrants.concat(newGrants);
        state.currentPage++;
        state.isLoading = false;
        
        // Hide loading indicator
        if (elements.loadingIndicator) {
            elements.loadingIndicator.classList.remove('visible');
        }
        
        // Update results count
        updateResultsCount();
        
    }, CONFIG.LOADING_DELAY);
}

/**
 * Update the results count display
 */
function updateResultsCount() {
    if (!elements.resultsCount) return;
    
    const total = state.currentGrants.length;
    const displayed = state.displayedGrants.length;
    
    if (displayed >= total) {
        elements.resultsCount.textContent = `${total} grant${total !== 1 ? 's' : ''} found`;
    } else {
        elements.resultsCount.textContent = `Showing ${displayed} of ${total} grant${total !== 1 ? 's' : ''}`;
    }
}

/**
 * Show the results area and hide initial state
 */
function showResults() {
    if (state.isSearchActive) return;
    
    if (elements.initialState && elements.resultsArea) {
        elements.initialState.classList.add('hidden');
        elements.resultsArea.classList.add('visible');
        state.isSearchActive = true;
        
        // Hide suggestions
        const suggestions = document.getElementById('suggestions');
        if (suggestions) {
            suggestions.classList.add('hidden');
        }
    }
}

/**
 * Return to initial search state
 */
function returnToSearch() {
    if (elements.searchInput) elements.searchInput.value = '';
    
    if (elements.resultsArea) elements.resultsArea.classList.remove('visible');
    if (elements.initialState) elements.initialState.classList.remove('hidden');
    
    state.isSearchActive = false;
    
    // Show suggestions again
    const suggestions = document.getElementById('suggestions');
    if (suggestions) {
        suggestions.classList.remove('hidden');
    }
    
    clearFilters();
    
    if (elements.searchInput) elements.searchInput.focus();
}

// ============================================================================
// INFINITE SCROLL
// ============================================================================

/**
 * Setup infinite scroll event listener
 */
function setupInfiniteScroll() {
    window.addEventListener('scroll', function() {
        if (state.isLoading || state.displayedGrants.length >= state.currentGrants.length) {
            return;
        }
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        // Load more when user is near bottom
        if (scrollTop + windowHeight >= documentHeight - CONFIG.SCROLL_THRESHOLD) {
            loadMoreGrants();
        }
    });
}

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================

/**
 * Open grant detail modal
 * @param {Object} grant - Grant data to display
 */
function openGrantModal(grant) {
    if (!elements.modal) return;
    
    // Populate modal fields
    const modalFields = {
        modalSponsor: grant.project_sponsor,
        modalProgram: grant.grant_program,
        modalYear: grant.fiscal_year,
        modalId: grant.opportunity_id,
        modalFunding: formatCurrency(parseInt(grant.funding)),
        modalDescription: grant.project_description
    };
    
    Object.entries(modalFields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
    
    // Show modal
    elements.modal.classList.add('visible');
    document.body.style.overflow = 'hidden';
    
    // Re-initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Close grant detail modal
 */
function closeGrantModal() {
    if (!elements.modal) return;
    elements.modal.classList.remove('visible');
    document.body.style.overflow = '';
}

/**
 * Open filter modal
 */
function openFilterModal() {
    if (!elements.filterModal) return;
    
    // Populate filters when opening
    populateFilters();
    
    elements.filterModal.classList.add('visible');
    document.body.style.overflow = 'hidden';
    
    // Re-initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Close filter modal
 */
function closeFilterModal() {
    if (!elements.filterModal) return;
    elements.filterModal.classList.remove('visible');
    document.body.style.overflow = '';
}

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Export current grants to CSV file (opens email capture modal)
 */
function exportToCSV() {
    if (state.currentGrants.length === 0) {
        alert('No grants to export. Please perform a search first.');
        return;
    }
    
    // Open email capture modal instead of direct download
    openEmailModal();
}

/**
 * Open email capture modal
 */
function openEmailModal() {
    const emailModal = document.getElementById('emailModal');
    if (!emailModal) return;
    
    emailModal.classList.add('visible');
    document.body.style.overflow = 'hidden';
    
    // Focus on email input
    const emailInput = document.getElementById('emailInput');
    if (emailInput) {
        setTimeout(() => emailInput.focus(), 100);
    }
    
    // Re-initialize icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * Close email capture modal
 */
function closeEmailModal() {
    const emailModal = document.getElementById('emailModal');
    if (!emailModal) return;
    
    emailModal.classList.remove('visible');
    document.body.style.overflow = '';
    
    // Clear the email input
    const emailInput = document.getElementById('emailInput');
    if (emailInput) {
        emailInput.value = '';
    }
}

/**
 * Actually perform the CSV download after email is captured
 */
async function performCSVDownload(email) {
    // Validate email before proceeding
    if (!email || !email.trim()) {
        alert('Please enter your email address.');
        return;
    }
    
    if (!isValidEmail(email)) {
        alert('Please enter a valid email address.');
        return;
    }
    
    // Save email to Supabase database
    try {
        const { data, error } = await supabase
            .from('emails')
            .insert([{ email: email.trim() }]);
        
        if (error) {
            console.error('Error saving email:', error);
        } else {
            console.log('Email saved successfully:', email.trim());
        }
    } catch (err) {
        console.error('Database error:', err);
    }
    
    // Define CSV headers
    const headers = [
        'Fiscal Year',
        'Opportunity ID', 
        'Grant Program',
        'Project Sponsor',
        'Funding Amount',
        'Project Description'
    ];
    
    // Convert grants to CSV rows
    const csvRows = [
        headers.join(','),
        ...state.currentGrants.map(grant => [
            grant.fiscal_year,
            escapeCSVValue(grant.opportunity_id),
            escapeCSVValue(grant.grant_program),
            escapeCSVValue(grant.project_sponsor),
            parseInt(grant.funding),
            escapeCSVValue(grant.project_description)
        ].join(','))
    ];
    
    // Create and download file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', generateDateFilename());
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Close the modal
    closeEmailModal();
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Search functionality
    if (elements.searchInput) {
        elements.searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchGrants(e.target.value);
            }
        });
    }
    
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const query = elements.searchInput?.value || '';
            searchGrants(query);
        });
    }
    
    // Suggestion buttons
    document.querySelectorAll('.suggestion-button').forEach(button => {
        button.addEventListener('click', function() {
            const query = this.getAttribute('data-query');
            if (elements.searchInput) {
                elements.searchInput.value = query;
                searchGrants(query);
            }
        });
    });
    
    // Back button
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', returnToSearch);
    }
    
    // Filter modal
    if (elements.filterButton) {
        elements.filterButton.addEventListener('click', openFilterModal);
    }
    
    if (elements.filterModalClose) {
        elements.filterModalClose.addEventListener('click', closeFilterModal);
    }
    
    if (elements.filterModal) {
        elements.filterModal.addEventListener('click', function(e) {
            if (e.target === elements.filterModal) {
                closeFilterModal();
            }
        });
    }
    
    // Grant modal
    if (elements.modalClose) {
        elements.modalClose.addEventListener('click', closeGrantModal);
    }
    
    if (elements.modal) {
        elements.modal.addEventListener('click', function(e) {
            if (e.target === elements.modal) {
                closeGrantModal();
            }
        });
    }
    
    // Export functionality
    const exportButton = document.getElementById('exportButton');
    if (exportButton) {
        exportButton.addEventListener('click', exportToCSV);
    }
    
    // Filter actions
    if (elements.clearFiltersBtn) {
        elements.clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    if (elements.applyFiltersBtn) {
        elements.applyFiltersBtn.addEventListener('click', function() {
            applyFiltersAndSearch();
            closeFilterModal();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (document.getElementById('emailModal')?.classList.contains('visible')) {
                closeEmailModal();
            } else if (elements.filterModal?.classList.contains('visible')) {
                closeFilterModal();
            } else if (elements.modal?.classList.contains('visible')) {
                closeGrantModal();
            }
        }
    });
    
    // Dark mode toggle
    setupDarkModeToggle();

    // Email modal event listeners
    const emailModal = document.getElementById('emailModal');
    const emailModalClose = document.getElementById('emailModalClose');
    const cancelDownloadBtn = document.getElementById('cancelDownloadBtn');
    const emailForm = document.getElementById('emailForm');

    if (emailModalClose) {
        emailModalClose.addEventListener('click', closeEmailModal);
    }

    if (cancelDownloadBtn) {
        cancelDownloadBtn.addEventListener('click', closeEmailModal);
    }

    if (emailModal) {
        emailModal.addEventListener('click', function(e) {
            if (e.target === emailModal) {
                closeEmailModal();
            }
        });
    }

    if (emailForm) {
        emailForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = document.getElementById('emailInput');
            const email = emailInput?.value?.trim();
            
            if (!email) {
                emailInput?.focus();
                return;
            }
            
            if (!isValidEmail(email)) {
                alert('Please enter a valid email address.');
                emailInput?.focus();
                return;
            }
            
            performCSVDownload(email);
        });
    }
}

/**
 * Setup dark mode functionality
 */
function setupDarkModeToggle() {
    const darkToggle = document.getElementById('darkToggle');
    const body = document.body;
    
    if (!darkToggle) return;
    
    // Load saved preference
    if (localStorage.getItem('darkMode') === 'true') {
        body.classList.add('dark');
    }
    
    // Toggle handler
    darkToggle.addEventListener('click', function() {
        body.classList.toggle('dark');
        localStorage.setItem('darkMode', body.classList.contains('dark'));
        
        // Re-initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize DOM element references
 */
function initializeElements() {
    elements.initialState = document.getElementById('initialState');
    elements.resultsArea = document.getElementById('resultsArea');
    elements.searchInput = document.getElementById('searchInput');
    elements.grantsContainer = document.getElementById('grantsContainer');
    elements.resultsCount = document.getElementById('resultsCount');
    elements.modal = document.getElementById('grantModal');
    elements.modalClose = document.getElementById('modalClose');
    elements.filterModal = document.getElementById('filterModal');
    elements.filterModalClose = document.getElementById('filterModalClose');
    elements.filterButton = document.getElementById('filterButton');
    elements.applyFiltersBtn = document.getElementById('applyFiltersBtn');
    elements.clearFiltersBtn = document.getElementById('clearFiltersBtn');
    elements.loadingIndicator = document.getElementById('loading');
}

async function initializeApp() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Get DOM elements
    initializeElements();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup infinite scroll
    setupInfiniteScroll();
    
    // Initial filter population (loads all years/programs)
    await populateFilters();
    
    console.log('FTA Grant Database initialized successfully');
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);