import { API_URL, currentUserToken } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    const productsGrid = document.getElementById('featured-products-grid');
    if (!productsGrid) return;

    async function loadFeaturedProducts() {
        try {
            const response = await fetch(`${API_URL}/products`);
            if (!response.ok) throw new Error('Error fetching');
            const result = await response.json();
            
            // Limit to just 4 logic for index
            const featured = result.data.slice(0, 4);
            renderProducts(featured);
        } catch (error) {
            productsGrid.innerHTML = '<p class="text-center col-span-full pt-10 text-tierra-500">No se pudieron cargar los destacados. <a href="/catalogo.html" class="underline font-bold">Ir al carrito</a></p>';
        }
    }

    function renderProducts(products) {
        productsGrid.innerHTML = ''; 
        if (products.length === 0) return;

        products.forEach((product, index) => {
            const imageUrl = product.image_url || 'https://images.unsplash.com/photo-1573408301145-b98c46544c64?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
            const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
            const isOutOfStock = product.stock <= 0;

            const card = document.createElement('article');
            card.className = `product-card bg-white rounded-2xl shadow-sm border border-tierra-50 overflow-hidden flex flex-col h-full animate-fade-in`;
            card.style.animationDelay = `${index * 0.1}s`;
            
            card.innerHTML = `
                <a href="/producto.html?id=${product.id}" class="group block">
                    <div class="product-image-container relative aspect-square bg-tierra-100">
                        <img src="${imageUrl}" alt="${product.name}" class="product-image w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                        ${isOutOfStock ? `<div class="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-sm"><span class="bg-tierra-900 text-white px-5 py-2 rounded-full font-medium tracking-wide shadow-xl">Agotado Temporalmente</span></div>` : ''}
                    </div>
                </a>
                <div class="p-6 flex flex-col flex-grow">
                    <div class="flex justify-between items-start mb-4">
                        <a href="/producto.html?id=${product.id}" class="hover:text-tierra-600 transition-colors">
                            <h3 class="text-xl font-bold text-tierra-900 leading-tight">${product.name}</h3>
                        </a>
                        <span class="text-lg font-bold text-tierra-700 bg-tierra-100 px-3 py-1 rounded-lg shrink-0 ml-2">${formatter.format(product.price)}</span>
                    </div>
                    <button class="add-to-cart-btn btn-primary w-full py-3 rounded-xl font-medium mt-auto flex items-center justify-center gap-2" ${isOutOfStock ? 'disabled' : ''}>
                        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        Agregar
                    </button>
                </div>
            `;
            productsGrid.appendChild(card);

            const btn = card.querySelector('.add-to-cart-btn');
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                handleAddToServerCart(btn, product);
            });
        });
    }

    async function handleAddToServerCart(button, productData) {
        if (!currentUserToken) {
            window.location.href = `/login.html`;
            return;
        }

        const originalText = button.innerHTML;
        button.innerHTML = `<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Añadiendo...`;
        
        try {
            await fetch(`${API_URL}/cart/item`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${currentUserToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    product_id: productData.id,
                    product_name: productData.name,
                    price: productData.price,
                    image_url: productData.image_url,
                    quantity: 1
                })
            });

            button.classList.add('bg-green-600', 'text-white', 'border-transparent');
            button.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> ¡Agregado!`;
            
            // Dispatch a reload for the nav to pickup new items
            const event = new Event('cartUpdatedEvt');
            document.dispatchEvent(event);

            setTimeout(() => {
                button.classList.remove('bg-green-600');
                button.innerHTML = originalText;
            }, 1000);

        } catch (error) {
            button.innerHTML = `Error al agregar`;
            setTimeout(() => { button.innerHTML = originalText; }, 2000);
        }
    }

    // Begin render
    loadFeaturedProducts();
});
