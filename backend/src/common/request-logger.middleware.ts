import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const tenantId = (req as any).user?.tenantId || '-';
      this.logger.log(
        `[${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms tenant=${tenantId}`,
      );
    });

    next();
  }
}
