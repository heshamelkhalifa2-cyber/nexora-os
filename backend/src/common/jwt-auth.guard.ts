import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('التوكن مفقود');
    }
    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwt.verify(token);
      req.user = payload; // { sub, tenantId, email, role }
      return true;
    } catch {
      throw new UnauthorizedException('التوكن غير صالح أو منتهي');
    }
  }
}
