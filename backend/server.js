const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/chat', require('./routes/companion'));
app.use('/api/predictions', require('./routes/predictions'));
app.use('/api/groups', require('./routes/groups'));

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});