// src/routes/protected.routes.ts
import { Elysia, t } from 'elysia';
import { ssoMiddleware } from '../middlewares/auth.middleware';

export const protectedRoutes = new Elysia({ prefix: '/protect' })
  .get('/profile', ({ cookie,store }) => {

    // ✅ You now have user object here
    return {
      message: 'You are authenticated!',
    };
  },{
    beforeHandle: ssoMiddleware
  });