import { db } from "../config/database";
import { supabase } from "../config/supbase";
import { ApiResponse } from "../utils/apiResponse";
import { safeQuery } from "../utils/safequery";
import { serialize } from 'cookie';
export class UserController {
  async registerUser(body: any, set: any) {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      address,
      useLocation,
    } = body;




    if (!email || !password || !firstName) {
      set.status = 400;
      return ApiResponse.error(
        'Required fields missing: email, password, or first name.',
        400
      );
    }

    try {
      // 1. Check if user already exists
      const existing = await safeQuery(
        () => db.user.findUnique({ where: { email } }),
        { retries: 3, timeout: 5000 }
      );

      if (existing) {
        set.status = 409;
        return ApiResponse.error('User already exists with this email.', 409);
      }

      // 2. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (!authData?.user?.id || authError) {
        set.status = 401;
        return ApiResponse.error(
          'Supabase sign-up failed: ' + authError?.message,
          401
        );
      }

      const authId = authData.user.id;

      // 3. Create user in your own database
      const createdUser = await safeQuery(() =>
        db.user.create({
          data: {
            firstName,
            lastName,
            email,
            password, // ✅ Optional: hash this before saving
            phone,
            address,
            useLocation,
            authId,
          },
        })
      );

      return ApiResponse.success(
        {
          message: 'User registered successfully.',
          userId: createdUser.id,
        },
        201
      );
    } catch (err) {
      console.error('Registration error:', err);
      set.status = 500;
      return ApiResponse.error('Internal server error.', 500);
    }
  }
  async loginUser(body: any, set: any, route: string) {
    const { email, password } = body;
    console.log(email, password, "dafjdaslkdflkasdj")
    console.log(route, "routed afasdsfd")

    if (!email || !password) {
      set.status = 400;
      return ApiResponse.error('Email and password are required', 400);
    }

    // 1. Check if user exists
    const existingUser = await safeQuery(() =>
      db.user.findUnique({ where: { email } })
    );

    if (!existingUser) {
      set.status = 404;
      return ApiResponse.error('User not found', 404);
    }

    // 2. Supabase login
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data?.session?.access_token) {
      let message = 'Login failed';

      if (error?.message === 'Email not confirmed') {
        message = 'Email not confirmed';
      } else if (error?.message === 'Invalid login credentials') {
        message = 'Invalid credentials';
      }

      set.status = 401;
      return ApiResponse.error(message, 401);
    }

    // 3. Set cookie
    const cookie = serialize('sb:token', data.session.access_token, {
      httpOnly: true,
      secure: true, // Use `false` for local testing
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'none',
    });

    set.headers = {
      'Set-Cookie': cookie,
    };
    return ApiResponse.success(data.user, 200, route);
  }
}
