const express = require('express');
const cors = require('cors');

const applicationsRoutes = require('./routes/applications.routes');
const messagesRoutes = require('./routes/messages.routes');
const internalRoutes = require("./routes/internal.routes");
const reviewEligibilityRoutes = require("./routes/reviewEligibility.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.use('/messages', messagesRoutes);
app.use('/', applicationsRoutes);
app.use("/internal", internalRoutes);
app.use("/", reviewEligibilityRoutes);

app.listen(5003, () => {
  console.log('Applications Service running on port 5003');
});
