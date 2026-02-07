import type { FastifyPluginAsync } from 'fastify';
import { getPrisma } from '../../storage/PrismaClient.js';
import { hashPassword, verifyPassword } from '../../utils/crypto.js';
import { ConflictError, UnauthorizedError } from '../../utils/errors.js';
import { registerSchema, loginSchema, refreshSchema } from '../schemas/common.schema.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  const prisma = getPrisma();

  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: { email: body.email, passwordHash, name: body.name },
    });

    const accessToken = await reply.jwtSign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' },
    );
    const refreshToken = await reply.jwtSign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' },
    );

    return reply.status(201).send({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    });
  });

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await reply.jwtSign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '15m' },
    );
    const refreshToken = await reply.jwtSign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' },
    );

    return reply.send({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    });
  });

  app.post('/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    try {
      const decoded = app.jwt.verify<{ sub: string; type: string }>(body.refreshToken);
      if (decoded.type !== 'refresh') throw new UnauthorizedError('Invalid refresh token');

      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) throw new UnauthorizedError('User not found');

      const accessToken = await reply.jwtSign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '15m' },
      );
      const refreshToken = await reply.jwtSign(
        { sub: user.id, type: 'refresh' },
        { expiresIn: '7d' },
      );

      return reply.send({ accessToken, refreshToken });
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  });

  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, email: true, name: true, role: true, avatar: true, createdAt: true },
    });
    if (!user) throw new UnauthorizedError('User not found');
    return reply.send(user);
  });
};
