import {defineStore} from "pinia";
import type {CartItemDetail, Product} from "~/types";
import {computeVariantPrice} from "~/utils/common";
import {getProductsForCart, getProductStock} from "~/apis";
import {computeImageUrl} from "~/utils/computeImageUrl";
import {toast} from "vue3-toastify";
import {apiClient} from "~/libs/apiClient";

interface CartItem {
    product_id: number,
    variation_id: number,
    quantity: number,
}

interface CartState {
    showCart: Boolean,
    items: Array<CartItem>,
    cartProducts: Array<Product>,
    isLoaded: boolean,
}

export const useCartStore = defineStore('cart', {
    state: () => {
        const state: CartState = {
            showCart: false,
            items: [],
            cartProducts: [],
            isLoaded: false,
        }
        return state;
    },
    getters: {
        cartItems(state): CartItemDetail[] {

            let products = state.cartProducts;

            if (products.length == 0) {
                return [];
            }

            /*const availableCartProducts = this.items.filter(item => {
                return products.find((el) => el.id === item.product_id);
            })*/

            const cartData: CartItemDetail[] = [];

            for (const item of this.items) {

                const product = products.find((el) => el.id === item.product_id)

                if (!product) {
                    continue;
                }

                const variation = product.variations.find((el) => el.id === item.variation_id)

                if (!variation) {
                    continue;
                }

                const price = computeVariantPrice(variation, product)

                //return cart products
                let cartItem: CartItemDetail = {
                    id: product.id,
                    product_id: product.id,
                    name: product.name,
                    slug: product.slug,
                    type: product.type,
                    image_url: product.media.length > 0 ? computeImageUrl(product.media[0]) : '',
                    variation_name: product.variation_name,
                    variation_id: item.variation_id,
                    variation: (product.type === 'variable') ? product.variation_name.split('|').map((item, index) => item + ': ' + variation.name.split('|')[index]).join(',') : '',
                    quantity: item.quantity,
                    weight: Number(product.weight),
                    qty_available: Number(variation.qty_available),
                    is_in_stock: isVariantInStock(product, variation),
                    price,
                    sub_total: item.quantity * price,
                }
                cartData.push(cartItem)
            }
            return cartData;
        },
        /*cartProducts: function (state) {
            return state.cartProducts
        },*/
        totalCount(state): number {
            return state.items.length;
        },
        totalPrice() {
            let cartProducts = this.cartItems;

            return cartProducts.reduce((total: number, item) => {
                total += Number(item.price) * item.quantity;
                return total;
            }, 0)
        },
        totalShippingWeight() {

            return this.cartItems.reduce((total: number, item) => {
                total += Number(item.weight) * item.quantity;
                return total;
            }, 0)
        },
    },
    actions: {
        openCartMenu() {
            this.showCart = true;
        },
        closeCartMenu() {
            this.showCart = false;
        },
        removeAll() {
            this.items = [];
        },
        async addToCart(val: { variation_id: number, quantity: number, product_id: number }, product?: Product) {
            //check if product is in stock
            const productStock = await getProductStock(val.product_id, val.variation_id);
            if (productStock && Number(productStock) < val.quantity) {
                toast.error('Product is out of stock');
                return 'failed';
            }
            /* add to cart */
            if (!this.items.length) {
                this.items.push(val)
            } else {
                const existingProduct = this.items.find((item) => item.variation_id === val.variation_id)
                if (existingProduct) {
                    this.items.splice(this.items.indexOf(existingProduct), 1, val)
                } else {
                    this.items.unshift(val)
                }
            }
            toast.success('Product added to Cart');
            await this.getCartProducts();
            //open cart panel
            // this.showCart = true;
            //await dispatch('postToSever')
            return 'success';
        },
        async setCartItems(value: CartItem[]) {
            this.items = value;
            await this.getCartProducts();
        },
        removeCartItem(variationId: number) {
            this.items = this.items.filter(item => item.variation_id !== variationId);
        },
        updateQuantity(cart: CartItemDetail, quantity: number) {
            const item = this.items.find((item) => item.variation_id === cart.variation_id)
            if (item) {
                item.quantity = quantity;
            }
        },
        async getCartProducts() {

            try {
                let params: { per_page: number, ids?: string } = {per_page: 100};

                let ids = this.items.map(item => item.product_id);

                if (ids) {
                    params.ids = ids.join(',');
                }

                const data = await getProductsForCart(params);

                this.cartProducts = data.data;

                //remove those products are hidden

                this.items = this.items.filter(item => {
                    return data.data.find(p => p.id === item.product_id)
                })

                this.isLoaded = true;

            } catch (e) {

            }

        },
        async sync() {
            try {

                let data = await apiClient('/cart-items')
                let {cart} = data;

                const mergedArray = [...cart, ...this.items];

                if (mergedArray.length) {
                    let mergedItems: CartItem[] = [];
                    mergedArray.forEach(item => {
                        let existingItem = mergedItems.find(i => i.variation_id === item.variation_id);
                        if (existingItem) {
                            existingItem.quantity = existingItem.quantity + item.quantity;
                        } else {
                            mergedItems.push(item)
                        }
                    })
                    this.items = mergedItems;
                    //now remove from localstorage
                    window.localStorage.removeItem('cart')
                }

                //we don't want to wait
                this.getCartProducts().catch(er => {
                });

            } catch (e) {

            }
        },
    }
})
