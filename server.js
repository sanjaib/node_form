const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectId
const Joi = require('joi')
const { swaggerUi, specs } = require('./swagger')


const app = express();
const atlasConnectionUri = 'mongodb://localhost:27017/formDataDB';


// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));


// Routes
//---------------------------------------------------------------------------------------------------------------------------------------


// POST route handler
/**
 * @swagger
 * /create:
 *   post:
 *     summary: Create a form
 *     description: author provides attributes for the form
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: 
 *                 type: string
 *               type:
 *                  type: string
 *             required:
 *               - name
 *               - type
 *     responses:
 *       200:
 *         description: Resource created
 *       500:
 *         description: Internal Server error
 */

app.post('/create', async(req,res) => {
    const data = req.body; // data: { name: 'form1', formdata: [ { name: 'name', type: 'string' } ] }
    data.responses = [];


    const nameSchema = Joi.string()
    .regex(/^[A-Z][a-zA-Z]*$/)
    .required()
    .error(new Error('Name should start with a capital letter and contain only letters'));
    const { error } = nameSchema.validate(req.body.name);

     if (error) {
    // Return error response
    return res.status(400).json({ error: error.message });                                                        
    }                                                                                                             
                                                                                                                

    const client = new MongoClient(atlasConnectionUri, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();
        const db = client.db('formDataDB'); 
        const collection = db.collection('formdatas'); 
        // console.log(data);

        const result = await collection.insertOne(data);
    } catch (error) {
        // console.error('Error inserting data:', error);
        res.status(500).send('Internal Server Error');

    } finally {
        await client.close();
        res.status(201).send('Resource created');
    }
});



//---------------------------------------------------------------------------------------------------------------------------------------



//VIEW FORMS
app.get('/formlist', async (req, res)=>{
    const client = new MongoClient(atlasConnectionUri, { useNewUrlParser: true, useUnifiedTopology: true });
    const data = [];
    try {
        await client.connect();

        const db = client.db('formDataDB'); 
        const collection = db.collection('formdatas'); 
        const result = collection.find();
        const formlist = await result.toArray();
        
        console.log(formlist);
        formlist.forEach((form)=>{
            const formdata= {};
            formdata.id = form._id;
            formdata.name = form.name;
            data.push(formdata);
        })
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send('Internal Server Error');

    } finally {
        await client.close();
        res.status(200).send(data);
    }
});


//---------------------------------------------------------------------------------------------------------------------------------------


//VIEW RESPONSE
app.get('/responses', async (req, res)=>{
    const client = new MongoClient(atlasConnectionUri, { useNewUrlParser: true, useUnifiedTopology: true });
    const data = [];
    const searchTerm = req.query.id;
    try {
        await client.connect();
        const db = client.db('formDataDB'); 
        const collection = db.collection('formdatas');
        
        console.log(searchTerm);
        const result = await collection.findOne({ _id: new ObjectId(searchTerm) });
        console.log(result);
        res.status(200).send(result.responses);
    
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send('Internal Server Error');

    } finally {
        await client.close();
    }
});


//---------------------------------------------------------------------------------------------------------------------------------------


//ADD RESPONSE
app.post('/response', async(req,res) => {
    const data = req.body; // data: { name: 'form1', formdata: [ { name: 'name', type: 'number' } ] }
    const client = new MongoClient(atlasConnectionUri, { useNewUrlParser: true, useUnifiedTopology: true });

    try {
        await client.connect();

        const db = client.db('formDataDB'); 
        const collection = db.collection('formdatas'); 
        console.log("USER DATA: ",data);
        await collection.findOneAndUpdate(
            { _id: new ObjectId(data.id) },   // Filter
            // { name : 'biodata'},
            { $push: { responses: data.response } },        // Add hobby to hobbies array
            { returnOriginal: true },                // Return updated document
            (err, result) => {
                if (err) {
                    console.error('Error adding response:', err);
                    // res.status(500).send('Internal Server Error');
                    return;
                }    
                res.status(201).send('Resource created');  
              
            }
        );
    } catch (error) {
        console.error('Error inserting data:', error);
        await client.close();
        res.status(500).send('Internal Server Error');

    } finally {
        await client.close();
        res.status(201).send('Resource created');
    }
});


// Start server
const PORT = 9000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;