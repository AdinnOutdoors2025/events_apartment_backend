require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/Admin/authRoutes");
const apartmentRoutes = require('./routes/Admin/apartmentRoutes');
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
// route
app.use("/admin", authRoutes);
app.use('/admin', apartmentRoutes);
app.get("/", (req, res) => {
  res.send("API Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});