import app from "./app";
import "dotenv/config";
import { startLogisticsPushEtlInterval } from "./services/etl.service";

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Logistics server running on port ${PORT}`);
  // Start background push ETL job (running every 1 minute for testing)
  startLogisticsPushEtlInterval(60000);
});
