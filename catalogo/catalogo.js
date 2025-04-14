// Importar Fuse.js (versión ES Module)
import Fuse from 'https://cdn.jsdelivr.net/npm/fuse.js@6.6.2/dist/fuse.esm.js';
// Importar categorías desde el módulo externo
import { categories } from './categories.js';

// Variables globales
let cart = {}; // Objeto para el carrito (clave: productId, valor: cantidad)
let products = []; // Lista de productos
let fuse; // Instancia de Fuse.js para búsqueda
const productsPerPage = 16;
let currentPage = 1;
let filteredProducts = [];

// Opciones de Fuse.js
const fuseOptions = {
    keys: ['name', 'description'],
    threshold: 0.4,
};

/** Renderizar productos en el contenedor usando DocumentFragment **/
function renderProducts(productsToRender) {
    const productGrid = document.getElementById("product-grid");
    productGrid.innerHTML = "";

    if (productsToRender.length === 0) {
        productGrid.innerHTML = "<p>No se encontraron productos.</p>";
        return;
    }

    // Crear un DocumentFragment para insertar todas las cards a la vez
    const fragment = document.createDocumentFragment();

    productsToRender.forEach(product => {
        const card = document.createElement("div");
        card.classList.add("product-card");
        card.innerHTML = `
      <img src="${product.image}" alt="${product.name}" class="product-image" 
           loading="lazy" width="300" height="300" 
           data-gallery='${JSON.stringify(product.gallery || [product.image])}'>
      <div class="product-details">
         <h3>${product.name}</h3>
         <p>$${product.price.toLocaleString()}</p>
         <p>${product.description}</p>
         <div class="quantity-controls">
           <button class="quantity-btn minus" data-id="${product.id}">-</button>
           <span id="quantity-${product.id}">0</span>
           <button class="quantity-btn plus" data-id="${product.id}">+</button>
         </div>
         <button class="buy-btn" onclick="handleSingleBuyClick(${product.id}, '${product.name}', ${product.price})">Comprar</button>
      </div>
    `;
        fragment.appendChild(card);
    });

    productGrid.appendChild(fragment);

    // Reasignar eventos a las imágenes para que se agranden al clic (o abran modal)
    assignImageClickEvents();
    // Asigna también los eventos a los botones de cantidad
    attachQuantityButtons();
}

/** Cargar productos desde products.json **/
async function loadProducts() {
    try {
        const response = await fetch('./products.json');
        if (!response.ok) throw new Error(`Error al cargar products.json: ${response.status}`);
        products = await response.json();
        fuse = new Fuse(products, fuseOptions);
        filteredProducts = products; // Inicialmente se muestran todos
        renderPage();
    } catch (error) {
        console.error("Error al cargar los productos:", error);
    }
}

/** Renderizar la página actual (paginación) **/
function renderPage() {
    const start = (currentPage - 1) * productsPerPage;
    const end = start + productsPerPage;
    const productsToRender = filteredProducts.slice(start, end);
    renderProducts(productsToRender);

    document.getElementById("current-page").textContent = currentPage;
    document.getElementById("prev-page").disabled = currentPage === 1;
    document.getElementById("next-page").disabled = end >= filteredProducts.length;
}

/** Inicializar búsqueda en tiempo real **/
function initializeSearch() {
    const searchInput = document.getElementById("search-input");
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim();
        if (query === "") {
            filteredProducts = products;
        } else {
            const results = fuse.search(query);
            filteredProducts = results.map(result => result.item);
        }
        currentPage = 1;
        renderPage();
    });
}

/** Inicializar el filtro por categoría **/
function initializeCategoryFilter() {
    const categorySelect = document.getElementById("category-select");
    categorySelect.addEventListener("change", () => {
        const selected = categorySelect.value;
        if (selected === "all") {
            filteredProducts = products;
        } else {
            // Si los categoryId son numéricos, convertir el valor a número
            filteredProducts = products.filter(product => product.categoryId === Number(selected));
        }
        currentPage = 1;
        renderPage();
    });
}

/** Paginación: Asignar eventos a los botones de paginación **/
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("prev-page").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
        }
    });
    document.getElementById("next-page").addEventListener("click", () => {
        if (currentPage * productsPerPage < filteredProducts.length) {
            currentPage++;
            renderPage();
        }
    });
});

/** Función para compra vía WhatsApp **/
function handleSingleBuyClick(id, name, price) {
    const message = `Hola, estoy interesado en comprar el producto: ${name} (ID: ${id}). Precio: $${price.toLocaleString()}`;
    const phone = "573108853158";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}
window.handleSingleBuyClick = handleSingleBuyClick;

/** Actualiza el carrito flotante **/
function updateFloatingCart(productId, change) {
    productId = String(productId);
    if (!cart[productId]) {
        cart[productId] = 0;
    }
    cart[productId] += change;
    if (cart[productId] < 0) cart[productId] = 0;
    updateCartDisplay();
}

/** Actualiza la visualización del contador en el carrito **/
function updateCartDisplay() {
    let total = 0;
    for (const id in cart) {
        total += cart[id];
    }
    const cartCountElem = document.getElementById("cart-count");
    if (cartCountElem) {
        cartCountElem.textContent = total;
        cartCountElem.style.display = total > 0 ? "flex" : "none";
    }
}

