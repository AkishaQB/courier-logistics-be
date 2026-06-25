import app from "./app";
import "dotenv/config";

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Logistics server running on port ${PORT}`);
});
