import { Controller, Get } from "@nestjs/common";
import openApiDocument from "@pioneer/contracts/openapi/v1.json" with { type: "json" };

@Controller("api/v1")
export class ContractsController {
  @Get("openapi.json")
  openApi(): unknown {
    return openApiDocument;
  }
}
