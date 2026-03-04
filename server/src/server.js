const express = require("express");
const cors = require("cors");
const salesRoutes = require("./routes/sales");
const dataManagementRoutes = require("./routes/dataManagement");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", salesRoutes);
app.use("/api/data-management", dataManagementRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});