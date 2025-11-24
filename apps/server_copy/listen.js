const app = require('./app.js');
const { PORT = 9091 } = process.env;

app.listen(PORT, (err) => {
  if (err) {
    console.log('The server has encountered an error: \n', err);
  } else {
    console.log('Express Socket.IO Server active: Listening on port', PORT);
  }
});
