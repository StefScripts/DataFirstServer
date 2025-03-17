import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Express } from 'express';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { randomBytes } from 'crypto';
import * as dotenv from 'dotenv';
import { users } from './db/schema';
import { db } from './db/index';
import { eq } from 'drizzle-orm';
import { AuthService } from './services/authService';

dotenv.config();

const authService = new AuthService();
const PostgresSessionStore = connectPg(session);

/**
 * Setup authentication with Passport and sessions
 */
export function setupAuth(app: Express) {
  // Create session store
  const store = new PostgresSessionStore({
    // Use a direct connection string instead of pool
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    tableName: 'session'
  });

  // Generate a random session secret if not provided
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');

  // Configure session
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      // Configure sameSite for cross-origin requests
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      // If using a custom domain, specify it here
      domain: process.env.COOKIE_DOMAIN || undefined,
      httpOnly: true,
      path: '/'
    }
  };

  // Enable secure cookies in production and trust the proxy
  if (app.get('env') === 'production') {
    app.set('trust proxy', 1);
  }

  // Initialize sessions and Passport
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await authService.getUserByUsername(username);

        if (!user) {
          return done(null, false);
        }

        const isPasswordValid = await authService.comparePasswords(password, user.password);

        if (!isPasswordValid) {
          return done(null, false);
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // User serialization and deserialization
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Create admin user on startup if it doesn't exist
  createAdminUserIfNeeded().catch(console.error);
}

/**
 * Create admin user if it doesn't exist
 */
async function createAdminUserIfNeeded() {
  try {
    const email = 'stefan@datafirstseo.com';
    const existingUser = await authService.getUserByUsername(email);

    if (existingUser) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user with default password (should be changed immediately)
    const adminUser = await authService.createUser(email, 'admin123');
    console.log('Admin user created successfully:', adminUser.username);

    // Remove old admin user if it exists
    const oldAdminUser = await authService.getUserByUsername('admin');
    if (oldAdminUser) {
      await db.delete(users).where(eq(users.username, 'admin'));
      console.log('Old admin user removed successfully');
    }
  } catch (error) {
    console.error('Error setting up admin user:', error);
  }
}
