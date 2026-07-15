import { Injectable } from "@nestjs/common";

import { type Environment, readEnvironment } from "./environment.js";

@Injectable()
export class EnvironmentService {
  readonly values: Environment = readEnvironment();
}
