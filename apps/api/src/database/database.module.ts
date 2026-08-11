import { Module } from "@nestjs/common";

import { DatabasePool } from "./database.pool.js";

@Module({
  exports: [DatabasePool],
  providers: [DatabasePool],
})
export class DatabaseModule {}
