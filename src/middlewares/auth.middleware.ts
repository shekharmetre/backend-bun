import { Context } from 'elysia';
import { ApiResponse } from '../utils/apiResponse';
import { verifySupabaseToken } from '../utils/helper';

export const ssoMiddleware = async ({ request, set }: Context) => {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];
  console.log(token,"from baken ddara")

  console.log(token, "🔑 Token received");

  if (!token) {
    set.status = 401;
    return ApiResponse.error("🔒 Token not found", 401);
  }
  const result = verifySupabaseToken(token);

  if (!result.user || result.error) {
    set.status = 401
    return ApiResponse.error(result.error || 'User not found', 401);
  }
  set.status = 200

  // ✅ Optional: verify token if needed (e.g., with JWT)
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Optionally attach token or user to request locals for downstream use
  // request.locals.user = decoded;

  // ✅ Continue request if token is found
};
