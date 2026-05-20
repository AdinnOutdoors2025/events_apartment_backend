require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/Admin/authRoutes");
const apartmentRoutes = require('./routes/Admin/ApartmentRoutes/apartmentRoutes');
const apartmentEventRoutes = require("./routes/Admin/EventRoutes/eventRoutes")
const apartmentOrderRoutes = require("./routes/Admin/EventRoutes/eventOrderRoutes")
const userRoutes = require("./routes/Admin/UserRoutes/userRoutes")
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
// route
app.use("/admin", authRoutes);
app.use('/admin', apartmentRoutes);
app.use('/admin', apartmentEventRoutes);
app.use('/admin', apartmentOrderRoutes);
app.use('/user', userRoutes);
app.use(
  "/uploads",
  express.static("uploads")
);
app.get("/", (req, res) => {
  res.send("API Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});