import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const SUPABASE_URL = process.env.SUPABASE_URL;
const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/keys`)
);

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer '))
      throw new UnauthorizedException('Missing token');

    const token = authHeader.split(' ')[1];

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `${SUPABASE_URL}/auth/v1`,
      });

      // Insertar el usuario en request.user
      req['user'] = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      return true;
    } catch (err) {
      console.error('JWT error:', err);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
