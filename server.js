const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);


require("dotenv").config();
const path = require("path");   
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/Admin/authRoutes");
const apartmentRoutes = require('./routes/Admin/ApartmentRoutes/apartmentRoutes');
const apartmentEventRoutes = require("./routes/Admin/EventRoutes/eventRoutes")
const apartmentOrderRoutes = require("./routes/Admin/EventRoutes/eventOrderRoutes")
const elementQuotationRoutes = require("./routes/Admin/EventRoutes/eventElementQuotationRoutes")
const userRoutes = require("./routes/Admin/UserRoutes/userRoutes")
const gstDetailRoutes = require('./routes/Admin/GstDetailRoutes/gstDetailRoutes');
const elementsMaster = require('./routes/Admin/ElementsRoutes/ElementsMasterRoutes')


const userClientRoutes = require("./routes/client/UserRoutes/UserRoutes")
const userProfileRoutes = require("./routes/client/UserProfileRoutes/UserProfileRoutes")
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "public")));
// Admin route
app.use("/admin", authRoutes);
app.use('/admin', apartmentRoutes);
app.use('/admin', apartmentEventRoutes);
app.use('/admin', apartmentOrderRoutes);
app.use('/admin', elementQuotationRoutes);
app.use('/gstdetails', gstDetailRoutes);
app.use('/admin', elementsMaster);
app.use('/admin', userRoutes);


// User route

app.use('/user', userClientRoutes);
app.use('/user', userProfileRoutes)

app.get("/", (req, res) => {
  res.send("API Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});