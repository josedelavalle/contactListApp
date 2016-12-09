// declare modules
var express = require('express');
var app = express();
var mongojs = require('mongojs');
var db = mongojs('contactlist', ['contactlist']);
var bodyparser = require('body-parser');
var multer = require('multer');
var fs = require('fs');

// If port environment variable set use that, otherwise default to 3000
var serverPort = process.env.port || 3000;

// define where to serve HTML from
app.use(express.static(__dirname + "/public"));

app.use(bodyparser.json());


//allow cross origin requests
app.use(function(req, res, next) { 
    res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
    res.header("Access-Control-Allow-Origin", "http://localhost");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//multers disk storage settings
var storage = multer.diskStorage({ 
    destination: function (req, file, cb) {
        cb(null, './public/uploads/')
    },
    filename: function (req, file, cb) {
        var datetimestamp = Date.now();
        cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
    }
});

//multer settings
var upload = multer({ 
    storage: storage
}).single('profilepicture');

//get all contains
app.get('/contactlist', function (req, res) {
	console.log('contact list request');

	db.contactlist.find(function (err, data) {
		console.log('got contacts');
		res.json(data);
	}, function (err) {
		console.log('got error getting data from mongodb');
		console.log(err);
	});

	
});

// add contact route
app.post('/contactlist', function (req, res) {
	
	console.log('add contact');
	db.contactlist.insert(req.body, function(err, data) {
		res.json(data);
	}, function (err) {
		console.log('got error inserting data to mongodb');
		console.log(err);
	});
});


//api route for deleting contact
app.delete('/contactlist/:id/:imagefile', function (req, res) {
	var id = req.params.id;
	var imagefile = req.params.imagefile;
	console.log('delete contact ' + id);
	db.contactlist.remove({_id: mongojs.ObjectId(id)}, function (err, data) {

		// if contact is deleted ... delete the profile picture from server
		if (imagefile != undefined && imagefile != 'undefined') fs.unlink('public/uploads/' + imagefile);

		res.json(data);
	}, function (err) {
		console.log('got error delete data from mongodb');
		console.log(err);
	});
});


//api route for getting single contact to prepopulate edit page
app.get('/contactlist/:id', function (req, res) {
	var id = req.params.id;
	console.log('get contact ' + id);
	db.contactlist.findOne({_id: mongojs.ObjectId(id)}, function (err, data) {
		res.json(data);
	}, function (err) {
		console.log('got error getting data from mongodb');
		console.log(err);
	});
});


//api route for updating existing contact
app.put('/contactlist/:id', function (req, res) {
	var id = req.params.id;
	console.log('updating contact');
	db.contactlist.findAndModify({
		query: {_id: mongojs.ObjectId(id)},
		update: {
					$set: {
						firstname: req.body.firstname,
						lastname: req.body.lastname,
						email: req.body.email,
						phone: req.body.phone,
						birthday: req.body.birthday,
						profilepicture: req.body.profilepicture,
						groups: req.body.groups,
						comments: req.body.comments
					}
				}, new: true},
	function (err, data) {
		res.json(data);
		
	});
});


//api route for uploading file
app.post('/upload', function(req, res) {
    upload(req,res,function(err){
        
        if(err){

             res.json({error_code:1,err_desc:err});
             return;
        }
        filepath = req.file.filename;
        // return the filename to be inserted to db
        res.json({error_code:0,profilepicture:filepath});
    });
});


// listen on specified port for incoming requests
app.listen(serverPort);
console.log('server running on port ' + serverPort)