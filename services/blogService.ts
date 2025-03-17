import { db } from '../db/index';
import { blogPosts } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { AppError } from '../utils/errorHandler';

/**
 * Service for handling blog post operations
 */
export class BlogService {
  /**
   * Get all published blog posts
   */
  async getPublishedPosts() {
    const posts = await db.query.blogPosts.findMany({
      where: eq(blogPosts.published, true),
      orderBy: [desc(blogPosts.publishedAt)],
      columns: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        // featuredImage: true,
        tags: true
      }
    });

    return posts || [];
  }

  /**
   * Get a specific blog post by slug
   */
  async getPostBySlug(slug: string) {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);

    if (!post) {
      throw new AppError('Blog post not found', 404);
    }

    return post;
  }

  /**
   * Get all blog posts (admin)
   */
  async getAllPosts() {
    const posts = await db.query.blogPosts.findMany({
      orderBy: [desc(blogPosts.createdAt)]
    });

    return posts || [];
  }

  /**
   * Get a specific blog post by ID (admin)
   */
  async getPostById(id: number) {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, parseInt(id.toString())))
      .limit(1);

    if (!post) {
      throw new AppError('Blog post not found', 404);
    }

    return post;
  }

  /**
   * Create a new blog post
   */
  async createPost(postData: {
    title: string;
    content: string;
    excerpt?: string;
    metaDescription?: string;
    tags?: string[];
    featuredImage?: string;
    published?: boolean;
  }) {
    const { title, content, excerpt, metaDescription, tags, published = false } = postData;

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    // Create insert data object with only the columns that exist in the schema
    const insertData = {
      title,
      content,
      excerpt: excerpt || content.substring(0, 160) + '...',
      metaDescription: metaDescription || excerpt || content.substring(0, 160) + '...',
      slug,
      // Use published_at instead of publishedAt if that's how it's defined in your schema
      // or omit it if it's auto-generated
      tags: tags || [],
      published,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Handle publishedAt separately if needed
    if (published) {
      // Use direct column reference to avoid TypeScript errors
      // This assumes your schema has a published_at column
      insertData[blogPosts.publishedAt.name] = new Date();
    }

    // Create the new post
    const [newPost] = await db.insert(blogPosts).values(insertData).returning();

    return newPost;
  }

  /**
   * Update an existing blog post
   */
  async updatePost(
    id: number,
    postData: {
      title: string;
      content: string;
      excerpt?: string;
      metaDescription?: string;
      tags?: string[];
      featuredImage?: string;
      published?: boolean;
    }
  ) {
    const { title, content, excerpt, metaDescription, tags, published } = postData;

    // Create update data with only valid schema columns
    const updateData = {
      title,
      content,
      excerpt: excerpt || content.substring(0, 160) + '...',
      metaDescription: metaDescription || excerpt || content.substring(0, 160) + '...',
      slug: title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-'),
      tags: tags || [],
      published,
      updatedAt: new Date()
    };

    // Handle publishedAt separately
    if (published !== undefined) {
      // Use column reference directly to avoid TypeScript errors
      updateData[blogPosts.publishedAt.name] = published ? new Date() : null;
    }

    // Update the post
    const [updatedPost] = await db.update(blogPosts).set(updateData).where(eq(blogPosts.id, id)).returning();

    if (!updatedPost) {
      throw new AppError('Blog post not found', 404);
    }

    return updatedPost;
  }

  /**
   * Delete a blog post
   */
  async deletePost(id: number) {
    const [deletedPost] = await db.delete(blogPosts).where(eq(blogPosts.id, id)).returning();

    if (!deletedPost) {
      throw new AppError('Blog post not found', 404);
    }

    return { message: 'Blog post deleted successfully', post: deletedPost };
  }
}
