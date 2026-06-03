import app from "./app";
import { logger } from "./lib/logger";
import { runSeeds } from "./lib/seed";
import { dbConnectionInfo, verifyDbConnection } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function bootstrap(): Promise<void> {
  logger.info(
    {
      host: dbConnectionInfo.host,
      port: dbConnectionInfo.port,
      database: dbConnectionInfo.database,
      user: dbConnectionInfo.user,
    },
    "Database configuration",
  );

  try {
    await verifyDbConnection();
    logger.info("Database connection verified (SELECT 1 ok)");
  } catch (err) {
    logger.error({ err }, "Database connection failed at startup");
    process.exit(1);
  }

  await runSeeds();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

void bootstrap();
