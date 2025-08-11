import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    
    // Get API key from environment variable
    const validApiKey = process.env.API_KEY;

    // If server does not define an API key, allow all (useful for local/dev and container testing)
    if (!validApiKey) {
      // No API key configured on server; allow all requests (likely dev/test)
      return true;
    }

    // Otherwise require a matching key
    if (!apiKey || apiKey !== validApiKey) {
      const clientId = request.ip || request.connection?.remoteAddress;
      const path = request.originalUrl || request.url;
      console.warn(`[AUTH] 401 Invalid or missing API key | ip=${clientId} path=${path}`);
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
} 