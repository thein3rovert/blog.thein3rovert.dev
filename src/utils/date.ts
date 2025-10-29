import type { CollectionEntry } from "astro:content";
import { siteConfig } from "@/site.config";

/**
 * Format a date using the site's locale configuration
 * @param date - Date to format (returns fallback message if undefined or invalid)
 * @param options - Optional Intl.DateTimeFormatOptions to override defaults
 * @returns Formatted date string
 */
export function getFormattedDate(
	date: Date | undefined,
	options?: Intl.DateTimeFormatOptions,
): string {
	if (!date || isNaN(date.getTime())) {
		return "Invalid Date";
	}

	return new Intl.DateTimeFormat(siteConfig.date.locale, {
		...siteConfig.date.options,
		...options,
	}).format(date);
}

/**
 * Sort collection entries by publish date (newest first)
 * @param a - First collection entry to compare
 * @param b - Second collection entry to compare
 * @returns Comparison result for sorting
 */
export function collectionDateSort(
	a: CollectionEntry<"post" | "note">,
	b: CollectionEntry<"post" | "note">,
): number {
	return b.data.publishDate.getTime() - a.data.publishDate.getTime();
}