/** Actualiza la cantidad mostrada en cada tarjeta **/
function updateQuantityDisplay(productId) {
    productId = String(productId);
    const quantityElem = document.getElementById(`quantity-${productId}`);
    if (quantityElem) {
        quantityElem.textContent = cart[productId] || 0;
    }
}

/** Asigna eventos a las imágenes para abrir modal **/
function assignImageClickEvents() {
    const productImages = document.querySelectorAll('.product-image');
    productImages.forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
            openModal(img);
        });
    });
}

/** Asigna eventos a los botones de cantidad (sin clonar) **/
function attachQuantityButtons() {
    const plusButtons = document.querySelectorAll('.quantity-btn.plus');
    plusButtons.forEach(button => {
        button.addEventListener('click', () => {
            const productId = button.dataset.id;
            updateFloatingCart(productId, 1);
            updateQuantityDisplay(productId);
            const cardElement = button.closest('.product-card');
            if (cardElement) {
                flyToCart(cardElement, true);
            }
        });
    });
    const minusButtons = document.querySelectorAll('.quantity-btn.minus');
    minusButtons.forEach(button => {
        button.addEventListener('click', () => {
            const productId = button.dataset.id;
            updateFloatingCart(productId, -1);
            updateQuantityDisplay(productId);
            const cardElement = button.closest('.product-card');
            if (cardElement) {
                flyToCart(cardElement, false);
            }
        });
    });
}

/** Función para animar la tarjeta hacia el carrito (opcional) **/
function flyToCart(cardElement, isAdding) {
    const clonedElement = cardElement.cloneNode(true);
    document.body.appendChild(clonedElement);
    const cardRect = cardElement.getBoundingClientRect();
    const cartElement = document.getElementById('floating-cart');
    const cartRect = cartElement.getBoundingClientRect();

    Object.assign(clonedElement.style, {
        position: 'fixed',
        zIndex: '1000',
        pointerEvents: 'none',
        transition: 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease',
        willChange: 'transform, opacity'
    });

    if (isAdding) {
        clonedElement.style.top = cardRect.top + 'px';
        clonedElement.style.left = cardRect.left + 'px';
        clonedElement.style.width = cardRect.width + 'px';
        clonedElement.style.height = cardRect.height + 'px';
        clonedElement.style.transform = 'none';
        clonedElement.style.opacity = '1';

        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;
        const cartCenterX = cartRect.left + cartRect.width / 2;
        const cartCenterY = cartRect.top + cartRect.height / 2;
        const deltaX = cartCenterX - cardCenterX;
        const deltaY = cartCenterY - cardCenterY;

        requestAnimationFrame(() => {
            clonedElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.2)`;
            clonedElement.style.opacity = '0';
        });
    } else {
        clonedElement.style.top = cartRect.top + 'px';
        clonedElement.style.left = cartRect.left + 'px';
        clonedElement.style.width = cartRect.width + 'px';
        clonedElement.style.height = cartRect.height + 'px';
        clonedElement.style.transform = 'none';
        clonedElement.style.opacity = '1';

        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;
        const cartCenterX = cartRect.left + cartRect.width / 2;
        const cartCenterY = cartRect.top + cartRect.height / 2;
        const deltaX = cardCenterX - cartCenterX;
        const deltaY = cardCenterY - cartCenterY;

        requestAnimationFrame(() => {
            clonedElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1)`;
            clonedElement.style.opacity = '0';
        });
    }
    setTimeout(() => {
        if (clonedElement.parentNode) {
            clonedElement.parentNode.removeChild(clonedElement);
        }
    }, 900);
}

/** Función para abrir el modal con imágenes **/
function openModal(imageElement) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalImagesContainer = document.getElementById('modal-images');
    modalImagesContainer.innerHTML = "";
    const galleryData = imageElement.getAttribute('data-gallery');
    let images = [];
    try {
        images = JSON.parse(galleryData);
    } catch (error) {
        images = [imageElement.src];
    }
    images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = imageElement.alt || 'Producto';
        modalImagesContainer.appendChild(img);
    });
    modalOverlay.style.display = 'flex';
}

/** Función para cerrar el modal **/
function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.style.display = 'none';
}
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
        closeModal();
    }
});
window.openModal = openModal;
window.assignImageClickEvents = assignImageClickEvents; // Asegúrate de que assignImageClickEvents esté disponible

/** Función para enviar el carrito a WhatsApp **/
function sendCartToWhatsApp() {
    let message = "Hola, estoy interesado en comprar los siguientes productos:\n";
    let totalPrice = 0;
    let hasProducts = false;
    for (let productId in cart) {
        if (cart[productId] > 0) {
            const product = products.find(p => String(p.id) === productId);
            if (product) {
                hasProducts = true;
                const qty = cart[productId];
                const price = product.price;
                const subtotal = qty * price;
                totalPrice += subtotal;
                message += `\n*${product.name}*\nCantidad: ${qty}\nPrecio unitario: $${price.toLocaleString()}\nSubtotal: $${subtotal.toLocaleString()}\nImagen: ${product.image}\n`;
            }
        }
    }
    if (!hasProducts) {
        alert("No has agregado ningún producto al carrito.");
        return;
    }
    message += `\nTotal a pagar: $${totalPrice.toLocaleString()}`;
    const phone = "573108853158";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}
window.sendCartToWhatsApp = sendCartToWhatsApp;

/** Inicializar todo al cargar el DOM **/
document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    initializeSearch();
    initializeCategoryFilter();
});