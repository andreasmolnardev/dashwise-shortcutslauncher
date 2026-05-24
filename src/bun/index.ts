import "dotenv/config";
import { ensureConfig } from "./config";
import { startApiServer } from "./server";

const config = ensureConfig();
console.log(config)
startApiServer(config);

