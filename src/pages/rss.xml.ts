import { getAllPosts } from "@/data/post";
import { getCollection } from "astro:content";
import { siteConfig } from "@/site.config";
import rss from "@astrojs/rss";
import { marked } from "marked";

export const GET = async () => {
	const posts = await getAllPosts();
	const notes = await getCollection("note");

	// Process posts with full content
	const postItems = await Promise.all(
		posts.map(async (post) => {
			// Render markdown content to HTML (handle undefined case)
			const content = post.body ? await renderMarkdownToHtml(post.body) : "";

			return {
				title: post.data.title,
				description: post.data.description,
				pubDate: post.data.publishDate,
				link: `posts/${post.id}/`,
				content, // Include full content
			};
		}),
	);

	// Process notes with full content
	const noteItems = await Promise.all(
		notes.map(async (note) => {
			// Render markdown content to HTML (handle undefined case)
			const content = note.body ? await renderMarkdownToHtml(note.body) : "";

			return {
				title: note.data.title,
				description: note.data.description || note.data.title,
				pubDate: note.data.publishDate,
				link: `notes/${note.id}/`,
				content, // Include full content
			};
		}),
	);

	// Combine posts and notes
	const allItems = [...postItems, ...noteItems];

	// Sort by publication date (newest first)
	allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

	return rss({
		title: `${siteConfig.title} - Posts & Notes`,
		description: siteConfig.description,
		site: import.meta.env.SITE,
		items: allItems,
		customData: `<language>${siteConfig.lang}</language>`,
	});
};

// Helper function to render markdown content to HTML
async function renderMarkdownToHtml(markdown: string): Promise<string> {
	return marked.parse(markdown, {
		gfm: true, // GitHub Flavored Markdown
		breaks: true, // Convert \n to <br>
	});
}
