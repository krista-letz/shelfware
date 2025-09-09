// Book data storage
let books = [];

// DOM elements
const addBookBtn = document.getElementById('add-book-btn');
const addBookModal = document.getElementById('add-book-modal');
const closeModal = document.querySelector('.close');
const cancelBtn = document.getElementById('cancel-btn');
const addBookForm = document.getElementById('add-book-form');
const booksGrid = document.getElementById('books-grid');
const monthFilter = document.getElementById('month-filter');

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

    const { collection, onSnapshot, orderBy, query } = window.firestore;
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
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === addBookModal) {
            closeModalHandler();
        }
    });
}

// Open add book modal
function openModal() {
    addBookModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModalHandler() {
    addBookModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    addBookForm.reset();
}

// Handle form submission
async function handleAddBook(event) {
    event.preventDefault();
    
    const newBook = {
        title: document.getElementById('book-title').value.trim(),
        author: document.getElementById('book-author').value.trim(),
        rating: parseFloat(document.getElementById('book-rating').value),
        month: document.getElementById('book-month').value,
        cover: document.getElementById('book-cover').value.trim(),
        review: document.getElementById('book-review').value.trim()
    };
    
    // Add book to Firestore
    await addBookToFirestore(newBook);
    
    // Close modal
    closeModalHandler();
}

// Display books in grid
function displayBooks() {
    const filteredBooks = getFilteredBooks();
    booksGrid.innerHTML = '';
    
    if (filteredBooks.length === 0) {
        booksGrid.innerHTML = '<p class="no-books">No books found for the selected criteria.</p>';
        return;
    }
    
    filteredBooks.forEach((book) => {
        const bookElement = createBookElement(book);
        booksGrid.appendChild(bookElement);
    });
}

// Get filtered books based on month selection
function getFilteredBooks() {
    const selectedMonth = monthFilter.value;
    
    if (selectedMonth === 'all') {
        return books.sort((a, b) => new Date(b.month) - new Date(a.month));
    }
    
    return books.filter(book => book.month === selectedMonth)
                .sort((a, b) => new Date(b.month) - new Date(a.month));
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
            <button class="delete-btn" onclick="event.stopPropagation(); deleteBook('${book.firestoreId}');" title="Delete book">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10 11v6m4-6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
        <div class="book-info">
            <div class="book-author">${book.author}</div>
            <div class="book-title">${book.title}</div>
            <div class="book-rating">${stars} (${book.rating}/5)</div>
            <div class="book-month">${monthName}</div>
            ${book.review ? `<div class="book-review">"${book.review}"</div>` : ''}
        </div>
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
