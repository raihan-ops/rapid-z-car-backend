const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const ObjectId = require('mongodb').ObjectId;
var admin = require("firebase-admin");

// firebase admin
var serviceAccount = require("./car-shop-authorization-firebase-adminsdk.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2lkoa.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// jwt token 
async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}

async function run() {
    try {
        await client.connect();
        console.log("database conected");
        const database = client.db('CarShop');
        const CarCollection = database.collection('cars');
        const PurchaseCollection = database.collection('purchase');
        const usersCollection = database.collection('user')
        const ReviewCollection = database.collection('userReview');

        // -----------------------------------------------------------------------------
        // review
        app.post('/reviews', async (req, res) => {
            const addReview = req.body;
            // console.log(appointment);
            const result = await ReviewCollection.insertOne(addReview);
            // console.log(result);
            res.json(result)
        });

        // update
        app.put('/reviews', async (req, res) => {
            const user = req.body;
            // console.log(user);
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await ReviewCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });
        // get all review
        app.get('/reviews', async (req, res) => {
            const cursor = ReviewCollection.find({});
            const service = await cursor.toArray();

            res.send(service);
        })


        // -------------------------------------------------------------------
        // get multiple item
        app.get('/cars', async (req, res) => {
            const cursor = CarCollection.find({});
            const service = await cursor.toArray();

            res.send(service);
        })

        //get single item
        app.get('/cars/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const singleCar = await CarCollection.findOne(query);

            res.send(singleCar);
        })

        // Post a single car
        app.post('/cars', async (req, res) => {
            const addCar = req.body;
            // console.log(appointment);
            const result = await CarCollection.insertOne(addCar);
            // console.log(result);
            res.json(result)
        });

        // delete single car
        app.delete('/cars/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: ObjectId(id) };
            const result = await CarCollection.deleteOne(query);

            res.send(result);
        })
        // update car
        app.put('/cars/:id', async (req, res) => {
            const id = req.params.id;

            const updateValue = req.body;
            console.log(updateValue);

            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    name: updateValue.name,
                    category: updateValue.category,
                    details: updateValue.details,
                    price: updateValue.price,
                    review: updateValue.review,
                    image: updateValue.image
                },
            };
            const cursor = await CarCollection.updateOne(query, updateDoc, options);

            res.json(cursor);
        })



        // ---------------------------------------------------------------------------------------------
        // insert one purchase
        app.post('/purchase', async (req, res) => {
            const purchase = req.body;
            // console.log(appointment);
            const result = await PurchaseCollection.insertOne(purchase);
            console.log(result);
            res.json(result)
        });

        // save user info in mongodb........................
        // post for a single user 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            // console.log(result);
            res.json(result);
        });

        // put for google sign in 
        app.put('/users', async (req, res) => {
            const user = req.body;
            // console.log(user);
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });


        // make admin and also verify user admin or not
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        });

        // get admin 
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        // get user by email 
        app.get('/carlist', verifyToken, async (req, res) => {
            const email = req.query.email;


            const query = { email: email }
            // console.log(query);

            const cursor = PurchaseCollection.find(query);
            const results = await cursor.toArray();
            res.json(results);
        })



        // get all purchaseList
        app.get('/orderlist', async (req, res) => {

            const cursor = PurchaseCollection.find({});
            const results = await cursor.toArray();
            res.json(results);
        })

        // update purchase status
        app.put('/orderlist/:id', async (req, res) => {
            const id = req.params.id;
            const updateStatus = req.body;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: updateStatus.status
                },
            };
            const cursor = await PurchaseCollection.updateOne(query, updateDoc, options);

            res.json(cursor);
        })



        // ----------------------------------------------------------------
        // delete single booking
        // find one
        app.get('/carlist/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: ObjectId(id) };
            const user = await PurchaseCollection.findOne(query);

            res.send(user);
        })
        // delete one
        app.delete('/carlist/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: ObjectId(id) };
            const user = await PurchaseCollection.deleteOne(query);

            res.send(user);
        })


    }
    finally {

    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send(" Car shop is runnig");
})

app.listen(port, () => {

    console.log("server is runnig", port);
})