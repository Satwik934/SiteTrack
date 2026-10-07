import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import employeeRoutes from "./routes/employeeRoutes";
import companyRoutes from "./routes/companyRoutes";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/company", companyRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "SiteTrack API is running",
  });
});

app.use(
  (
    error: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (
      error instanceof SyntaxError &&
      "type" in error &&
      error.type === "entity.parse.failed"
    ) {
      res.status(400).json({
        message: "Request body must be a valid JSON object.",
      });
      return;
    }

    next(error);
  }
);

export default app;
