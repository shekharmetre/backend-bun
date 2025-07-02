import { Elysia } from 'elysia';
import { userRoutes } from './routes/user.routes';
import { errorHandler } from './middlewares/error.middleware';
import { cors } from '@elysiajs/cors';
import { protectedRoutes } from './routes/protete.routes';
import cookie from '@elysiajs/cookie';
import { ApiResponse } from './utils/apiResponse';
import { testApis } from './routes/test.routes';


const app = new Elysia()
  .use(cookie())
  .use(cors({
    origin: [
      'https://www.bhagyawantimobile.shop',
      'http://localhost:8080',
      'https://5445-2401-4900-93a5-69e5-71b2-141a-6639-447f.ngrok-free.app'
    ],
    credentials: true
  }))
  .use(errorHandler)
  .use(userRoutes)
  .use(protectedRoutes)
  .use(testApis)
  // Root route
  .get('/', () => {
    return ApiResponse.success("✅ Backend is running on Render!");
  })

  // Error handler
  .onError(({ code, error }) => {
    console.error('Global Error Handler:');
    console.error('Code:', code);
    console.error('Message:', error?.message);
    console.error('Stack:', error?.stack);
  });

// ✅ Correct port logic
const port = process.env.PORT  || 8080;
app.listen(port);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
