// import { Request, Response } from 'express';
// import { BlogService } from '../services/blogService';
// import { AppError, sendSuccessResponse } from '../utils/errorHandler';

// const blogService = new BlogService();

// /**
//  * Controller for blog post endpoints
//  */
// export class BlogController {
//   /**
//    * Get all published blog posts
//    */
//   async getPublishedPosts(req: Request, res: Response) {
//     const posts = await blogService.getPublishedPosts();
//     return sendSuccessResponse(res, posts);
//   }

//   /**
//    * Get a specific blog post by slug
//    */
//   async getPostBySlug(req: Request, res: Response) {
//     const { slug } = req.params;
//     const post = await blogService.getPostBySlug(slug);
//     return sendSuccessResponse(res, post);
//   }

//   /**
//    * Get all blog posts (admin)
//    */
//   async getAllPosts(req: Request, res: Response) {
//     const posts = await blogService.getAllPosts();
//     return sendSuccessResponse(res, posts);
//   }

//   /**
//    * Get a specific blog post by ID (admin)
//    */
//   async getPostById(req: Request, res: Response) {
//     const { id } = req.params;
//     const post = await blogService.getPostById(parseInt(id, 10));
//     return sendSuccessResponse(res, post);
//   }

//   /**
//    * Create a new blog post
//    */
//   async createPost(req: Request, res: Response) {
//     const { title, content, excerpt, metaDescription, tags, featuredImage, published } = req.body;

//     if (!title || !content) {
//       throw new AppError('Title and content are required', 400);
//     }

//     const newPost = await blogService.createPost({
//       title,
//       content,
//       excerpt,
//       metaDescription,
//       tags,
//       featuredImage,
//       published
//     });

//     return sendSuccessResponse(res, newPost, 201);
//   }

//   /**
//    * Update an existing blog post
//    */
//   async updatePost(req: Request, res: Response) {
//     const { id } = req.params;
//     const { title, content, excerpt, metaDescription, tags, featuredImage, published } = req.body;

//     if (!title || !content) {
//       throw new AppError('Title and content are required', 400);
//     }

//     const updatedPost = await blogService.updatePost(parseInt(id, 10), {
//       title,
//       content,
//       excerpt,
//       metaDescription,
//       tags,
//       featuredImage,
//       published
//     });

//     return sendSuccessResponse(res, updatedPost);
//   }

//   /**
//    * Delete a blog post
//    */
//   async deletePost(req: Request, res: Response) {
//     const { id } = req.params;
//     const result = await blogService.deletePost(parseInt(id, 10));
//     return sendSuccessResponse(res, result);
//   }
// }
