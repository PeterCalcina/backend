import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { HttpException, HttpStatus } from '@nestjs/common';

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita a 100 peticiones por ventana de tiempo
  standardHeaders: 'draft-7', // Devuelve la información de límite de peticiones en los headers `RateLimit-*`
  legacyHeaders: false, // Desactiva los headers `X-RateLimit-*`
  handler: (req: Request, res: Response, next: NextFunction) => {
    next(
      new HttpException(
        'Has superado el límite de solicitudes permitidas. Por favor, inténtalo de nuevo más tarde.',
        HttpStatus.TOO_MANY_REQUESTS
      ),
    );
  }, 
});
