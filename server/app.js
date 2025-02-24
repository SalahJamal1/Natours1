const express = require('express');
const cookieParser = require('cookie-parser');
const sanitize = require('express-mongo-sanitize');
const ratelimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const morgan = require('morgan');
const xssclean = require('xss-clean');
const compression = require('compression');
const cors = require('cors');
const { AppError } = require('./utils/AppError');
const tours = require('./routes/tours');
const users = require('./routes/users');
const reviews = require('./routes/reviews');
const bodyParser = require('body-parser');
const router = require('./routes/booke');
const { webhookCheckout } = require('./controller/book');

//////////////
const app = express();

app.use(helmet());

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://natours-mernstack-b14j.vercel.app',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
};
app.use(morgan('dev'));
app.use(cors(corsOptions));

app.post(
  '/webhooke',
  express.raw({ type: 'application/json' }),
  webhookCheckout,
);

app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

app.use(sanitize());
app.use(xssclean());

app.use(
  ratelimit({
    max: 100,
    windowMs: 3 * 60 * 1000,
    message: 'please try again after 3 mintus',
    keyGenerator: (req, res) => {
      return req.ip;
    },
  }),
);

app.use(hpp());
app.use('/api/v1/tours', tours);
app.use('/api/v1/users', users);
app.use('/api/v1/reviews', reviews);
app.use('/api/v1/booking', router);
app.use('/', (req, res) => {
  res.send('hello');
});
app.all('*', (req, res, next) => {
  next(new AppError(`We cant find the ${req.originalUrl}`, 404));
});

app.use((err, req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      stack: err.stack,
    });
  } else res.send(`${err} ${err.message}`);
});

module.exports = app;
