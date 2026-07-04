import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
  requestId?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'حدث خطأ غير متوقع في الخادم';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
        error = exception.name;
      } else if (typeof response === 'object') {
        const r = response as any;
        message = r.message || message;
        error = r.error || exception.name;
      }
    } else if (exception instanceof Error) {
      // خطأ غير متوقع (Bug/DB error) — لا نُظهر تفاصيله الداخلية للمستخدم، فقط نسجّله
      message = 'حدث خطأ غير متوقع في الخادم';
      this.logger.error(
        `Unhandled exception at ${req.method} ${req.originalUrl}: ${exception.message}`,
        exception.stack,
      );
    }

    // Log كل الأخطاء 4xx/5xx (باستثناء الضجيج المتوقع مثل 401/404 اللي نسجلها بمستوى أخف)
    const requestId = (req as any).requestId;
    if (status >= 500) {
      this.logger.error(`[${requestId}] ${status} ${req.method} ${req.originalUrl} — ${message}`);
    } else if (status >= 400) {
      this.logger.warn(`[${requestId}] ${status} ${req.method} ${req.originalUrl} — ${message}`);
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      error,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      requestId,
    };

    res.status(status).json(body);
  }
}
