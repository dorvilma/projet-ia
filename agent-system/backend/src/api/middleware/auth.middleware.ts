import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../../utils/errors.js';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    // Allow unauthenticated requests
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  const user = request.user as { role?: string };
  if (user.role !== 'ADMIN') {
    throw new UnauthorizedError('Admin access required');
  }
}
