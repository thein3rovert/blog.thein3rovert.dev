import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

function removeDupsAndLowerCase(array: string[]) {
  return [...new Set(array.map((str) => str.toLowerCase()))];
}

const baseSchema = z.object({
  // Defines an object schema with a title property that is a string and must not exceed 60 characters
  title: z.string().max(60),
});

const post = defineCollection({
  loader: glob({ base: "./src/content/post", pattern: "**/*.{md,mdx}" }),
  schema: ({ image }) =>
    baseSchema.extend({
      description: z.string(),
      // 'z' refers to the Zod library being used to define and validate schemas in a TypeScript-friendly way
      coverImage: z
        .object({
          alt: z.string(),
          src: image(),
        })
        .optional(),
      draft: z.boolean().default(false),
      ogImage: z.string().optional(),
      tags: z.array(z.string()).default([]).transform(removeDupsAndLowerCase),
      publishDate: z
        .string()
        .or(z.date())
        .transform((val) => new Date(val)),
      updatedDate: z
        .string()
        .optional()
        .transform((str) => (str ? new Date(str) : undefined)),
    }),
});

// Configure for markdown blog note
const note = defineCollection({
  // Configure loader to find markdown and MDX files in the specified directory
  loader: glob({ base: "./src/content/note", pattern: "**/*.{md,mdx}" }),
  schema: baseSchema.extend({
    // Optional description field for notes
    description: z.string().optional(),
    publishDate: z
      .string()
      // Enforce ISO 8601 date string format, allowing for time zone offsets
      .datetime({ offset: true })
      // Transform the validated date string into a JavaScript Date object
      .transform((val) => new Date(val)),
  }),
});

export const collections = { post, note };
