import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env");

export const loadEnv = () => dotenv.config({ path: rootEnvPath });
