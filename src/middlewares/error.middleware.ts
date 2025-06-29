import { Elysia } from 'elysia';

export const errorHandler = new Elysia().onError(({ error, code }) => {
  console.error('Caught by error middleware:', error.message);
});
