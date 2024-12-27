import { Router, RequestHandler} from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prisma from '../../db/index';
import 'dotenv/config';

const router = Router();
const SECRET: string = process.env.SECRET as string;

// middleware
const loggedMiddleware: RequestHandler = (req, res, next) => {
    const auth = req.headers.authorization || '';

    const parts = auth.split(' ');

    if(parts.length != 2) {
        res.status(401).send();
        return;
    }

    const [prefix, token] = parts;

    if(prefix !== 'Bearer') {
        res.status(401).send();
        return;
    }

    jwt.verify(token, SECRET, (error, decoded) => {
        if(error) {
            return res.status(401).send(error);
        }

        res.locals.id = (decoded as jwt.JwtPayload).id;

        next();
    });
};

// route to create a user 
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    const infoNeeded = name || email || password;

    if (!infoNeeded) {
        res.status(401).send('please, fill all the fields.');
        return;
    }

    const user = await prisma.user.findFirst({
        where: {
            email
        },
        select: {
            email: true
        }
    });

    if (user) {
        res.status(400).send('email already in use.');
        return;
    }

    const newUser = await prisma.user.create({
        data: {
            name, 
            email,
            password: bcrypt.hashSync(password, 13)
        }
    });

    const token = jwt.sign({id: newUser.id}, SECRET, {
        expiresIn: '3h'
    });

    res.status(200).send({ newUser, token });
});

// route to log a user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(401).send('please fill all the fields.');
        return;
    }

    const user = await prisma.user.findFirst({
        where: {
            email
        },
        select: {
            id: true,
            name: true,
            email: true,
            password: true
        }
    });

    if (!user) {
        res.status(401).send('user not found.');
        return;
    }

    if (!bcrypt.compareSync(password, user.password)) {
        res.status(401).send('passwords dont match.');
        return;
    }

    const token = jwt.sign({id: user.id}, SECRET, {
        expiresIn: '3h'
    });

    res.status(200).send({ user, token });
});

// route to get all users
router.get('/all', async (req, res) => {
    const users = await prisma.user.findMany({ });

    res.status(200).send({ users });
});

// route to get info of another user
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
        where: {
            id
        },
        select: {
            name: true
        }
    });

    if (!user) {
        res.status(401).send('user doesnt exists.');
    }

    res.status(200).send({ user });
});

// route to get info of logged user
router.get('/:id', loggedMiddleware, async (req, res) => {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
        where: {
            id
        },
        select: {
            name: true
        }
    });

    if (!user) {
        res.status(401).send('user doesnt exists.');
    }

    res.status(200).send({ user });
});

// route to update user info
router.put('/', loggedMiddleware, async (req, res) => {
    const { userId } = res.locals;
    const { name } = req.body;

    if (!name) {
        res.status(401).send('please fill all the fields.');
        return;
    }

    const newUserInfo = await prisma.user.updateMany({
        where: {
            id: userId
        },
        data: {
            name,
            
        }
    });

    if (!newUserInfo.count) {
        res.status(401).send({ update: false });
        return;
    }

    res.status(200).send({ update: true });
});

// route to delete a user 
router.delete('/', loggedMiddleware, async (req, res) => {
    const { userId } = res.locals;

    const deletedUser = await prisma.user.deleteMany({
        where: {
            id: userId
        }
    });

    if (!deletedUser.count) {
        res.status(401).send({ deleted: false });
        return;
    }

    res.status(200).send({ deleted: true });
});

// route to create a message
router.post('/new-message', loggedMiddleware, async (req, res) => {
    const { email, title, content } = req.body;
    const { senderId } = res.locals;

    const user = await prisma.user.findFirst({
        where: {
            email
        }
    });

    if (!user) {
        res.status(404).send('this user doesnt exist.');
        return;
    }

    const newMessage = await prisma.message.create({
        data: {
            recipientId: user.id,
            senderId,
            title,
            content
        }
    });

    res.status(200).send({ newMessage });
});

// route to get messages received
router.get('/message/received', loggedMiddleware, async (req, res) => {
    const { id } = res.locals;

    res.status(200).send({
        result: await prisma.message.findMany({
            where: { 
                recipientId: id
            },
            select: {
                title: true,
                content: true,
                createdAt: true            
            }   
        })
    });
});

// route to get messages sended
router.get('/message/sended', loggedMiddleware, async (req, res) => {
    const { id } = res.locals;

    res.status(200).send({
        result: await prisma.message.findMany({
            where: { 
                senderId: id
            },
            select: {
                title: true,
                content: true,
                createdAt: true            
            }   
        })
    });
});


export default router;