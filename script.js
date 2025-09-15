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
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    // Wait for Firebase to be ready
    setTimeout(() => {
        setupFirestoreListener();
    }, 1000);
});

// Setup Firestore real-time listener
function setupFirestoreListener() {
    if (!window.db || !window.firestore) {
        console.error('Firebase not ready yet');
        setTimeout(setupFirestoreListener, 500);
        return;
    }

    const { collection, onSnapshot, orderBy, query, doc, updateDoc } = window.firestore;
    const booksCollection = collection(window.db, 'books');
    const booksQuery = query(booksCollection, orderBy('timestamp', 'desc'));

    // Listen for real-time updates
    onSnapshot(booksQuery, (snapshot) => {
        books = [];
        snapshot.forEach((doc) => {
            books.push({
                firestoreId: doc.id,
                ...doc.data()
            });
        });
        displayBooks();
    });
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
    searchInput.addEventListener('input', handleSearchInput);
    clearSearchBtn.addEventListener('click', clearSearch);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === addBookModal) {
            closeModalHandler();
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
    
    booksGrid.innerHTML = '';
    
    if (filteredBooks.length === 0) {
        let message = 'No books found';
        if (searchQuery && selectedMonth !== 'all') {
            message += ` for "${searchQuery}" in the selected month.`;
        } else if (searchQuery) {
            message += ` matching "${searchQuery}".`;
        } else if (selectedMonth !== 'all') {
            message += ' for the selected month.';
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

// Get filtered books based on month selection and search query
function getFilteredBooks() {
    const selectedMonth = monthFilter.value;
    const searchQuery = searchInput.value.toLowerCase().trim();
    
    let filteredBooks = books;
    
    // Filter by month if not 'all'
    if (selectedMonth !== 'all') {
        filteredBooks = filteredBooks.filter(book => book.month === selectedMonth);
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
    
    // Generate catalog number based on timestamp or order
    const catalogNumber = generateCatalogNumber(book);
    
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
        </div>
        <div class="book-catalog">${catalogNumber}</div>
        <div class="book-author">${book.author}</div>
        <div class="book-genre">${book.genre || 'Genre not specified'}</div>
        <div class="book-title">${book.title}</div>
    `;
    
    // Add delete functionality (optional)
    bookDiv.addEventListener('dblclick', function() {
        if (confirm('Are you sure you want to delete this book?')) {
            deleteBookFromFirestore(book.firestoreId);
        }
    });
    
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

// Generate Library Science-style catalog number
function generateCatalogNumber(book) {
    // Create a simple numbering system based on the book's index in the array
    const index = books.findIndex(b => b.firestoreId === book.firestoreId);
    const catalogNum = String(index + 1).padStart(3, '0');
    return `SW#${catalogNum}`;
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

// Show message function (simple notification)
function showMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #000;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 4px;
        z-index: 1001;
        animation: slideIn 0.3s ease;
    `;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Add CSS for message animation
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
