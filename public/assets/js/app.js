var app = angular.module('contactListApp', ['ngRoute','ngAnimate','ngAria','ngMaterial','ui.bootstrap']);

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode({enabled: true});
  $routeProvider
   .when('/', {
    templateUrl: '/views/contactlist.html',
  })
  .when('/contact', {
  	templateUrl: '/views/contact.html',
  })
  .when('/contact/:id', {
    templateUrl: function(params){ return '/views/contact.html#' + params.id;   }
  })
  .otherwise({
  	redirectTo: '/'
  });
}]);

app.controller('contactListController', function($scope, $window, $location, $timeout, getContactsService, addContactService, removeContactService, getOneContactService, updateContactService, multipartForm) {
	
	$scope.groups = ["Family", "Friend", "Colleague", "Associate"];
	$scope.contact = { };
	$scope.headerImage = "images/contact-list.jpg";

	// pagination variables
	$scope.pageSize = 5;
	$scope.currentPage = 1;

	$scope.thumbnail = {dataUrl: ''};

	// set the max date for birthday selection to today
	$scope.maxDate = new Date();

	$scope.submitContact = function(contact) {
		console.log('here');
		// see if user provided image before attempting to upload
		if (contact.profilepicture == null) {
			addContact(contact);
			goGetContacts();
		} else {
			var uploadUrl = "/upload";
			// upload image
			multipartForm.post(uploadUrl, contact).then(function (msg) {
				contact.profilepicture = msg.data.profilepicture;
				addContact(contact);
				goGetContacts();
			});
		}

		// send user back to contact list
		$location.path('/');
	};

	goGetContacts = function() {

		// call our factory
		getContactsService.get().then(function (msg) {
			$scope.contactList = msg.data;
		}, function (err) {
			console.log('we got an error trying to retrieve contacts');
			console.log(err);
		});
		
	};
	
	goGetContacts();

	$scope.confirmCancel = function() {

		if ($window.confirm('Are you sure you want to cancel?')) {
			$scope.thumbnail = {dataUrl: ''};
			$location.path('/');
		}
	};

	$scope.confirmDelete = function(id, ndx, imagefile) {

		if ($window.confirm('Are you sure you want to delete this contact?')) {
			removeContact(id, ndx, imagefile);
		}
	};

	// function that is called when use hits Add Contact button in view
	addContact = function(contact) {

		addContactService.post(contact).then(function (msg) {
			console.log(msg.data);
		}, function (err) {
			console.log('we got an error trying to add contact');
			console.log(err);
		});

	};

	removeContact = function(id, ndx, imagefile) {
		
		removeContactService.delete(id, imagefile).then(function (msg) {

			//remove contact from scope without re-retrieving from database
			$scope.contactList.splice(ndx, 1);

		}, function (err) {
			console.log('we got an error trying to delete contact');
			console.log(err);
		});
	};

	$scope.getContact = function(id) {
		$scope.thumbnail = {dataUrl: ''};
		getOneContactService.get(id).then(function (msg) {
			console.log(msg);
			$scope.contact = msg.data;
			

			$location.path('/contact/:' + id);
		}, function (err) {
			console.log('we got an error trying to edit contact');
			console.log(err);
		});
	};

	$scope.updateContact = function(contact) {
		
		if ($scope.thumbnail.dataUrl === '') {
			goUpdateContact(contact);
			goGetContacts();
		} else {
			var uploadUrl = "/upload";
			// upload image
			multipartForm.post(uploadUrl, contact).then(function (msg) {
				contact.profilepicture = msg.data.profilepicture;
				goUpdateContact(contact);
				goGetContacts();
			});
		}
		
		
	};

	goUpdateContact = function(contact) {
		updateContactService.update(contact).then(function (msg) {
			//after updating contact do refresh
			goGetContacts();

			//send the user back to contact list view
			$location.path('/');
		}, function (err) {
			console.log('we got an error trying to delete contact');
			console.log(err);
		});
	};


	$scope.deselectContact = function() {
		// clear scope variable in case add is called after edit
		$scope.contact = "";
		$scope.thumbnail = {dataUrl: ''};
	};

	
    $scope.fileReaderSupported = window.FileReader !== null;

    $scope.photoChanged = function(files){
            if (files !== null) {
                var file = files[0];
            if ($scope.fileReaderSupported && file.type.indexOf('image') > -1) {
                $timeout(function() {
                    var fileReader = new FileReader();
                    fileReader.readAsDataURL(file);
                    fileReader.onload = function(e) {
                        $timeout(function(){
     						$scope.thumbnail.dataUrl = e.target.result;
                        });
                    };
                });
            }
          }
      };

});

app.directive('fileModel', ['$parse', function($parse){
	return {
		restrict: 'A',
		link: function(scope, element, attrs){
			var model = $parse(attrs.fileModel);
			var modelSetter = model.assign;

			element.bind('change', function(){
				scope.$apply(function(){
					modelSetter(scope, element[0].files[0]);
				});
			});
		}
	};
}]);


// format string from mongo into date type to display in datepicker on edit contact
app.filter('toDate', function() {
    return function(input) {
        return new Date(input);
    };
});


// create a filter for pagination
app.filter('startFrom', function() {
	return function(data, start) {
		if (!data || !data.length) {
			// digest cycle processes filter first before data set so check to avoid error
			return;
		} else {
			return data.slice(start);
		}
	};
});

app.service('multipartForm', ['$http', function($http){
	this.post = function(uploadUrl, data){
		var fd = new FormData();
		for(var key in data)
			fd.append(key, data[key]);
		
		return $http.post(uploadUrl, fd, {
			transformRequest: angular.indentity,
			headers: { 'Content-Type': undefined }
		});
	};
}]);

// create a service to retrieve all contacts from server
app.factory('getContactsService', function ($http) {
    return {
        get: function () {
            return $http.get('/contactlist');
        }
    };
});

// create a service to add contact to database
app.factory('addContactService', function ($http) {
    return {
        post: function (contact) {
            return $http.post('/contactlist', contact);
        }
    };
});

// create a service to delete contact from database
app.factory('removeContactService', function ($http) {
    return {
        delete: function (id, imagefile) {
            return $http.delete('/contactlist/' + id + '/' + imagefile);
        }
    };
});

// create a service to get contact from our database that we want to edit
app.factory('getOneContactService', function ($http) {
    return {
        get: function (id) {
            return $http.get('/contactlist/' + id);
        }
    };
});

// create a service to update contact in our database
app.factory('updateContactService', function ($http) {
    return {
        update: function (contact) {
            return $http.put('/contactlist/' + contact._id, contact);
        }
    };
});

