// Book data storage
let books = [
    {
        id: 1,
        title: "The Housemaid",
        author: "Freida McFadden",
        rating: 4,
        month: "2025-01",
        cover: "",
        review: "A gripping psychological thriller that kept me guessing until the end. Great plot twists!"
    },
    {
        id: 2,
        title: "Lessons in Chemistry",
        author: "Bonnie Garmus",
        rating: 5,
        month: "2025-01",
        cover: "",
        review: "Brilliant and witty story about a female scientist in the 1960s. Absolutely loved Elizabeth Zott's character."
    }
];

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
    clearOldYearData();
    loadBooksFromStorage();
    displayBooks();
    setupEventListeners();
});

// Load books from localStorage
function loadBooksFromStorage() {
    const savedBooks = localStorage.getItem('bookReviews');
    if (savedBooks) {
        books = JSON.parse(savedBooks);
    }
}

// Save books to localStorage
function saveBooksToStorage() {
    localStorage.setItem('bookReviews', JSON.stringify(books));
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
function handleAddBook(event) {
    event.preventDefault();
    
    const formData = new FormData(addBookForm);
    const newBook = {
        id: Date.now(), // Simple ID generation
        title: document.getElementById('book-title').value.trim(),
        author: document.getElementById('book-author').value.trim(),
        rating: parseInt(document.getElementById('book-rating').value),
        month: document.getElementById('book-month').value,
        cover: document.getElementById('book-cover').value.trim(),
        review: document.getElementById('book-review').value.trim()
    };
    
    // Add book to array
    books.push(newBook);
    
    // Save to localStorage
    saveBooksToStorage();
    
    // Refresh display
    displayBooks();
    
    // Close modal
    closeModalHandler();
    
    // Show success message (optional)
    showMessage('Book added successfully!');
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
    
    const stars = '⭐'.repeat(book.rating);
    const monthName = formatMonth(book.month);
    
    bookDiv.innerHTML = `
        <div class="book-cover ${book.cover ? 'has-image' : ''}" ${book.cover ? `style="background-image: url('${book.cover}')"` : ''}>
            ${!book.cover ? 'No Cover' : ''}
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
            deleteBook(book.id);
        }
    });
    
    return bookDiv;
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

// Delete book function
function deleteBook(bookId) {
    books = books.filter(book => book.id !== bookId);
    saveBooksToStorage();
    displayBooks();
    showMessage('Book deleted successfully!');
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
        color: #666;
        font-style: italic;
        padding: 2rem;
    }
`;
document.head.appendChild(style);

// Clear any stored data from previous years on page load
function clearOldYearData() {
    const savedBooks = localStorage.getItem('bookReviews');
    if (savedBooks) {
        const parsedBooks = JSON.parse(savedBooks);
        // Filter out any books not from 2025
        const books2025 = parsedBooks.filter(book => book.month && book.month.startsWith('2025'));
        if (books2025.length !== parsedBooks.length) {
            localStorage.setItem('bookReviews', JSON.stringify(books2025));
        }
    }
}
