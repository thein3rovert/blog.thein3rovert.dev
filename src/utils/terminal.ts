import type { CollectionEntry } from "astro:content";
import { siteConfig } from "@/site.config";

export function getWordCount(content: string): number {
	const cleanContent = content
		.replace(/---[\s\S]*?---/, "") // Remove frontmatter
		.replace(/```[\s\S]*?```/g, "") // Remove code blocks
		.replace(/`[^`]*`/g, "") // Remove inline code
		.replace(/[#*_\[\]()]/g, "") // Remove markdown syntax
		.replace(/!\[.*?\]\(.*?\)/g, "") // Remove images
		.replace(/\[.*?\]\(.*?\)/g, "") // Remove links
		.replace(/\s+/g, " ") // Normalize whitespace
		.trim();

	return cleanContent.split(" ").filter((word) => word.length > 0).length;
}

// Function to format date in stat format (YYYY-MM-DD HH:MM:SS -0600)
export function formatStatDate(date: Date): string {
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	const hours = date.getHours().toString().padStart(2, "0");
	const minutes = date.getMinutes().toString().padStart(2, "0");
	const seconds = date.getSeconds().toString().padStart(2, "0");
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} -0600`;
}
