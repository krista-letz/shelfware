// Book data storage
let books = [];

// Edit state tracking
let isEditMode = false;
let editingBookId = null;

// DOM elements
const addBookBtn = document.getElementById('add-book-btn');
const addBookModal = document.getElementById('add-book-modal');
const closeModal = document.querySelector('.close');
const cancelBtn = document.getElementById('cancel-btn');
const addBookForm = document.getElementById('add-book-form');
const booksGrid = document.getElementById('books-grid');
const monthFilter = document.getElementById('month-filter');
const statusFilter = document.getElementById('status-filter');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const themeToggle = document.getElementById('theme-toggle');
const bookDetailsModal = document.getElementById('book-details-modal');
const bookDetailsClose = document.querySelector('.book-details-close');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    // Wait for Firebase to be ready with retry logic
    waitForFirebase();
});

// Wait for Firebase to be initialized with retry
function waitForFirebase() {
    let attempts = 0;
    const maxAttempts = 20;
    
    function checkFirebase() {
        if (window.db && window.firestore) {
            console.log('Firebase is ready, setting up listener...');
            setupFirestoreListener();
        } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkFirebase, 200);
        } else {
            console.error('Firebase failed to initialize after multiple attempts');
            showMessage('Failed to connect to database. Please refresh the page.');
        }
    }
    
    checkFirebase();
}

// Setup Firestore real-time listener
function setupFirestoreListener() {
    if (!window.db || !window.firestore) {
        console.error('Firebase not ready yet');
        return;
    }

    try {
        const { collection, onSnapshot, orderBy, query } = window.firestore;
        const booksCollection = collection(window.db, 'books');
        const booksQuery = query(booksCollection, orderBy('timestamp', 'desc'));

        // Listen for real-time updates
        onSnapshot(booksQuery, (snapshot) => {
            console.log(`Loaded ${snapshot.size} books from Firestore`);
            books = [];
            snapshot.forEach((doc) => {
                books.push({
                    firestoreId: doc.id,
                    ...doc.data()
                });
            });
            displayBooks();
        }, (error) => {
            console.error('Error fetching books:', error);
            showMessage('Error loading books. Please refresh the page.');
        });
    } catch (error) {
        console.error('Error setting up Firestore listener:', error);
        showMessage('Error connecting to database. Please refresh the page.');
    }
}

// Add book to Firestore
async function addBookToFirestore(bookData) {
    try {
        const { collection, addDoc } = window.firestore;
        const booksCollection = collection(window.db, 'books');
        
        const docRef = await addDoc(booksCollection, {
            ...bookData,
            timestamp: new Date()
        });
        
        showMessage('Book added successfully!');
        return docRef;
    } catch (error) {
        console.error('Error adding book:', error);
        showMessage('Error adding book. Please try again.');
    }
}

// Update book in Firestore
async function updateBookInFirestore(bookId, bookData) {
    try {
        const { doc, updateDoc } = window.firestore;
        const bookDoc = doc(window.db, 'books', bookId);
        
        await updateDoc(bookDoc, {
            ...bookData,
            updatedAt: new Date()
        });
        
        showMessage('Book updated successfully!');
    } catch (error) {
        console.error('Error updating book:', error);
        showMessage('Error updating book. Please try again.');
    }
}

// Delete book from Firestore
async function deleteBookFromFirestore(firestoreId) {
    try {
        const { doc, deleteDoc } = window.firestore;
        await deleteDoc(doc(window.db, 'books', firestoreId));
        showMessage('Book deleted successfully!');
    } catch (error) {
        console.error('Error deleting book:', error);
        showMessage('Error deleting book. Please try again.');
    }
}

// Setup event listeners
function setupEventListeners() {
    addBookBtn.addEventListener('click', openModal);
    closeModal.addEventListener('click', closeModalHandler);
    cancelBtn.addEventListener('click', closeModalHandler);
    addBookForm.addEventListener('submit', handleAddBook);
    monthFilter.addEventListener('change', handleFilterChange);
    statusFilter.addEventListener('change', handleFilterChange);
    searchInput.addEventListener('input', handleSearchInput);
    clearSearchBtn.addEventListener('click', clearSearch);
    themeToggle.addEventListener('click', toggleTheme);
    bookDetailsClose.addEventListener('click', closeBookDetails);
    
    // Initialize dark mode
    initializeDarkMode();
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === addBookModal) {
            closeModalHandler();
        }
        if (event.target === bookDetailsModal) {
            closeBookDetails();
        }
    });
}

