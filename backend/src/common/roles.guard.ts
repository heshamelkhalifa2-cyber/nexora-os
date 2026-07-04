import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from './roles.decorator';

// يعمل دائمًا بعد JwtAuthGuard (يحتاج req.user موجودًا مسبقًا)
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // لو الـ endpoint ما حدد أدوار، يسمح لأي مستخدم مسجل دخول
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const userRole: Role = req.user?.role;
    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `هذه العملية تتطلب أحد الأدوار التالية: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
