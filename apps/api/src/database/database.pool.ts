import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";

import { EnvironmentService } from "../config/environment.service.js";

@Injectable()
export class DatabasePool implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(
    @Inject(EnvironmentService)
    environment: EnvironmentService,
  ) {
    this.pool = new Pool({
      connectionString: environment.values.databaseUrl,
      max: 10,
    });
  }

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, [...values]);
  }

  connect(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
