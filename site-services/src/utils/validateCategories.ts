const validCategories = ['interface', 'feature', 'cosmetic', 'improvement', 'other'];

const areValidCategories = (categories: string[]): boolean => {
    return categories.every((cat: string) => validCategories.includes(cat));
};

export default areValidCategories;