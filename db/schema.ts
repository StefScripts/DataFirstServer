import { pgTable, text, serial, integer, boolean, timestamp, date, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').unique().notNull(),
  password: text('password').notNull()
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  token: text('token').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  company: text('company').notNull(),
  message: text('message'),
  date: date('date').notNull(),
  time: text('time').notNull(),
  confirmationToken: text('confirmation_token'),
  confirmed: boolean('confirmed').default(false),
  cancelled: boolean('cancelled').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

export const blockedSlots = pgTable('blocked_slots', {
  id: serial('id').primaryKey(),
  date: date('date').notNull(),
  time: text('time').notNull(),
  reason: text('reason').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow()
});

export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt').notNull(),
  metaDescription: text('meta_description').notNull(),
  authorId: integer('author_id').references(() => users.id),
  published: boolean('published').default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  tags: jsonb('tags').default([]).notNull()
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export const insertBookingSchema = createInsertSchema(bookings);
export const selectBookingSchema = createSelectSchema(bookings);
export type InsertBooking = typeof bookings.$inferInsert;
export type SelectBooking = typeof bookings.$inferSelect;

export const insertBlockedSlotSchema = createInsertSchema(blockedSlots);
export const selectBlockedSlotSchema = createSelectSchema(blockedSlots);
export type InsertBlockedSlot = typeof blockedSlots.$inferInsert;
export type SelectBlockedSlot = typeof blockedSlots.$inferSelect;

export const insertBlogPostSchema = createInsertSchema(blogPosts);
export const selectBlogPostSchema = createSelectSchema(blogPosts);
export type InsertBlogPost = typeof blogPosts.$inferInsert;
export type SelectBlogPost = typeof blogPosts.$inferSelect;

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);
export const selectPasswordResetTokenSchema = createSelectSchema(passwordResetTokens);
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type SelectPasswordResetToken = typeof passwordResetTokens.$inferSelect;
