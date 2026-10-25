import { getAllPosts } from "@/data/post";
import { siteConfig } from "@/site.config";
import rss from "@astrojs/rss";
import { marked } from "marked";

export const GET = async () => {
	const posts = await getAllPosts();

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

	// Sort by publication date (newest first)
	postItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

	return rss({
		title: `${siteConfig.title} - Posts`,
		description: siteConfig.description,
		site: import.meta.env.SITE,
		items: postItems,
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
