// Validate server.json against the official MCP Registry schema.
// Usage: node scripts/validate-server-json.mjs <path-to-schema.json>
import { readFileSync } from "node:fs";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const schemaPath = process.argv[2];
if (!schemaPath) {
  console.error("usage: validate-server-json.mjs <schema.json>");
  process.exit(2);
}
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const server = JSON.parse(readFileSync(new URL("../server.json", import.meta.url), "utf8"));
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(server)) {
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}
console.log("server.json is valid");
