import {defineStore} from "pinia";
import {getCategories} from "~/apis";
import type {Category} from "~/types";

interface CategoryState {
    categories: Category[],
}

export const useCategoryStore = defineStore('category', {
    state: () => {
        const state: CategoryState = {
            categories: [],
        }
        return state;
    },
    getters: {
        getCategoryBySlug(state) {
            return (slug: string, subCat = null, subSubCat = null) => {

                let categories = this.categories;

                let category = categories.find((cat) => {
                    return cat.slug === slug;
                });

                let subCategory = null;

                if (subCat && category) {
                    subCategory = category.children.find((cat) => {
                        return cat.slug === subCat;
                    });
                }

                let subSubCategory = null;
                if (subSubCat && subCategory) {
                    subSubCategory = subCategory.children.find((cat) => {
                        return cat.slug === subSubCat;
                    });

                }

                if (subSubCat) {
                    return subSubCategory;
                }
                if (subCat) {
                    return subCategory;
                }

                return category;

            };
        },
        getCategoryById(state) {
            return (id: number) => {

                let categories = state.categories;

                return categories.find((cat) => {
                    return cat.id === id;
                });
            }
        },
    },
    actions: {
        async getCategories() {
            const {data, error} = await getCategories();
            if (error.value) {
                throw createError({
                    statusCode: 500,
                    statusMessage: 'Failed to load categories',
                    data: {error: e.message},
                });
            }
            if (data.value) {
                this.categories = data.value;
            }
        }
    }
})