// Open add book modal
function openModal(bookData = null) {
    // Set edit mode based on whether bookData is provided
    isEditMode = bookData !== null;
    editingBookId = bookData ? bookData.firestoreId : null;
    
    // Update modal title and button text
    const modalTitle = document.querySelector('#add-book-modal h2');
    const submitButton = document.querySelector('#add-book-form button[type="submit"]');
    
    if (isEditMode) {
        modalTitle.textContent = 'Edit Book';
        submitButton.textContent = 'Update Book';
        // Pre-fill form with existing book data
        populateForm(bookData);
    } else {
        modalTitle.textContent = 'Add New Book';
        submitButton.textContent = 'Add Book';
    }
    
    addBookModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Populate form with book data for editing
function populateForm(bookData) {
    document.getElementById('book-title').value = bookData.title || '';
    document.getElementById('book-author').value = bookData.author || '';
    document.getElementById('book-rating').value = bookData.rating || '';
    document.getElementById('book-genre').value = bookData.genre || '';
    document.getElementById('book-status').value = bookData.status || '';
    document.getElementById('book-month').value = bookData.month || '';
    document.getElementById('book-cover').value = bookData.cover || '';
    document.getElementById('book-review').value = bookData.review || '';
}

// Close modal
function closeModalHandler() {
    addBookModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    addBookForm.reset();
    // Reset edit mode
    isEditMode = false;
    editingBookId = null;
}

// Handle form submission (both add and edit)
async function handleAddBook(event) {
    event.preventDefault();
    
    const bookData = {
        title: document.getElementById('book-title').value.trim(),
        author: document.getElementById('book-author').value.trim(),
        rating: parseFloat(document.getElementById('book-rating').value),
        genre: document.getElementById('book-genre').value,
        status: document.getElementById('book-status').value,
        month: document.getElementById('book-month').value,
        cover: document.getElementById('book-cover').value.trim(),
        review: document.getElementById('book-review').value.trim()
    };
    
    if (isEditMode && editingBookId) {
        // Update existing book
        await updateBookInFirestore(editingBookId, bookData);
    } else {
        // Add new book
        await addBookToFirestore(bookData);
    }
    
    // Close modal
    closeModalHandler();
}

// Display books in grid
function displayBooks() {
    const filteredBooks = getFilteredBooks();
    const searchQuery = searchInput.value.toLowerCase().trim();
    const selectedMonth = monthFilter.value;
    const selectedStatus = statusFilter.value;
    
    booksGrid.innerHTML = '';
    
    if (filteredBooks.length === 0) {
        let message = 'No books found';
        if (searchQuery && (selectedMonth !== 'all' || selectedStatus !== 'all')) {
            message += ` for "${searchQuery}" with selected filters.`;
        } else if (searchQuery) {
            message += ` matching "${searchQuery}".`;
        } else if (selectedMonth !== 'all' || selectedStatus !== 'all') {
            message += ' with selected filters.';
        } else {
            message += '. Start building your library by adding your first book!';
        }
        booksGrid.innerHTML = `<p class="no-books">${message}</p>`;
        return;
    }
    
    filteredBooks.forEach((book) => {
        const bookElement = createBookElement(book);
        booksGrid.appendChild(bookElement);
    });
}

// Get filtered books based on month selection, status, and search query
function getFilteredBooks() {
    const selectedMonth = monthFilter.value;
    const selectedStatus = statusFilter.value;
    const searchQuery = searchInput.value.toLowerCase().trim();
    
    let filteredBooks = books;
    
    // Filter by month if not 'all'
    if (selectedMonth !== 'all') {
        filteredBooks = filteredBooks.filter(book => book.month === selectedMonth);
    }
    
    // Filter by status if not 'all'
    if (selectedStatus !== 'all') {
        filteredBooks = filteredBooks.filter(book => book.status === selectedStatus);
    }
    
    // Filter by search query if provided
    if (searchQuery) {
        filteredBooks = filteredBooks.filter(book => 
            book.title.toLowerCase().includes(searchQuery) || 
            book.author.toLowerCase().includes(searchQuery) ||
            (book.genre && book.genre.toLowerCase().includes(searchQuery))
        );
    }
    
    return filteredBooks.sort((a, b) => new Date(b.month) - new Date(a.month));
}

// Create book element
function createBookElement(book) {
    const bookDiv = document.createElement('div');
    bookDiv.className = 'book-item';
    
    const stars = getStarDisplay(book.rating);
    const monthName = formatMonth(book.month);
    
    bookDiv.innerHTML = `
        <div class="book-cover ${book.cover ? 'has-image' : ''}" ${book.cover ? `style="background-image: url('${book.cover}')"` : ''}>
            ${!book.cover ? 'No Cover' : ''}
            <div class="book-actions">
                <button class="edit-btn" onclick="event.stopPropagation(); editBook('${book.firestoreId}');" title="Edit book">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="delete-btn" onclick="event.stopPropagation(); deleteBook('${book.firestoreId}');" title="Delete book">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M10 11v6m4-6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div class="book-hover-details">
                <div class="hover-author">${book.author}</div>
                <div class="hover-genre">${book.genre || 'Genre not specified'}</div>
                <div class="hover-rating">${stars}</div>
                <div class="hover-status ${getStatusClass(book.status)}">${getStatusDisplay(book.status)}</div>
            </div>
        </div>
        <div class="book-title">${book.title}</div>
    `;
    
    // Make book clickable to open details modal
    bookDiv.addEventListener('click', function(event) {
        // Don't open details if clicking on action buttons
        if (event.target.closest('.book-actions')) {
            return;
        }
        openBookDetails(book);
    });
    
    // Add mobile swipe gestures
    addSwipeGestures(bookDiv, book);
    
    return bookDiv;
}

// Generate star display for ratings (including half stars)
function getStarDisplay(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = (rating % 1) === 0.5;
    
    let starDisplay = '⭐'.repeat(fullStars);
    if (hasHalfStar) {
        starDisplay += '💫';
    }
    
    return starDisplay;
}


// Format month for display
function formatMonth(monthStr) {
    const [year, month] = monthStr.split('-');
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// Handle month filter change
function handleFilterChange() {
    displayBooks();
}

// Handle search input
function handleSearchInput() {
    const hasValue = searchInput.value.trim().length > 0;
    clearSearchBtn.style.display = hasValue ? 'flex' : 'none';
    displayBooks();
}

// Clear search input
function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
    displayBooks();
}

// Edit book
function editBook(firestoreId) {
    const book = books.find(b => b.firestoreId === firestoreId);
    if (book) {
        openModal(book);
    }
}

// Delete book with confirmation
function deleteBook(firestoreId) {
    if (confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
        deleteBookFromFirestore(firestoreId);
    }
}

// Show message function (green-themed notification)
function showMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #9FA67A;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 1001;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(159, 166, 122, 0.3);
        font-weight: 500;
    `;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Dark Mode Functions
function initializeDarkMode() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    updateThemeIcon();
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    const isDark = document.body.classList.contains('dark-theme');
    
    if (isDark) {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }
}

// Book Details Modal Functions
function openBookDetails(book) {
    const modalContent = document.getElementById('book-details-content');
    const stars = getStarDisplay(book.rating);
    const monthName = formatMonth(book.month);
    
    modalContent.innerHTML = `
        <div class="book-details-layout">
            <div class="book-details-cover">
                <div class="book-cover-large ${book.cover ? 'has-image' : ''}" ${book.cover ? `style="background-image: url('${book.cover}')"` : ''}>
                    ${!book.cover ? '📖<br>No Cover' : ''}
                </div>
            </div>
            <div class="book-details-info">
                <div class="book-details-header">
                    <h2 class="book-details-title">${book.title}</h2>
                    <p class="book-details-author">by ${book.author}</p>
                </div>
                
                <div class="book-details-meta">
                    <div class="meta-item">
                        <strong>Genre:</strong> ${book.genre || 'Not specified'}
                    </div>
                    <div class="meta-item">
                        <strong>Status:</strong> <span class="status-display ${getStatusClass(book.status)}">${getStatusDisplay(book.status)}</span>
                    </div>
                    <div class="meta-item">
                        <strong>Rating:</strong> <span class="rating-display">${stars} (${book.rating}/5)</span>
                    </div>
                    <div class="meta-item">
                        <strong>Month Read:</strong> ${monthName}
                    </div>
                </div>
                
                ${book.review ? `
                    <div class="book-details-review">
                        <h3>My Review</h3>
                        <p>${book.review}</p>
                    </div>
                ` : ''}
                
                <div class="book-details-actions">
                    <button class="details-edit-btn" onclick="editBook('${book.firestoreId}'); closeBookDetails();">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Edit Book
                    </button>
                    <button class="details-delete-btn" onclick="deleteBook('${book.firestoreId}'); closeBookDetails();">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M10 11v6m4-6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        Delete Book
                    </button>
                </div>
            </div>
        </div>
    `;
    
    bookDetailsModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeBookDetails() {
    bookDetailsModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Status helper functions
function getStatusDisplay(status) {
    const statusMap = {
        'want-to-read': 'want to read',
        'currently-reading': 'currently reading',
        'finished': 'finished'
    };
    return statusMap[status] || 'unknown status';
}

function getStatusClass(status) {
    return `status-${status}`;
}

// Mobile Swipe Gesture Functions
function addSwipeGestures(element, book) {
    let startX = null;
    let startY = null;
    let isSwiping = false;
    let swipeDirection = null;
    
    // Touch start
    element.addEventListener('touchstart', function(e) {
        // Only handle single touch
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isSwiping = false;
        swipeDirection = null;
        
        // Add swipe indicator
        element.classList.add('touch-active');
    }, { passive: true });
    
    // Touch move
    element.addEventListener('touchmove', function(e) {
        if (!startX || !startY) return;
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        
        // Determine if this is a horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
            isSwiping = true;
            swipeDirection = deltaX > 0 ? 'right' : 'left';
            
            // Prevent scrolling during horizontal swipe
            e.preventDefault();
            
            // Add visual feedback
            const swipeAmount = Math.min(Math.abs(deltaX), 80);
            const opacity = swipeAmount / 80;
            
            if (swipeDirection === 'left') {
                // Show delete action
                element.style.transform = `translateX(${Math.max(deltaX, -80)}px)`;
                element.classList.add('swiping-left');
                element.classList.remove('swiping-right');
                showSwipeAction(element, 'delete', opacity);
            } else {
                // Show edit action
                element.style.transform = `translateX(${Math.min(deltaX, 80)}px)`;
                element.classList.add('swiping-right');
                element.classList.remove('swiping-left');
                showSwipeAction(element, 'edit', opacity);
            }
        }
    }, { passive: false });
    
    // Touch end
    element.addEventListener('touchend', function(e) {
        if (!startX || !startY) return;
        
        element.classList.remove('touch-active');
        
        if (isSwiping && swipeDirection) {
            const deltaX = Math.abs(startX - (e.changedTouches[0]?.clientX || startX));
            
            // If swipe was significant enough, trigger action
            if (deltaX > 60) {
                if (swipeDirection === 'left') {
                    // Trigger delete
                    triggerSwipeAction(element, 'delete', book);
                } else {
                    // Trigger edit
                    triggerSwipeAction(element, 'edit', book);
                }
            } else {
                // Reset position
                resetSwipeState(element);
            }
        } else {
            resetSwipeState(element);
        }
        
        // Reset values
        startX = null;
        startY = null;
        isSwiping = false;
        swipeDirection = null;
    }, { passive: true });
    
    // Touch cancel
    element.addEventListener('touchcancel', function() {
        resetSwipeState(element);
        startX = null;
        startY = null;
        isSwiping = false;
        swipeDirection = null;
    }, { passive: true });
}

function showSwipeAction(element, action, opacity) {
    // Remove existing action indicators
    element.querySelectorAll('.swipe-action-indicator').forEach(el => el.remove());
    
    const indicator = document.createElement('div');
    indicator.className = `swipe-action-indicator ${action}-indicator`;
    indicator.style.opacity = opacity;
    
    if (action === 'delete') {
        indicator.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 11v6m4-6v6" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
        indicator.style.right = '10px';
        indicator.style.backgroundColor = '#FF4444';
    } else {
        indicator.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        indicator.style.left = '10px';
        indicator.style.backgroundColor = '#9FA67A';
    }
    
    element.appendChild(indicator);
}

function triggerSwipeAction(element, action, book) {
    // Add completion animation
    element.style.transform = action === 'delete' ? 'translateX(-100%)' : 'translateX(100%)';
    element.style.opacity = '0.5';
    
    setTimeout(() => {
        if (action === 'delete') {
            deleteBook(book.firestoreId);
        } else {
            editBook(book.firestoreId);
        }
        resetSwipeState(element);
    }, 200);
}

function resetSwipeState(element) {
    element.style.transform = '';
    element.style.opacity = '';
    element.classList.remove('swiping-left', 'swiping-right', 'touch-active');
    element.querySelectorAll('.swipe-action-indicator').forEach(el => el.remove());
}

// Add CSS for message animation and new features
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .no-books {
        grid-column: 1 / -1;
        text-align: center;
        color: #B8B8B8;
        font-style: italic;
        padding: 3rem;
        font-size: 1.1rem;
        font-weight: 300;
        background-color: #FFFFFF;
        border-radius: 12px;
        border: 1px solid #F0F0F0;
        margin: 1rem 0;
    }
`;
document.head.appendChild(style);

// Note: Data is now stored in Firebase Firestore - no local cleanup needed
