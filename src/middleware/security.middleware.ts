import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';



@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff'); // prevent MIME type sniffing
    res.setHeader('X-Frame-Options', 'DENY'); // prevent clickjacking
    // X-XSS-Protection is obsolete in modern browsers, omit to avoid header noise
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); // HSTS
    // Explicitly allow only same-origin network calls; Highcharts requires inline styles and scripts
    // If you host assets from a CDN, extend the sources accordingly.
    res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); // prevent referrer leakage
    
    // Remove server information
    res.removeHeader('X-Powered-By'); // remove server information
    
    next();
  }
} 