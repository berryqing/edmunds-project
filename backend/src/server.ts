import express from "express";
import cors from "cors";
import optionsRouter from "./routes/options";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", optionsRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
