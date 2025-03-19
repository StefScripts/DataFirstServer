import { Router } from 'express';
import { BlogController } from '../controllers/blogController';
import { asyncHandler } from '../utils/errorHandler';
import { requireAuth } from '../middlewares/auth';
import { cacheMiddleware } from '../middlewares/cache';

const router = Router();
const blogController = new BlogController();

// Public routes
router.get('/blog-posts', cacheMiddleware({ duration: 300 }), asyncHandler(blogController.getPublishedPosts));
router.get(
  '/blog-posts/:slug',
  cacheMiddleware({
    duration: 600,
    cacheKey: (req) => `blog-post-${req.params.slug}`
  }),
  asyncHandler(blogController.getPostBySlug)
);

// Admin routes (require authentication)
router.get('/admin/blog-posts', requireAuth, asyncHandler(blogController.getAllPosts));
router.get('/admin/blog-posts/:id', requireAuth, asyncHandler(blogController.getPostById));
router.post('/admin/blog-posts', requireAuth, asyncHandler(blogController.createPost));
router.put('/admin/blog-posts/:id', requireAuth, asyncHandler(blogController.updatePost));
router.delete('/admin/blog-posts/:id', requireAuth, asyncHandler(blogController.deletePost));

export default router;
