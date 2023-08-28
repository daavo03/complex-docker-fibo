const keys = require('./keys');
const redis = require('redis');

// Get connection to our redis server
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  // This tell redis client if it ever losses connection it should attempt to auto reconnect once every 1s/1000ms
  retry_strategy: () => 1000
});

const sub = redisClient.duplicate();

// Work function used for calculating the fibonacci values given an index
function fib(index) {
  if (index < 2) return 1;
  // Recursive solution bc is very slow and justify use of redis 
  return fib(index - 1) + fib(index - 2);
}

// Watch redis for any time we get a new value inserted
sub.on('message', (channel, message) => {
  redisClient.hset('values', message, fib(parseInt(message)));
});
sub.subscribe('insert');
