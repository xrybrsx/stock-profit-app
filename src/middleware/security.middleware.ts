import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';



@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff'); // prevent MIME type sniffing
    res.setHeader('X-Frame-Options', 'DENY'); // prevent clickjacking
    res.setHeader('X-XSS-Protection', '1; mode=block'); // prevent XSS attacks
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); // prevent HTTP to HTTPS redirect
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"); // prevent XSS attacks
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); // prevent referrer leakage
    
    // Remove server information
    res.removeHeader('X-Powered-By'); // remove server information
    
    next();
  }
} 