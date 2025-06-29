import jwt from 'jsonwebtoken';

export function getRouteFromReferer(referer?: string): string {
  if (!referer) return '/';
  console.log(referer)
  try {
    const url = new URL(referer);
    return url.pathname || '/';
  } catch (err) {
    console.error('Invalid referer:', referer);
    return '/';
  }
}



const SUPABASE_JWT_SECRET = process.env.JWT_SECRET!;

export function verifySupabaseToken(token: string) {
  if (!token) {
    return { error: 'Invalid token' };
  }
  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
    return { user: decoded }; // user.sub will be the user ID
  } catch (err) {
    return { error: 'Invalid token' };
  }
}




export const generatePaymentToken = (txnid: string) => {
  return jwt.sign({ txnid }, SUPABASE_JWT_SECRET, { expiresIn: '2m' }); // or '5s'
};

export const verifyPaymentToken = (token: string) => {
  return jwt.verify(token, SUPABASE_JWT_SECRET) as { txnid: string };
};

export function getNumericTransactionId(orderKey: string | number): string {
  const now = Date.now(); // gives a 13-digit timestamp
  const key = typeof orderKey === 'string'
    ? orderKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : Number(orderKey);

  const id = `${key}${now}`.slice(-8); // take last 8 digits
  return `txn_${id}`;
}


export function getShortTimestamp(): string {
  const now = new Date();

  const pad = (n: number) => n.toString().padStart(2, '0');

  const year = now.getFullYear().toString().slice(-2); // Last two digits of year
  const month = pad(now.getMonth() + 1);               // Months are 0-based
  const day = pad(now.getDate());
  const hour = pad(now.getHours());
  const min = pad(now.getMinutes());
  const sec = pad(now.getSeconds());

  return `${year}${month}${day}${hour}${min}${sec}`;
}





