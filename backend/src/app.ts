import express, { Request } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import routes from "./routes";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import { swaggerSpec } from "./swagger/swagger";

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(morgan(process.env.NODE_ENV === "test" ? "tiny" : "dev"));

  app.use(
    express.json({
      verify: (req: Request, _res, buf: Buffer) => {
        req.rawBody = buf;
      },
    })
  );

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
