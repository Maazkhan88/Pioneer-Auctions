import { SetMetadata } from "@nestjs/common";

export const REQUIRED_PERMISSION_METADATA = "pioneer:required-permission";

export function RequirePermission(permission: string): MethodDecorator {
  return SetMetadata(REQUIRED_PERMISSION_METADATA, permission);
}
