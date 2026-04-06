/**
 * Normalize a category string for case-insensitive comparison.
 * Converts to lowercase and trims whitespace.
 */
export function normalizeCategoryForComparison(category: string | null | undefined): string {
    return (category ?? '').toLowerCase().trim();
}

/**
 * Check if two categories are equal (case-insensitive).
 */
export function isCategoryEqual(cat1: string | null | undefined, cat2: string | null | undefined): boolean {
    return normalizeCategoryForComparison(cat1) === normalizeCategoryForComparison(cat2);
}

/**
 * Get unique categories from a list of books (case-insensitive, preserving first occurrence's casing).
 */
export function getUniqueCategoriesFromBooks<T extends { category?: string | null }>(books: T[]): string[] {
    const seen = new Set<string>();
    return books
        .filter(b => b.category)
        .filter(b => {
            const normalized = normalizeCategoryForComparison(b.category);
            if (seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        })
        .map(b => b.category!);
}

/**
 * Deduplicate a list of category strings (case-insensitive, preserving first occurrence's casing).
 */
export function getUniqueCategoryStrings(categories: string[]): string[] {
    const seen = new Set<string>();
    return categories.filter(cat => {
        const normalized = normalizeCategoryForComparison(cat);
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });
}
