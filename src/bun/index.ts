import { ensureConfig } from "./config";
import { startApiServer } from "./server";

const config = ensureConfig();
startApiServer(config);

