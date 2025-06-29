import crypto from 'crypto';
import { db } from '../config/database';
import { safeQuery } from '../utils/safequery';
import { ApiResponse } from '../utils/apiResponse';
import { generatePaymentToken, getNumericTransactionId, getShortTimestamp, verifyPaymentToken } from '../utils/helper';

export class PaymentController {
  async initPayment(body: any, set: any) {
    const { items, totalPrice, email } = body;

    const missingFields = [];

    if (!items) missingFields.push('items');
    if (!totalPrice) missingFields.push('totalPrice');
    if (!email) missingFields.push('email');

    if (missingFields.length > 0) {
      set.status = 400;
      return ApiResponse.error(
        `You're not authorized. Please complete the following required field(s) and log in again: ${missingFields.join(', ')}`,
        400
        
      );
    }


    const user = await safeQuery(() =>
      db.user.findUnique({
        where: { email },
        select: {
          id: true,
          firstName: true,
          email: true,
          phone: true,
        },
      })
    );

    if (!user) {
      set.status = 403;
      return ApiResponse.error('User not allowed to make payment', 403);
    }

    const orderKey = `${email}-${totalPrice}-${items.length}-${getShortTimestamp()}`;

    // Step 1: Try to find an existing order
    let order = await safeQuery(() =>
      db.order.findFirst({
        where: {
          userId: user.id,
          orderKey,
        },
      })
    );


    // Step 2: If no existing order, create a new one
    if (!order) {
      const txnId = getNumericTransactionId(orderKey); // sync version
      order = await safeQuery(() =>
        db.order.create({
          data: {
            amount: parseFloat(totalPrice),
            txnId,
            status: 'PENDING',
            userId: user.id,
            productInfo: items,
            orderKey,
          },
        })
      );
    }

    if (order?.status === 'SUCCESS') {
      set.status = 409;
      return ApiResponse.error('This order has already been paid.', 409);
    }

    // Step 3: Use order.id as the token (to encode)
    const token = encodeURIComponent(generatePaymentToken(order.id.toString()));


    // Step 4: Prepare PayU hash
    const hashString = `${process.env.PAY_U_PUBLIC_MERCHANT_KEY}|${order.txnId}|${totalPrice}|${JSON.stringify(items)}|${user.firstName}|${user.email}|||||||||||${process.env.PAY_U_PUBLIC_MERCHANT_KEY}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');
    set.status = 200;
    return ApiResponse.success({
      orderId: order.id,
      txnId: order.txnId,
      token,
      hash,
      paymentParams: {
        key: process.env.PAY_U_PUBLIC_MERCHANT_KEY,
        txnid: order.txnId,
        amount: totalPrice || "1",
        productinfo: JSON.stringify(items),
        firstname: user.firstName,
        email: user.email,
        phone: user.phone || '9999999999',
        surl: `${process.env.PORT}/user/payment/success?token=${token}`,
        furl: `${process.env.PORT}/payment/fail`,
        hash,
      },
    });
  }
  async paymentSuccess(body: any, set: any, token: string) {
    try {
      console.log("✅ Success Page Token:", token);

      // Token presence check
      if (!token) {
        set.status = 400;
        return ApiResponse.error("Token is missing. Something went wrong.");
      }

      // Token verification
      const verifiedToken = verifyPaymentToken(token);
      if (!verifiedToken) {
        set.status = 401;
        return ApiResponse.error(
          "Token verification failed. If your account was debited, we'll verify and contact you via email or SMS shortly."
        );
      }

      // Transaction validation
      const { txnid, status } = body;
      const isSuccess = status?.toLowerCase() === "success";

      if (!txnid || !isSuccess) {
        set.status = 400;
        return ApiResponse.error("Invalid transaction data from PayU.");
      }

      // Update order status
      await db.order.update({
        where: { txnId: txnid },
        data: { status: "SUCCESS" },
      });

      // Redirect to frontend success page
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${FRONTEND_URL}/payment/success?token=${token}`,
        },
      });

    } catch (error: any) {
      console.error("❌ Payment Success Error:", error);
      set.status = 500;
      return ApiResponse.error("Something went wrong while confirming your payment. We're working on it.");
    }
  }

  async dummyOne(body: any, set: any) {
    const txnid = `dummy_txn_${Date.now()}`;
    const amount = '1.00';
    const productinfo = JSON.stringify([{ name: 'Test Product', qty: 1 }]);
    const firstname = 'DummyUser';
    const email = 'dummy@example.com';
    const phone = '9999999999';
    const token = encodeURIComponent('dummytoken123');

    const hashString = `${process.env.PAY_U_PUBLIC_MERCHANT_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${process.env.PAY_U_PUBLIC_MERCHANT_KEY}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    set.status = 200;

    return ApiResponse.success({
      orderId: 123456,
      txnId: txnid,
      token,
      hash,
      paymentParams: {
        key: process.env.PAY_U_PUBLIC_MERCHANT_KEY,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone,
        surl: `${process.env.PORT}/user/payment/success?token=${token}`,
        furl: `${process.env.PORT}/payment/fail`,
        hash,
      },
    });
  }



}
