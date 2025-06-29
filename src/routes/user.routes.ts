// src/routes/user.ts
import { Elysia, t } from 'elysia'
import cors from '@elysiajs/cors'
import { UserController } from '../controllers/user.controller'
import { PaymentController } from '../controllers/payment.controller'
import { db } from '../config/database'
import { safeQuery } from '../utils/safequery'
import { verifyPaymentToken, verifySupabaseToken } from '../utils/helper'
import { ApiResponse } from '../utils/apiResponse'
import { ssoMiddleware } from '../middlewares/auth.middleware'

const userControl = new UserController()
const paymentControler = new PaymentController()

export const userRoutes = new Elysia({ prefix: '/user' })
  .use(cors({
    origin: [
      'https://www.bhagyawantimobile.shop',  // ✅ correct production frontend
      'http://localhost:3000'                // ✅ local dev frontend
    ],
    credentials: true
  }))
  .post(
    '/register',
    async ({ body, set }) => {
      return await userControl.registerUser(body, set)
    },
    {
      body: t.Object({
        firstName: t.String(),
        lastName: t.String(),
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 6 }),
        phone: t.String(),
        address: t.Optional(t.String()),
        useLocation: t.Optional(t.Boolean()),
      }),
    }
  )
  .post(
    '/login',
    async ({ query, body, set }) => {
      const route = query.redirect || '/'
      return await userControl.loginUser(body, set, route)
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )
  .post('/payment/success', async ({ body, set, query }) => {
    const { token } = query
    if (!token) {
      return ApiResponse.error("token not found", 401)
    }
    return await paymentControler.paymentSuccess(body, set, token)
  })

  // 🔐 Protected Routes (use auth middleware here only)
  .group('', (app) =>
    app.use(cors())
      .get('/token-verify', (ctx: any) => {
        const authHeader = ctx.headers['authorization'] || ctx.headers['Authorization'];
        const token = authHeader?.split(' ')[1];

        if (!token) {
          ctx.set.status = 401;
          return ApiResponse.error('Token missing', 401);
        }

        const result = verifySupabaseToken(token);

        if (!result.user || result.error) {
          ctx.set.status = 401;
          return ApiResponse.error(result.error || 'User not found', 401);
        }

        return ApiResponse.success(result.user);
      }, {
        beforeHandle: ssoMiddleware
      })
      .post('/auth/payment', async ({ body, set }) => {
        return await paymentControler.initPayment(body, set)
      }, {
        beforeHandle: ssoMiddleware
      })
      .post('/auth/dummy/payment', async ({ body, set }) => {
        return await paymentControler.dummyOne(body, set)
      })
      .post(
        '/verify-payment',
        async ({ body, set }) => {
          const { token } = body
          if (!token) return ApiResponse.error('Token is missing', 400)

          const verified = verifyPaymentToken(token)
          if (!verified) return ApiResponse.error('Invalid or expired token', 401)
          if (!verified.txnid) return ApiResponse.error('Invalid transaction ID')

          const orderDetail = await safeQuery(() =>
            db.order.findUnique({ where: { id: verified.txnid } })
          )
          if (!orderDetail) return ApiResponse.error('Order not found')

          return ApiResponse.success({ user: orderDetail })
        },
        {
          body: t.Object({ token: t.String() }),
        }
      )
  )
