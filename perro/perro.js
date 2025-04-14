// Variables globales
let cart = {}; // Objeto que almacenará la cantidad de cada producto (clave: productId)
let products = []; // Lista de productos obtenida del JSON
let fuse; // Instancia de Fuse.js para búsqueda
// Si el ancho es menor o igual a 480px (móviles), se muestran 4 productos; de lo contrario, 16.
let productsPerPage = window.innerWidth <= 480 ? 4 : 8;
let categoryPages = {}; // Página actual por categoría

// Opciones de Fuse.js
const fuseOptions = {
    keys: ['name', 'description'],
    threshold: 0.4,
};

// Importación de las categorías desde el módulo externo
import { categories } from './categories.js';


/** Inicializar búsqueda usando Fuse.js **/
function initializeSearch() {
    const searchBar = document.getElementById("search-bar");
    if (!searchBar) return;

    searchBar.addEventListener("input", () => {
        const query = searchBar.value.trim();
        if (query === "") {
            // Si no hay texto, se muestran todas las categorías
            renderAllCategories();
        } else {
            // Se buscan los productos que coincidan con el query
            const results = fuse.search(query);
            renderSearchResults(results);
        }
    });
}

function renderSearchResults(results) {
    const container = document.getElementById('carousels-container');
    if (!container) return;
    container.innerHTML = ""; // Limpiar el contenedor

    if (results.length === 0) {
        container.innerHTML = "<p>No se encontraron productos.</p>";
        return;
    }

    // Crear un DocumentFragment para una inserción más eficiente
    const fragment = document.createDocumentFragment();
    const gridDiv = document.createElement('div');
    gridDiv.classList.add('search-results-grid');

    results.forEach(result => {
        const product = result.item;
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        productCard.dataset.id = product.id;
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image" data-gallery='${JSON.stringify(product.gallery && product.gallery.length ? product.gallery : [product.image])}'>
            <div class="product-details">
                <h3>${product.name}</h3>
                <p>$${product.price.toLocaleString()}</p>
                <div class="quantity-controls">
                    <button class="quantity-btn minus" data-id="${product.id}">-</button>
                    <span id="quantity-${product.id}">0</span>
                    <button class="quantity-btn plus" data-id="${product.id}">+</button>
                </div>
                <button class="buy-btn" onclick="buyProduct(${product.id})">Comprar</button>
            </div>`;
        gridDiv.appendChild(productCard);
    });

    fragment.appendChild(gridDiv);
    container.appendChild(fragment);

    attachEventListeners();
    assignImageClickEvents();
}



/** Actualiza el carrito flotante (floating cart)
 *  Se actualiza la cantidad del producto en el objeto 'cart'
 *  y se actualiza el contador global.
 **/
function updateFloatingCart(productId, change) {
    // Aseguramos que productId se trate como string
    productId = String(productId);
    if (!cart[productId]) {
        cart[productId] = 0;
    }
    cart[productId] += change;
    if (cart[productId] < 0) cart[productId] = 0;
    updateCartDisplay();
}

/** Actualiza la visualización del contador en el carrito flotante **/
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

/** Actualiza la cantidad mostrada en cada tarjeta de producto **/
function updateQuantityDisplay(productId) {
    productId = String(productId);
    const quantityElem = document.getElementById(`quantity-${productId}`);
    if (quantityElem) {
        quantityElem.textContent = cart[productId] || 0;
    }
}

/** Cargar productos desde products.json **/
async function loadProducts() {
    try {
        const response = await fetch('./products.json');
        if (!response.ok) throw new Error(`Error al cargar products.json: ${response.status}`);

        products = await response.json();
        fuse = new Fuse(products, fuseOptions);

        initializePagination();
        initializeSearch();
    } catch (error) {
        console.error('Error al cargar los productos:', error);
    }
}

/** Inicializar paginación **/
function initializePagination() {
    const container = document.getElementById('carousels-container');
    if (!container) return;
    container.innerHTML = '';
    // Por cada categoría se inicia en la página 0 y se renderiza el carrusel
    categories.forEach(category => {
        categoryPages[category.id] = 0;
        renderCategory(category.id);
    });
}

/** Renderizar todas las categorías con sus carruseles **/
function renderAllCategories() {
    categories.forEach(category => {
        renderCategory(category.id);
    });
}

/** Renderizar una categoría con su carrusel **/
function renderCategory(categoryId) {
    const container = document.getElementById('carousels-container');
    if (!container) return;

    // Filtrar los productos correspondientes a la categoría
    const categoryProducts = products.filter(product => product.categoryId === categoryId);
    if (categoryProducts.length === 0) return;

    // Obtener o crear la sección para la categoría
    let categorySection = document.getElementById(`category-${categoryId}`);
    if (!categorySection) {
        categorySection = document.createElement('section');
        categorySection.classList.add('category-section');
        categorySection.id = `category-${categoryId}`;
        container.appendChild(categorySection);
    }

    // Calcular el rango de productos a mostrar según la página actual
    const pageIndex = categoryPages[categoryId];
    const start = pageIndex * productsPerPage;
    const end = start + productsPerPage;
    const productsToRender = categoryProducts.slice(start, end);

    // Renderizar el título y el carrusel
    categorySection.innerHTML = `
      <h2 class="category-title">${categories.find(cat => cat.id === categoryId).title}</h2>
      <div class="carousel-container">
        <button class="carousel-btn prev-btn" onclick="changePage(${categoryId}, -1)">❮</button>
        <div class="carousel-track grid-2x6">${generateProductGrid(productsToRender)}</div>
        <button class="carousel-btn next-btn" onclick="changePage(${categoryId}, 1)">❯</button>
      </div>
    `;

    // Asigna los eventos a los botones y a las imágenes
    attachEventListeners();
    assignImageClickEvents(); // Esto es para que al hacer scroll, las imágenes respondan al click
}



/** Genera la grid de productos (disposición 6x2) con botón de compra **/
function generateProductGrid(products) {
    let html = '<div class="carousel-page">';
    // Iterar a través de los productos y mostrarlos
    for (let i = 0; i < products.length; i += productsPerPage) {
        html += '<div class="carousel-row">';
        const rowProducts = products.slice(i, i + productsPerPage);
        rowProducts.forEach(product => {
            // Usa product.gallery si existe; de lo contrario, usa product.image
            const galleryArray = product.gallery && product.gallery.length ? product.gallery : [product.image];
            const galleryData = JSON.stringify(galleryArray);
            html += `
        <div class="product-card" data-id="${product.id}">
          <img src="${product.image}" alt="${product.name}" class="product-image" data-gallery='${galleryData}' loading="lazy" width="300" height="300">
          <div class="product-details">
            <h3>${product.name}</h3>
            <p>$${product.price.toLocaleString()}</p>
            <div class="quantity-controls">
              <button class="quantity-btn minus" data-id="${product.id}">-</button>
              <span id="quantity-${product.id}">0</span>
              <button class="quantity-btn plus" data-id="${product.id}">+</button>
            </div>
            <button class="buy-btn" onclick="buyProduct(${product.id})">Comprar</button>
          </div>
        </div>`;
        });
        html += '</div>'; // Cierra la fila
    }
    html += '</div>'; // Cierra la página
    return html;
}







/** Cambiar página del carrusel **/
window.changePage = function(categoryId, direction) {
    const categoryProducts = products.filter(product => product.categoryId === categoryId);
    const totalPages = Math.ceil(categoryProducts.length / productsPerPage);

    categoryPages[categoryId] += direction;
    if (categoryPages[categoryId] < 0) categoryPages[categoryId] = 0;
    if (categoryPages[categoryId] >= totalPages) categoryPages[categoryId] = totalPages - 1;

    renderCategory(categoryId);
};

/** Función para la acción de "comprar" un producto **/
function buyProduct(productId) {
    // Buscar el producto en el arreglo global "products"
    const product = products.find(p => p.id === productId);

    // Si no se encuentra, se envía un mensaje genérico
    let message = product ?
        `Hola, estoy interesado en comprar el producto: ${product.name}.` :
        "Hola, estoy interesado en comprar este producto.";

    // Número de WhatsApp (asegúrate de que esté en el formato correcto, sin símbolos ni espacios)
    const phone = "573108853158";

    // Se crea la URL con el mensaje codificado
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    // Se abre una nueva pestaña/ventana hacia WhatsApp
    window.open(url, '_blank');
}

// Exponer la función al objeto global (si se usa inline en el HTML)
window.buyProduct = buyProduct;


function attachEventListeners() {
    // Botones "+"
    const plusButtons = document.querySelectorAll('.quantity-btn.plus');
    plusButtons.forEach(button => {
        // Clonamos el botón para evitar duplicados
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener('click', () => {
            const productId = newButton.dataset.id;
            // Actualizamos el carrito y la visualización de cantidad
            updateFloatingCart(productId, 1);
            updateQuantityDisplay(productId);

            // Buscamos el elemento de la tarjeta (o la imagen) relacionada
            const cardElement = newButton.closest('.product-card');
            if (cardElement) {
                // Se anima del producto hacia el carrito (isAdding = true)
                flyToCart(cardElement, true);
            }
        });
    });

    // Botones "–"
    const minusButtons = document.querySelectorAll('.quantity-btn.minus');
    minusButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener('click', () => {
            const productId = newButton.dataset.id;
            updateFloatingCart(productId, -1);
            updateQuantityDisplay(productId);

            // Buscamos el elemento de la tarjeta relacionada
            const cardElement = newButton.closest('.product-card');
            if (cardElement) {
                // Se anima del carrito de regreso a la card (isAdding = false)
                flyToCart(cardElement, false);
            }
        });
    });
}


/** 
 * Función para enviar el carrito a WhatsApp.
 * Recorre el objeto 'cart' para obtener cada producto, calcula subtotales y el total, y abre WhatsApp con el mensaje preparado.
 **/
function sendCartToWhatsApp() {
    let message = "Hola, estoy interesado en comprar los siguientes productos:\n";
    let totalPrice = 0;
    let hasProducts = false;

    for (let productId in cart) {
        if (cart[productId] > 0) {
            let product = products.find(p => String(p.id) === productId);
            if (product) {
                hasProducts = true;
                const qty = cart[productId];
                const price = product.price;
                const subtotal = qty * price;
                totalPrice += subtotal;
                // Se agregan detalles del producto y la URL de la imagen
                message += `\n*${product.name}*\n`;
                message += `Cantidad: ${qty}\n`;
                message += `Precio unitario: $${price.toLocaleString()}\n`;
                message += `Subtotal: $${subtotal.toLocaleString()}\n`;
                message += `Imagen: ${product.image}\n`;
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

// Exponemos la función para que sea accesible desde el HTML
window.sendCartToWhatsApp = sendCartToWhatsApp;



function flyToCart(cardElement, isAdding) {
    // Clonamos el elemento de la tarjeta (puede ser toda la card o solo la imagen, según prefieras)
    const clonedElement = cardElement.cloneNode(true);
    const body = document.body;
    body.appendChild(clonedElement);

    // Obtenemos las posiciones inicial y final
    const cardRect = cardElement.getBoundingClientRect();
    const cartElement = document.getElementById('floating-cart');
    const cartRect = cartElement.getBoundingClientRect();

    // Establecemos los estilos iniciales para el clon
    Object.assign(clonedElement.style, {
        position: 'fixed',
        zIndex: '1000',
        pointerEvents: 'none',
        transition: 'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease',
        willChange: 'transform, opacity'
    });

    if (isAdding) {
        // Animación: del producto (tarjeta) hacia el carrito

        // Posicionamos el clon en la posición original de la tarjeta
        clonedElement.style.top = cardRect.top + 'px';
        clonedElement.style.left = cardRect.left + 'px';
        clonedElement.style.width = cardRect.width + 'px';
        clonedElement.style.height = cardRect.height + 'px';
        clonedElement.style.transform = 'none';
        clonedElement.style.opacity = '1';

        // Calculamos el centro del elemento y del carrito
        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;
        const cartCenterX = cartRect.left + cartRect.width / 2;
        const cartCenterY = cartRect.top + cartRect.height / 2;

        // Diferencia entre centros
        const deltaX = cartCenterX - cardCenterX;
        const deltaY = cartCenterY - cardCenterY;

        // Usamos requestAnimationFrame para iniciar la animación
        requestAnimationFrame(() => {
            clonedElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.2)`;
            clonedElement.style.opacity = '0';
        });
    } else {
        // Animación inversa: del carrito hacia la tarjeta

        // Posicionamos el clon inicialmente en la ubicación del carrito
        clonedElement.style.top = cartRect.top + 'px';
        clonedElement.style.left = cartRect.left + 'px';
        clonedElement.style.width = cartRect.width + 'px';
        clonedElement.style.height = cartRect.height + 'px';
        clonedElement.style.transform = 'none';
        clonedElement.style.opacity = '1';

        // Calculamos el centro de la tarjeta y del carrito
        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;
        const cartCenterX = cartRect.left + cartRect.width / 2;
        const cartCenterY = cartRect.top + cartRect.height / 2;

        // Diferencia para regresar a la tarjeta
        const deltaX = cardCenterX - cartCenterX;
        const deltaY = cardCenterY - cartCenterY;

        // Iniciamos la animación para que el clon se desplace hasta la tarjeta y se desvanezca
        requestAnimationFrame(() => {
            clonedElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1)`;
            clonedElement.style.opacity = '0';
        });
    }

    // Removemos el clon del DOM al finalizar la animación
    setTimeout(() => {
        if (clonedElement.parentNode) {
            clonedElement.parentNode.removeChild(clonedElement);
        }
    }, 900);
}


function scrollToCarousels() {
    const carouselContainer = document.getElementById('carousels-container');
    if (carouselContainer) {
        carouselContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

// Exponemos la función al objeto global (si es necesario)
window.scrollToCarousels = scrollToCarousels;

// Otras funciones y la carga de productos...
document.addEventListener('DOMContentLoaded', () => {
    loadProducts().then(() => {
        renderAllCategories();
        assignImageClickEvents(); // Asigna el clic a las imágenes para abrir el modal
    });
});

const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Obtenemos el título de la categoría desde el atributo data-category
        const categoryTitle = button.getAttribute('data-category');
        filterCategory(categoryTitle);
    });
});

function goToWhatsAppContact() {
    const phone = "573108853158"; // Asegúrate de que este número esté en el formato correcto (código de país sin símbolos)
    const message = "Hola quiero comprar algunos de sus productos";
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// Exponemos la función al objeto global, en caso de que se use un onclick inline
window.goToWhatsAppContact = goToWhatsAppContact;

/**
 * Función que anima el contador de 0 hasta targetNumber en la duración especificada (en milisegundos)
 * @param {number} targetNumber - Valor final del contador.
 * @param {number} duration - Duración de la animación en milisegundos.
 */
function animateCounter(targetNumber, duration) {
    const counterElem = document.getElementById("counter");
    let startTime = null;

    function updateCounter(currentTime) {
        if (!startTime) {
            startTime = currentTime;
        }
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Función de easing ease-out (más natural)
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        const currentValue = Math.floor(easedProgress * targetNumber);
        counterElem.textContent = currentValue.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }

    requestAnimationFrame(updateCounter);
}

// Usamos Intersection Observer para disparar la animación cuando el contenedor es visible
document.addEventListener('DOMContentLoaded', () => {
    const counterContainer = document.getElementById('purchases-counter-container');
    let hasAnimated = false; // Para asegurarnos de que la animación se ejecute solo una vez

    const observerOptions = {
        threshold: 0.3 // El callback se dispara cuando el 50% del contenedor es visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                animateCounter(1000, 1000);
                hasAnimated = true;
                observer.unobserve(counterContainer); // Deja de observar una vez animado
            }
        });
    }, observerOptions);

    observer.observe(counterContainer);
});

function openModal(imageElement) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalImagesContainer = document.getElementById('modal-images');

    // Limpiar imágenes previas en el modal
    modalImagesContainer.innerHTML = '';

    // Obtener el atributo data-gallery (se espera que sea un JSON con las URLs)
    const galleryData = imageElement.getAttribute('data-gallery');
    let images = [];
    try {
        images = JSON.parse(galleryData);
    } catch (error) {
        // Si falla el parse o no existe, se usa la imagen principal
        images = [imageElement.src];
    }

    // Por cada imagen, crear un elemento <img> y agregarlo al contenedor
    images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = imageElement.alt || 'Producto';
        modalImagesContainer.appendChild(img);
    });

    // Mostrar el modal
    modalOverlay.style.display = 'flex';
}


function assignImageClickEvents() {
    const productImages = document.querySelectorAll('.product-image');
    productImages.forEach(img => {
        img.style.cursor = 'pointer'; // Para indicar que es clickeable
        img.addEventListener('click', () => {
            openModal(img);
        });
    });
}

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




function filterCategory(categoryTitle) {
    // Buscar en el arreglo de categorías aquella cuyo título coincida (ignorando mayúsculas/minúsculas)
    const category = categories.find(cat => cat.title.toLowerCase() === categoryTitle.toLowerCase());
    if (category) {
        const section = document.getElementById(`category-${category.id}`);
        if (section) {
            section.scrollIntoView({ behavior: "smooth" });
        } else {
            console.error("No se encontró la sección para la categoría con id:", category.id);
        }
    } else {
        console.error("No se encontró la categoría con título:", categoryTitle);
    }
}
document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
        const categoryTitle = button.getAttribute('data-category');
        filterCategory(categoryTitle);
    });
});
console.log(window.filterCategory);


document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Obtenemos el título de la categoría desde el atributo data-category
            const categoryTitle = button.getAttribute('data-category');
            filterCategory(categoryTitle);
        });
    });
});




window.openModal = openModal;
window.assignImageClickEvents = assignImageClickEvents;
window.filterCategory = filterCategory;