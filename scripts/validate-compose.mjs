import { readFile } from "node:fs/promises";

import { parse } from "yaml";

const composePath = new URL("../infra/local/compose.yml", import.meta.url);
const document = parse(await readFile(composePath, "utf8"));

const requiredServices = ["postgres", "redis", "minio", "mailpit"];
const requiredVolumes = [
  "postgres-data",
  "redis-data",
  "minio-data",
  "mailpit-data",
];

if (
  !isRecord(document) ||
  !isRecord(document.services) ||
  !isRecord(document.volumes)
) {
  throw new Error("Compose file must define service and volume maps");
}

for (const serviceName of requiredServices) {
  const service = document.services[serviceName];
  if (!isRecord(service) || !isRecord(service.healthcheck)) {
    throw new Error(`Service ${serviceName} must define a healthcheck`);
  }
}

for (const volumeName of requiredVolumes) {
  if (!(volumeName in document.volumes)) {
    throw new Error(`Named volume ${volumeName} is missing`);
  }
}

console.log("Local Compose structure is valid.");

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
