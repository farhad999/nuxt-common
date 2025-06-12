import unionBy from 'lodash/unionBy'
import {fetchFilters, fetchProducts} from "~/apis";
import {defineStore} from "pinia";

import type {Brand, Category, Product, ProductDetail, Variation} from "~/types";

interface ProductState {
    productList: Array<Product>,
    productData: null,
    variations: Array<Variation>,
    sidebarFilterStatus: boolean,
    brands: Array<Brand>,
    selectedVariation: null | { [key: string]: string },
    filteredProducts: Array<Product>,
    paginatedProducts: Array<Product>,
    pagination: {
        mode: 'normal' | 'infinite'
        page: number,
        perPage: number,
        totalPages: number,
        total: number,
    },
    filters: {
        category: string,
        price: string,
        variations: { template: string, value: string }[],
        search: string,
        brand: {
            id: number,
            name: string
        }[],
        //offer: string,
    },
    sortBy: string,
    wishlist: Array<Product>,
    category: null | Category,
    subCategory: null | Category,
    subSubCategory: null | Category,
    section: string,
    loading: boolean,
    allBrands: Array<Brand>,
    brand: null | Brand,
    offer: string,
    trendingProducts: Array<Product>,
    newProducts: Array<Product>,
    meta: {
        category: string,
        subCategory: string,
        brand: string,
    },
    compareProducts: Array<Product>,
    quickViewProduct: null | ProductDetail,
    quickView: boolean,
    recentVisitedProducts: Array<Product>,
}

