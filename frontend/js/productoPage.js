import { API_URL, currentUserToken } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loadState = document.getElementById('loading-state');
    const errState = document.getElementById('error-state');
    const prodContent = document.getElementById('product-content');

    const detailTitle = document.getElementById('detail-title');
    const detailPrice = document.getElementById('detail-price');
    const detailDesc = document.getElementById('detail-desc');
    const detailImage = document.getElementById('detail-image');
    
    const qtyDisplay = document.getElementById('qty-display');
    const btnMinus = document.getElementById('qty-minus');
    const btnPlus = document.getElementById('qty-plus');
    const addBtn = document.getElementById('add-detail-btn');

    const stockBadge = document.getElementById('out-of-stock-badge');
    const lowStockWarning = document.getElementById('detail-stock-badge');

    // State Variables
    let productData = null;
    let selectedQuantity = 1;

    // 1. Check URL parameters
    const searchParams = new URLSearchParams(window.location.search);
    const urlId = searchParams.get('id');

    if (!urlId) {
        showError();
        return;
    }

    // 2. Fetch specific database item
    async function loadItem() {
        try {
            const response = await fetch(`${API_URL}/products/${urlId}`);
            if (!response.ok) throw new Error('Not Found');
            
            const result = await response.json();
            productData = result.data;
            hydrateUI();
        } catch (error) {
            showError();
        }
    }

    // 3. Mount UI
    function hydrateUI() {
        const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
        
        detailTitle.textContent = productData.name;
        detailPrice.textContent = formatter.format(productData.price);
        detailDesc.textContent = productData.description || 'Una pieza verdaderamente inefable.';
        detailImage.src = productData.image_url || 'https://images.unsplash.com/photo-1573408301145-b98c46544c64?ixlib=rb-4.0.3&w=1200';

        const isOutOfStock = productData.stock <= 0;

        if (isOutOfStock) {
            stockBadge.classList.remove('hidden');
            addBtn.disabled = true;
            addBtn.innerHTML = `Temporalmente Agotado`;
            btnMinus.disabled = true;
            btnPlus.disabled = true;
            selectedQuantity = 0;
            qtyDisplay.textContent = 0;
        } else {
            if (productData.stock <= 4) {
                lowStockWarning.classList.remove('hidden');
                lowStockWarning.textContent = `¡Solo quedan ${productData.stock}!`;
            }
        }

        // Hide loader, show content
        loadState.classList.add('hidden');
        prodContent.classList.remove('hidden');
    }

    function showError() {
        loadState.classList.add('hidden');
        errState.classList.remove('hidden');
    }

    // 4. Quantity Adjustments
    btnMinus.addEventListener('click', () => {
        if (!productData || productData.stock <= 0) return;
        if (selectedQuantity > 1) {
            selectedQuantity--;
            qtyDisplay.textContent = selectedQuantity;
        }
    });

    btnPlus.addEventListener('click', () => {
        if (!productData || productData.stock <= 0) return;
        if (selectedQuantity < productData.stock) {
            selectedQuantity++;
            qtyDisplay.textContent = selectedQuantity;
        } else {
            // Flash a warning color if they reach the ceiling
            const originalColor = qtyDisplay.className;
            qtyDisplay.classList.add('text-red-500');
            setTimeout(() => qtyDisplay.classList.remove('text-red-500'), 500);
        }
    });

    // 5. Connect Add to Cart POST Logic
    addBtn.addEventListener('click', async () => {
        if (!productData || productData.stock <= 0) return;

        if (!currentUserToken) {
            // Require Login Flow interception
            window.location.href = `/login.html`;
            return;
        }

        const originalText = addBtn.innerHTML;
        addBtn.innerHTML = `<svg class="w-6 h-6 animate-spin shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> <span>Procesando...</span>`;
        addBtn.disabled = true;

        try {
            const response = await fetch(`${API_URL}/cart/item`, {
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
                    quantity: selectedQuantity
                })
            });

            if(!response.ok) throw new Error("Error Red");

            addBtn.classList.add('bg-green-600', 'hover:bg-green-700');
            addBtn.classList.remove('btn-primary');
            addBtn.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> <span>Pieza Asegurada</span>`;
            
            // Dispatch a reload for the nav to pickup new items
            const event = new Event('cartUpdatedEvt');
            document.dispatchEvent(event);

            setTimeout(() => {
                addBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                addBtn.classList.add('btn-primary');
                addBtn.innerHTML = originalText;
                addBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error(error);
            addBtn.innerHTML = `<span>Error conectando</span>`;
            setTimeout(() => { 
                addBtn.innerHTML = originalText;
                addBtn.disabled = false; 
            }, 2000);
        }
    });

    // GO!
    loadItem();
});
