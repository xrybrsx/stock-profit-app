import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const origin = request.headers['origin'] as string | undefined;
    const host = request.headers['host'] as string | undefined;
    
    // Get API key from environment variable
    const validApiKey = process.env.API_KEY;

    // If server does not define an API key OR request is same-origin, allow.
    // Same-origin check: missing Origin header or Origin host === Host header or matches FRONTEND_URL
    const frontendUrl = process.env.FRONTEND_URL;
    const isSameOrigin = (() => {
      if (!origin) return true; // browser won't send Origin for same-origin navigations sometimes
      try {
        const o = new URL(origin);
        if (host && o.host === host) return true;
      } catch {}
      if (frontendUrl) {
        try { return new URL(origin).origin === new URL(frontendUrl).origin; } catch {}
      }
      return false;
    })();
    if (!validApiKey || isSameOrigin) {
      return true;
    }

    // Otherwise require a matching key
    if (!apiKey || apiKey !== validApiKey) {
      const clientId = request.ip || request.connection?.remoteAddress;
      const path = request.originalUrl || request.url;
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[AUTH] 401 Invalid or missing API key | ip=${clientId} path=${path}`);
      }
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
} 