export const useProductStore = defineStore('product', {
    state: () => {
        const state: ProductState = {
            loading: true,
            productList: [],
            productData: null,
            variations: [],
            brands: [],
            selectedVariation: null,
            sidebarFilterStatus: false,
            filteredProducts: [],
            paginatedProducts: [],
            pagination: {
                mode: 'normal',
                page: 1,
                perPage: 20,
                totalPages: 1,
                total: 0,
            },
            filters: {
                category: '',
                price: '',
                variations: [],
                search: '',
                brand: [],
                //offer: '',
            },
            sortBy: '',
            wishlist: [],
            category: null,
            subCategory: null,
            subSubCategory: null,
            section: '',
            allBrands: [],
            brand: null,
            offer: '',
            trendingProducts: [],
            newProducts: [],
            meta: {
                category: '',
                subCategory: '',
                brand: '',
            },
            compareProducts: [],
            quickViewProduct: null,
            quickView: false,
            recentVisitedProducts: [],
        };
        return state;
    },
    getters: {
        products: function (state) {
            return state.productList;
        },
        isWishlisted: (state) => (product: Product | ProductDetail) => {
            return !!state.wishlist.find((item) => item.id === product.id);
        },
        getCompareProductAttributes(state) {

            let products = state.compareProducts;
            let attributes = [];

            products.forEach(item => {
                item.attributes.forEach(att => {
                    attributes.push(att)
                });
            })

            let unionAttributes = unionBy(attributes, 'attribute_name');

            return unionAttributes;
        }
    },
    actions: {
        async getProducts() {
            const route = useRoute();
            try {

                this.loading = true;

                let params: {
                    min_price?: number,
                    max_price?: number,
                    sort_by?: string,
                    category_slug?: string,
                    sub_category_slug?: string,
                    sub_sub_category_slug?: string,
                    brand_id?: number,
                    search_term?: string,
                    page?: number,
                    per_page?: number,
                    variations?: string[],
                    offer_id?: number,
                    section_slug?: string,
                    offer_slug?: string,
                    filter_brand?: string,
                } = {};

                const routeParams = route.params;
                const routeQuery = route.query;

                if (this.filters.price && this.filters.price.length) {
                    let prices = this.filters.price.split('-')
                    params.min_price = Number(prices[0]);
                    params.max_price = Number(prices[1]);
                }

                //sort

                if (this.sortBy && this.sortBy.length) {
                    params.sort_by = this.sortBy;
                }

                if (routeParams.category) {
                    params.category_slug = routeParams.category as string;
                }

                if (routeParams.subCategory) {
                    params.sub_category_slug = routeParams.subCategory as string;
                }

                if (routeParams.subSubCategory) {
                    params.sub_sub_category_slug = routeParams.subSubCategory as string;
                }

                if (this.pagination) {
                    params.per_page = this.pagination.perPage;
                    params.page = this.pagination.page;
                }

                if (this.filters.search && this.filters.search.length) {
                    params.search_term = this.filters.search;
                }

                params.filter_brand = this.filters.brand.map(item => item.id).join(',');

                /*if (routeQuery.brand) {
                    params.filter_brand = this.filters.brand.join(',');
                }*/

                if (routeParams) {
                    params.offer_slug = routeParams.offer as string;
                }

                if (this.filters.variations) {
                    params.variations = this.filters.variations.map(item => item.value);
                }

                if (routeParams.collection) {
                    params.section_slug = routeParams.collection as string;
                }

                const data = await fetchProducts({params});

                this.loading = false;

                if (data) {

                    let productData = data.data || [];

                    this.productData = data;

                    let {total, last_page} = data;

                    if (this.pagination.mode === 'infinite') {
                        this.productList = this.productList.concat(productData);
                    } else {
                        this.productList = productData;
                    }
                    //commit("SET_PRODUCTS", productData)

                    /*this.meta.category = data.value.category;
                    this.meta.subCategory = data.value.sub_category;
                    this.meta.brand = data.value.brand;*/

                    this.pagination = {
                        ...this.pagination,
                        total: total,
                        totalPages: last_page
                    };

                }
                //commit('SET_PAGINATION', {total});

            } catch (err) {
                console.log(err);
            }
        },
        resetPage() {
            this.pagination.page = 1
        },
        resetFilters() {
            //reset pagination to page 1
            this.pagination.page = 1;
            //now reset all filters to initial
            this.filters.variations = [];
            this.filters.brand = [];
            this.filters.price = '';
            this.filters.search = '';

            //now load products
            this.getProducts();
            this.getFilters();
        },

        applyVariation(payload: { template: string, value: string }) {

            /*console.log({payload});

            let variations = this.filters.variations;

            //let index =  variations.find(item => item.template == payload.template);

            let exist = variations.find(item => item.template === payload.template);

            //variations = variations.splice(index, 1);

            console.log({exist});

            if (!exist) {
                this.filters.variations = [...variations, payload];
            } else {
                //remove variation when value is null or same
                if (payload.value == null || exist.value.includes(payload.value)) {
                    this.filters.variations = this.filters.variations(item => item.template !== exist.template);
                    //exist.value = exist.value.filter(val => val != payload.value);
                    return;
                }else {
                    exist.value = [...exist.value,  payload.value];
                }
            }*/

            let index = this.filters.variations.findIndex(item => item.template === payload.template &&
                item.value === payload.value);

            let variations = this.filters.variations;

            if (index > -1) {
                variations.splice(index, 1);
            } else {
                variations = [...variations, payload];
            }

            this.filters.variations = variations;
            this.resetPage();

            this.getProducts();
        },

        resetVariations() {
            this.filters.variations = [];
            this.resetPage();
            this.getProducts();
        },

        removeVariation(template: string, value?: string) {
            let variations = this.filters.variations;
            if (template) {
                let existIndex = variations.findIndex(item => {
                    if (value) {
                        return item.template === template && item.value === value
                    }
                    return item.template === template
                });
                variations = variations.filter((item, index) => index !== existIndex);
            } else {
                variations = [];
            }
            this.filters.variations = variations;
            this.resetPage();
            this.getProducts();
        },
        /*setProductData({state, dispatch, commit}, payload) {
            let {data} = payload;
            commit('SET_PRODUCTS', data);
        },*/

        async getFilters() {

            let params = {};

            if (this.filters.price && this.filters.price.length) {
                let prices = this.filters.price.split('-')
                params.min_price = prices[0];
                params.max_price = prices[1];
            }

            if (this.filters.search) {
                params.search_term = this.filters.search;
            }

            //sort

            if (this.category) {
                params.category_id = this.category;
            }

            if (this.subCategory) {
                params.sub_category_id = this.subCategory;
            }

            if (this.subSubCategory) {
                params.sub_sub_category_id = this.subSubCategory;
            }

            let data = await fetchFilters({params});

            let {variations, brands} = data;

            this.variations = variations;
            this.brands = brands;

        },

        async updatePagination({page, perPage}: { page: number | undefined, perPage: number }) {
            //console.log({page});
            if (page) {
                this.pagination.page = page
            }
            if (perPage) {
                this.pagination.perPage = perPage;
            }
            await this.getProducts();
        },
        setPaginationMode(mode: 'normal' | 'infinite') {
            this.pagination.mode = mode;
        },
        async updateSortBy(sortBy: string) {
            this.sortBy = sortBy;
            await this.getProducts();
        },
        async setPriceRange(price: [number, number]) {
            this.filters.price = `${price[0]}-${price[1]}`;
            await this.getProducts();
            await this.getFilters();
        },
        applyFilter(key: string, value: string | { id: number, name: string }) {

            if (['brand'].includes(key)) {
                //this part will handle for array values
                let values = this.filters[key];
                console.log({values, value});
                if (value && typeof value === 'object') {
                    let exist = values.find(item => item.id === value.id);
                    if (exist) {
                        //now remove the value
                        let index = values.indexOf(exist);
                        values.splice(index, 1);
                        this.filters[key] = values;
                    } else {
                        this.filters[key] = [...this.filters[key], value];
                    }
                } else {
                    this.filters[key] = value ?? '';
                }
            }

            this.resetPage();
            this.getProducts();

        }, removeFilter(key: string, value ?: string | number) {
            if (['brand'].includes(key)) {
                let values = this.filters[key];

                if (values.includes(value)) {
                    //let index = values.indexOf(value);
                    //values.splice(index, 1);
                    this.filters[key] = values.filter(item => item.id !== value);
                }
            } else {
                this.filters[key] = '';
            }

            this.pagination.page = 1;

            this.getProducts();
        },
        applyParams(payload: { query?: object, params?: object }) {

            let {query, params} = payload;

            if (query) {

                //state.filters.price = query.price || '';

                //variation

                //let variation = query.variation || '';

                //state.filters.variation = variation;

                this.filters.search = query.search;
                this.sortBy = query.sort || '';

                //dispatch('filterProducts', {category, price, search, variation})
                //sort

                //dispatch('sortProducts', sort)
                //pagination
                //state.pagination.page = query.page || 1;

                //state.pagination.perPage = query.per_page || 20;

                /*let brandQuery = query.brand || '';

                let brand = this.brands.find(item => item.id === parseInt(brandQuery));

                if (brand) {
                    this.filters.brand = brand;
                } else {
                    this.filters.brand = '';
                }*/
            }

            /*this.getProducts();*/

        },
        toggleFilterSidebar() {
            this.sidebarFilterStatus = !this.sidebarFilterStatus;
        },
        getImages(product: Product) {
            return product.media.map(item => computeImageUrl(item));
        }
    },

});