/**
 * DOM utility functions for element manipulation and theme detection
 */

/** Toggle a CSS class on an HTML element */
export function toggleClass(element: HTMLElement, className: string): void {
	element.classList.toggle(className);
}

/** Check if an HTML element has a specific CSS class */
export function elementHasClass(element: HTMLElement, className: string): boolean {
	return element.classList.contains(className);
}

/** Check if the root element is in dark mode */
export function rootInDarkMode(): boolean {
	return document.documentElement.getAttribute("data-theme") === "dark";
}

/** Get the current theme from the root element */
export function getCurrentTheme(): "light" | "dark" {
	return rootInDarkMode() ? "dark" : "light";
}

/** Set the theme on the root element */
export function setTheme(theme: "light" | "dark"): void {
	document.documentElement.setAttribute("data-theme", theme);
}
