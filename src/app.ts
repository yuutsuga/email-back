import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import userRouter from '../src/routes/user';

const app = express();
const PORT = process.env.PORT;

app.use(morgan('dev'));
app.use(cors());

app.use(express.json());
app.use('/user', userRouter);

app.listen(PORT, () => {
    console.log(`running on port: ${PORT}`);
});
