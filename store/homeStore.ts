import {defineStore} from "pinia";
import {fetchProducts, getHomeData, getTrendingProducts, fetchLatestProducts} from "~/apis";
import type {HomeData, HomeSection, Product} from "~/types";
import {useCategoryStore} from "~/store/categoryStore";


interface HomeState {
    homeData: HomeData,
    //featuredCategories: string[],
    sections: Array<HomeSection>,
    sliders: [],
    isLoaded: boolean,
    trendingProducts: Array<Product>,
    latestProducts: Array<Product>
}

export const useHomeStore = defineStore('home', {
    state: () => {

        const state: HomeState = {
            homeData: {
                featuredCategories: [],
                sections: [],
                sliders: [],
                reviews: [],
            },
            sections: [],
            isLoaded: false,
            sliders: [],
            trendingProducts: [],
            latestProducts: [],
        }
        return state;
    },
    getters: {
        /*getSections(state) {
            let sections = state.data.sections ?? [];
            return sections.slice(0, state.showCount);
        },*/
        featuredCategories() {

            const categoryStore = useCategoryStore();

            let cats: { name: string, slug: string, url: string, image_url: string }[] = [];
            let featuredCats = this.homeData.featuredCategories ?? [];

            featuredCats.forEach((item) => {

                let splitData = item.split('/');

                let cat = categoryStore.categories.find(item => item.slug === splitData[0]);

                if (!cat) {
                    return;
                }

                if (splitData[1]) {
                    cat = cat.children.find(item => item.slug === splitData[1]);
                }

                if (!cat) {
                    return;
                }

                if (cat && splitData[2]) {
                    cat = cat.children.find(item => item.slug === splitData[2]);
                }

                if (!cat) {
                    return;
                }

                cats.push({
                    name: cat.name,
                    slug: cat.slug,
                    url: item,
                    image_url: computeImageUrl(cat.image),
                });

            })

            return cats;

        },
    },
    actions: {
        async fetchHomepageData() {
            const {data, error, status,} = await getHomeData();

            // console.log({error: error.value, status: status.value});

            if (data.value && status.value == 'success') {
                //console.log("success");
                //console.log("data sections", data.value.sections);
                //data.sections;

                //let dd = data.value;

                this.sections = data.value.sections;
                this.sliders = data.value.sliders;
                this.isLoaded = true;
                //this.featuredCategories = data.value.featuredCategories;
                this.homeData = data.value;
            }
            //console.log({data, status, error});

            //debugger
            //this.sections = data?.sections;
        },
        async getTrendingProducts() {
            try {
                const {data, status, error} = await getTrendingProducts();
                if (data.value && status.value == 'success') {
                    this.trendingProducts = data.value.data;
                }
            } catch (e) {

            }
        },
        async getLatestProducts() {
            try {
                const productData = await fetchLatestProducts();
                this.latestProducts = productData.data;
            } catch (e) {
                console.log('product_fetch_error', e);
            }
        },
    }
});