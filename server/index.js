const keys = require('./keys');

// Express app setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// This app is essentially the object that's going to receive and respond to any http request
const app = express();
// allow us to make request from 1 domain to a completely diff port the api is hosted on
app.use(cors());
// parse incoming requests from the react app and turn the body of the post request into a json value
app.use(bodyParser.json());


// Postgres client setup
const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});

pgClient.on('connect', () => {
  pgClient
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log(err));
});

// Redis client setup
const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();

// Express route handlers
app.get('/', (req, res) => {
  res.send('Hi');
});

// This route handler use to query our running postgres instance and retrieve all diff values that it've ever been submitted
app.get('/values/all', async () => {
  const values = await pgClient.query('SELECT * from values');
  
  res.send(values.rows);
});

// This rh we reach into redis and retrieve all indices submitted and return all the accompanying values that's been calculated for each one
app.get('/values/current', async () => {
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
  });
});

// This rh will receive new values from the react app
app.post('/values', async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  redisClient.hset('values', index, 'Nothing yet!');
  redisPublisher.publish('insert', index);

  // Take the submitted index and permanently stored it in pg
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index])

  res.send({ working: true });
});

app.listen(5000, err => {
  console.log('Listening');
});