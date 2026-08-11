import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { IdentityService } from "./identity.service.js";

@Module({
  exports: [IdentityService],
  imports: [DatabaseModule],
  providers: [IdentityService],
})
export class IdentityModule {}
