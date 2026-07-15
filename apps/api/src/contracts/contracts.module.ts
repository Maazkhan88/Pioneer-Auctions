import { Module } from "@nestjs/common";

import { ContractsController } from "./contracts.controller.js";

@Module({ controllers: [ContractsController] })
export class ContractsModule {}
