angular.module('common.directives', []); 
angular.module('common.filters', []); 
angular.module('common.resources', []); 
angular.module('common.services', []); 

angular.module('common.services')

.factory('Account', ['$q', '$http', 'domainName', function($q, $http, domainName) {
return {
  changePassword: function (password, device) {
    var deferred = $q.defer();
    $http({
      url: domainName + '/api/accounts',
      method: "POST",
      dataType: 'json',
      data: {password: password,
             device: device},
      params: {'change_password': true},
      headers: {
        "Content-Type": "application/json"
      }
    })
      .success(function (response) {
        deferred.resolve(response);
      })
      .error(function (error, status) {
        deferred.reject(error);
      });
    return deferred.promise;
  },

  resetPassword: function (email, device) {
    var deferred = $q.defer();
    $http({
      url: domainName + '/api/accounts',
      method: "POST",
      dataType: 'json',
      data: {email: email,
             device: device},
      params: {'reset_password': true},
      headers: {
        "Content-Type": "application/json"
      }
    })
      .success(function (response) {
        deferred.resolve(response);
      })
      .error(function (error, status) {
        deferred.reject(error);
      });
    return deferred.promise;
  }
};
}]);
angular.module('common.services')

.factory('authInterceptor', function ($rootScope, $q, $window) {
  return {
    request: function (config) {
      var not_aws_request = config.url.search(/s3.amazonaws.com/)===-1;
      var have_a_session_token = $window.sessionStorage.token;
      config.headers = config.headers || {};
      if (have_a_session_token && not_aws_request) {
        //config.headers.Authorization = 'Bearer ' + $window.sessionStorage.token;
        config.headers.Authorization  = $window.sessionStorage.token;
        config.headers['X-API-EMAIL'] = $window.sessionStorage.email;
      }
      return config;
    },
    response: function (response) {
      if (response.status === 401) {
        // handle the case where the user is not authenticated
      }
      return response || $q.when(response);
    },
    responseError: function(rejection) {
      if (rejection.status === 500 || rejection.status === 404 || rejection.status === 403) {
        $rootScope.$broadcast("redirect:home");
      }
      return $q.reject(rejection);
    }
  };
});
angular.module('common.services')

    .factory('Basket', function ($rootScope, $localstorage) {
        var baseBasketKey = "basket";

        var createBasket = function () {
            return baseBasketKey;
        };

        var basket = $localstorage.getObject(createBasket());
        if (!basket) {
            basket = [];
            $localstorage.setObject(createBasket(), basket);
        }

        var addOptionsToItem = function (item, optionsGroup) {
            var newItem = JSON.parse(JSON.stringify(item));
            if (optionsGroup && Object.keys(optionsGroup).length > 0) {
                newItem.selectedOptions = optionsGroup;

                angular.forEach(optionsGroup, function (optionGroup, name) {
                    angular.forEach(optionGroup, function(option){
                        newItem.price += option.price * option.quantity;
                    });
                });
            }
            return newItem;
        };

        var updateTotalPrice = function () {
            $rootScope.totalPrice = 0;
            var total = 0;
            angular.forEach(basket, function (item) {
                total += item.totalPrice;
            });
            $rootScope.totalPrice = total;
        };

        var isSameItem = function (first, second) {
            var isSameOptions = function () {
                var isSame = true;
                var isFirstOptioned = !first.selectedOptions;
                var isSecondOptioned = !second.selectedOptions;
                if (isFirstOptioned == isSecondOptioned) {
                    if (first.selectedOptions) {
                        if ((Object.keys(first.selectedOptions).length == Object.keys(second.selectedOptions).length)) {
                            angular.forEach(first.selectedOptions, function (elements, name) {
                                if (second.selectedOptions[name]) {
                                    first.selectedOptions[name].every(function (option) {
                                        return second.selectedOptions[name].some(function (element) {
                                            isSame = isSame && (element.name == option.name && element.quantity == option.quantity);
                                            return isSame;
                                        });
                                    });
                                } else {
                                    return false;
                                }
                            });

                        } else {
                            return false;
                        }
                    } else {
                        return true;
                    }
                } else {
                    return false;
                }

                return isSame;
            };
            return (first.name === second.name) && isSameOptions();

        };

        updateTotalPrice();

        return {
            getBasket: function () {
                return basket;
            },

            getItemIndex: function (item) {
                var found;
                basket.some(function (element) {
                    if (isSameItem(item, element.item)) {
                        found = element;
                        return true;
                    }
                });

                return basket.indexOf(found);
            },

            addToBasket: function (item, quantity, selectedOptions) {
                // If quantity is specified(for example on menu options page) then use it, else 1
                var amount = quantity ? quantity : 1;

                var optionedItem = addOptionsToItem(item, selectedOptions);
                var itemIndex = this.getItemIndex(optionedItem);
                if (itemIndex < 0) {
                    basket.push({item: optionedItem, quantity: amount, totalPrice: optionedItem.price * amount});
                } else {
                    basket[itemIndex].quantity += amount;
                    basket[itemIndex].totalPrice = basket[itemIndex].item.price * basket[itemIndex].quantity;
                }
                this.updateTotalPrice();
                $localstorage.setObject(createBasket(), basket);
            },

            updateTotalPrice: function () {
                updateTotalPrice();
            },

            removeFromBasket: function (item) {
                var index = this.getItemIndex(item);

                if (basket[index].quantity == 1) {
                    basket.splice(index, 1);
                } else {
                    basket[index].quantity--;
                    basket[index].totalPrice -= basket[index].item.price;
                }
                this.updateTotalPrice();
                $localstorage.setObject(createBasket(), basket);
            },

            getItemOptions: function (item){
                var options = [];
                console.log("item to get options");
                console.log(item);
                if (item.item.selectedOptions){
                    angular.forEach(item.item.selectedOptions, function(groupOptions, name){
                        console.log(groupOptions);
                        groupOptions.every(function(option){
                            options.push(option.name);
                            return true;
                        });
                    });
                }

                return options;
            }

        };

    });
angular.module('common.services')

.factory('Clover', ['$q', '$http', 'domainName', function($q, $http, domainName) {

  return {

    items: function () {
      var deferred = $q.defer();
      $http.get(domainName + '/api/ecommerce/inventory')
          .success(function(response) {
              deferred.resolve(response);
          })
          .error(function (error, status) {
              deferred.reject(error);
          });
      return deferred.promise;
    }

  };
}]);
angular.module('common.services')

.factory('$localstorage', ['$window', function($window) {
  return {
    
    set: function(key, value) {
      if (value) {
        $window.localStorage[key] = value;
      } else {
        $window.localStorage.removeItem(key);
      }
    },

    get: function(key, defaultValue) {
      return $window.localStorage[key] || defaultValue;
    },

    setObject: function(key, value) {
      if (value) {
        $window.localStorage[key] = JSON.stringify(value);
      } else {
        $window.localStorage.removeItem(key);
      }
    },

    clear: function() {
      $window.localStorage.clear();
    },

    getObject: function(key) {
      var cached_object = $window.localStorage[key];
      if (cached_object) {
        try {
          return JSON.parse(cached_object);
        } catch (exception) {
          console.log(exception);
          return undefined;
        }
      } else {
        return undefined;
      }
    }
  };

}]);
angular.module('common.services')

.factory('Location', ['$q', '$http', 'domainName', function($q, $http, domainName) {
 
  return {
    getClosestPostcode: function(latitude, longitude) {
      var deferred = $q.defer();
      $http({
        url: domainName + '/api/locations', 
        method: "GET",
        params: {latitude: latitude, longitude: longitude}
      })
      .success(function(response) {
        deferred.resolve(response);
      })
      .error(function (error, status) {
        deferred.reject(error);
      });
      return deferred.promise;
    }

  };
}]);
angular.module('common.services')

.factory('Proposition', ['$q', '$http', 'domainName', function($q, $http, domainName) {

  var site = {};

  return {

    storeSite: function(data) {
      site = data;
    },

    getSite: function() {
      return site;
    },

    customers: function () {
      var deferred = $q.defer();
      $http({
        url: domainName + '/api/propositions', 
        method: "GET",
        dataType: 'json',
        data: '',
        params: {customers: true},
        interceptAuth: true,
        headers: {
          "Content-Type": "application/json"
        }
      })
      .success(function(response) {
        deferred.resolve(response);
      })
      .error(function (error, status) {
        deferred.reject(error);
      });
      return deferred.promise;
    },

    replies: function() {
      var deferred = $q.defer();
      $http({
        url: domainName + '/api/propositions', 
        method: "GET",
        dataType: 'json',
        data: '',
        params: {replies: true},
        interceptAuth: true,
        headers: {
          "Content-Type": "application/json"
        }
      })
      .success(function(response) {
        deferred.resolve(response);
      })
      .error(function (error, status) {
        deferred.reject(error);
      });
      return deferred.promise;
    },

    chat: function(proposition_id, last_message_received) {
      var deferred = $q.defer();
      $http({
        url: domainName + '/api/propositions/' + proposition_id,
        method: "GET",
        dataType: 'json',
        data: '',
        params: {chat: true, after: last_message_received },
        interceptAuth: true,
        headers: {
          "Content-Type": "application/json"
        }
      })
      .success(function(response) {
        deferred.resolve(response);
      })
      .error(function (error, status) {
        deferred.reject(error);
      });
      return deferred.promise;
    }

  };
}]);
var s3Service = function($q, $http, domainName, awsImageUploadBucket, uuid4, awsSiteImageUploadBucket) {

    var s3_config;
    var purge_date;
    //cached for 50 seconds
    var ttl_in_ms = 50000;

    function postFormData(uri, formData) {
        var deferred = $q.defer();
        $http.post(uri, formData, {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        }).success(function (response, status) {
            deferred.resolve(response);
        }).error(function (error, status) {
            deferred.reject(error);
        });
        return deferred.promise;
    }

    function createFormData(key, options, contents) {
        var fd = new FormData();
        fd.append('key', key);
        fd.append('acl', 'public-read');
        fd.append('Content-Type', 'image/jpeg');
        fd.append('AWSAccessKeyId', options.key);
        fd.append('policy', options.policy);
        fd.append('signature', options.signature);
        fd.append('file', dataURItoBlob(contents));
        return fd;
    }

    function dataURItoBlob(b64Data) {
        var byteCharacters = atob(b64Data);
        var byteNumbers = new Array(byteCharacters.length);
        for (var i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        var byteArray = new Uint8Array(byteNumbers);
        var blob = new Blob([byteArray], {type: 'image/jpeg'});
        return blob;
    }

    function getAWSPolicy(uploaded_from) {
        var deferred = $q.defer();
        if (s3_config && purge_date > new Date().getTime()) {
            deferred.resolve(s3_config);
        } else {
            var uriParams = uploaded_from === 'signup' ? '?signup=true' : '';
            $http.get(domainName + '/api/s3' + uriParams)
                .success(function(response) {
                    s3_config = response;
                    purge_date = new Date().getTime() + ttl_in_ms;
                    deferred.resolve(response);
                })
                .error(function (error, status) {
                    deferred.reject(error);
                });
        }
        return deferred.promise;
    }

    function create_folder(identifier, uploaded_from) {
        if (identifier && identifier.indexOf('@') > 0) {
            return sha1(identifier);
        } else if (identifier) {
            if (uploaded_from === 'signup') {
                return sha1(identifier);
            } else {
                return identifier;
            }
        } else {
            return "development";
        }
    }

    function getBucketName(uploaded_from) {
        if (!!uploaded_from && uploaded_from === 'signup') {
            return awsSiteImageUploadBucket;
        } else {
            return awsImageUploadBucket;
        }
    }

    return {
        sha: function(email) {
            return sha1(email);
        },

        upload: function(image_uri, identifier, uploaded_from, croppedName) {
            var deferred = $q.defer();
            getAWSPolicy(uploaded_from).then(function (options) {
                var s3Uri = 'https://' + getBucketName(uploaded_from) + '.s3.amazonaws.com/';
                var folder = create_folder(identifier, uploaded_from);
                var sizes = croppedName ? croppedName : '';
                var file = folder + '/' + uuid4.generate() + croppedName + '.jpg';
                var file_uri = s3Uri + file;
                var fd = createFormData(file,  options, image_uri);
                postFormData(s3Uri, fd).then(function (response) {
                    deferred.resolve(file_uri);
                }, function (error) {
                    deferred.reject(error);
                });
            }, function(error) {
                deferred.reject(error);
            });
            return deferred.promise;
        }
    };

};

s3Service.$inject = window.ionic ? ['$q', '$http', 'domainName', 'awsImageUploadBucket', 'uuid4'] : ['$q', '$http', 'domainName', 'awsImageUploadBucket', 'uuid4', 'awsSiteImageUploadBucket'];
angular.module('common.services').factory('S3', s3Service);
angular.module('common.resources')

.factory('Message', ['$resource', 'domainName', function ($resource, domainName) {

  return  $resource(domainName + '/api/messages/:messageId', { proposition_id: '@proposition_id' }, {
    query: {
      isArray: true
    },
    save: {
      method: 'POST'
    }
  });
}]);
angular.module('common.resources')

.factory('Offer', ['$resource', 'domainName', function ($resource, domainName) {

  return  $resource(domainName + '/api/offers/:id', { id: '@id' }, {

    create: {
      method: 'POST'
    },

    update: {
      method: 'PUT'
    },
    
    query: {
      isArray: true
    }

  });

}]);
angular.module('common.resources')

.factory('OfferProfile', ['$resource', 'domainName', function ($resource, domainName) {

  return  $resource(domainName + '/api/offers_profile/:id', { id: '@id' }, {

    create: {
      method: 'POST'
    },

    update: {
      method: 'PUT'
    },
    
    query: {
      isArray: true
    }

  });

}]);
angular.module('common.resources')

.factory('Order', ['$resource', 'domainName', function ($resource, domainName) {

  return  $resource(domainName + '/api/ecommerce/orders/:id', { id: '@id' }, {

    create: {
      method: 'POST'
    }

  });

}]);
angular.module('common.resources')

.factory('Payment', ['$resource', 'domainName', function ($resource, domainName) {

  return  $resource(domainName + '/api/payments/:id', { id: '@id' }, {

    create: {
      method: 'POST'
    }

  });

}]);
angular.module('common.resources')

.factory('PropositionMedia', ['$resource', 'domainName', function ($resource, domainName) {

  return  $resource(domainName + '/api/proposition_media/:propositionMediaId', { proposition_id: '@proposition_id' }, {
    query: {
      isArray: true
    },
    save: {
      method: 'POST'
    }
  });
}]);
angular.module('common.resources')

.factory('Requisition', ['$resource', 'domainName', function ($resource, domainName) {

  return  $resource(domainName + '/api/requisitions/:id', { id: '@id' }, {

    create: {
      method: 'POST'
    },

    update: {
      method: 'PUT'
    },
    
    query: {
      isArray: true 
    }

  });

}]);
angular.module('common.resources')

.factory('Site', ['$resource', 'domainName', function ($resource, domainName) {

  return  $resource(domainName + '/api/sites/:id', { id: '@id' }, {

    create: {
      method: 'POST'
    },

    update: {
      method: 'PUT'
    },
    
    query: {
      isArray: true
    }

  });

}]);
angular.module('common.resources')

.factory('User', ['$resource', 'domainName', function ($resource, domainName) {

  return  $resource(domainName + '/api/users/:id', { id: '@id' }, {

    create: {
      method: 'POST'
    },

    update: {
      method: 'PUT'
    },
    
    query: {
      isArray: true 
    }

  });

}]);
angular.module('common.directives')
  .directive('upcase', function() {
    return {
     require: 'ngModel',
     link: function(scope, element, attrs, modelCtrl) {
        var capitalize = function(inputValue) {
           if(inputValue === undefined) inputValue = '';
           var capitalized = inputValue.toUpperCase();
           if(capitalized !== inputValue) {
              modelCtrl.$setViewValue(capitalized);
              modelCtrl.$render();
           }         
           return capitalized;
         };
         modelCtrl.$parsers.push(capitalize);
         capitalize(scope[attrs.ngModel]);  // capitalize initial value
     }
   };
})

.directive('formatPostcode', function($filter, $browser) {
    return {
        require: 'ngModel',
        link: function($scope, $element, $attrs, ngModelCtrl) {
            var listener = function() {
              var value = $element.val();
              if (value) {
                $element.val($filter('postcode')(value, true));
              }
            };
            
            // // This runs when we update the text field
            ngModelCtrl.$parsers.push(function(viewValue) {
                 return viewValue;
            });
            
            // This runs when the model gets updated on the scope directly and keeps our view in sync
            ngModelCtrl.$render = function() {
                $element.val($filter('postcode')(ngModelCtrl.$viewValue, true));

            };
            
            $element.bind('change', listener);
            // $element.bind('keydown', function(event) {
            //     var key = event.keyCode;
            //     // If the keys include the CTRL, SHIFT, ALT, or META keys, or the arrow keys, do nothing.
            //     // This lets us support copy and paste too
            //     if (key == 91 || (15 < key && key < 19) || (37 <= key && key <= 40)) return; 
            //     $browser.defer(listener); // Have to do this or changes don't get picked up properly
            // });
            
            $element.bind('paste cut', function() {
                $browser.defer(listener);
            });
        }
        
    };
})

.directive('match', function() {
  return {
    require: 'ngModel',
    link: function(scope, elm, attrs, ctrl) {
      ctrl.$parsers.unshift(function(viewValue) {
        if (viewValue === scope[attrs.match]) {
          ctrl.$setValidity('sameAs', true);
          return viewValue;
        } else {
          ctrl.$setValidity('sameAs', false);
          return undefined;
        }
      });
    }
  };
})

.directive('thumbnail', function ($timeout, awsImageUploadBucket) {
  return {
    restrict: 'A', 
    scope: {
      thumbnail: '=',
    },
    link: function(scope, element, attrs) {
        var count = 0;
        var refreshAfter = function(file_uri, milliseconds) {
              $timeout(function () {
                element.attr("src", file_uri);
                if (count >= 3) {
                    element.unbind('error');
                    element.attr("src","img/user.png");
                } else {
                    count++;
                }
            }, milliseconds);
        };
        var updateImageToThumbnail = function (file_uri) {
              var thumbnail_file_uri = file_uri.replace(awsImageUploadBucket, awsImageUploadBucket + "resized").replace(".jpg", "75x75.jpg");  
              element.attr("src", thumbnail_file_uri); 
              element.bind('error', function() {
                element.attr("src","img/image_loading_spinner.gif");
                refreshAfter(thumbnail_file_uri, 2000 );
              });
        };
        if (scope.thumbnail) {
            updateImageToThumbnail(scope.thumbnail);
        }
    }   
   };
})

.directive('booking', function($state, $stateParams, Offer, $localstorage) {
    return {
      restrict: 'A',
      link: function ($scope, element) {
        element.bind('click', function () {
          var propositionId = $localstorage.get('currentPropositionId');
          Offer.query({proposition_id: propositionId}, function (offers) {
            if (offers.length == 1) {
              var offer = offers[0];
              $localstorage.setObject('offer', offer);
              $state.go('youthfully.booking', {offerId: offer.id});
            } else if (offers.length > 1) {
              $localstorage.setObject('offers', offers);
              $state.go('youthfully.offers');
            } else {
              //shouldn't need this situation as we should hide the book button
            }
          });
        });
      }
    };
});
angular.module('common.filters')
   /*Cuts from string piece with specified length*/
    .filter('cut', function () {
        return function (value, wordwise, max) {
            if (!value) return '';

            max = parseInt(max, 10);
            if (!max) return value;
            if (value.length <= max) return value;

            value = value.substr(0, max);
            if (wordwise) {
                var lastspace = value.lastIndexOf(' ');
                if (lastspace != -1) {
                    value = value.substr(0, lastspace);
                }
            }

            return value + ' …';
        };
    })

    .filter('postcode', function () {
        return function (value) {
            if (!value) {
              return '';
            } else {
              var value_to_change = value.replace(/\s/g, '');
              if (value_to_change.length===6) {
                return value_to_change.replace(/(.{3})/g, '$1 ').replace(/(^\s+|\s+$)/,'');
              } else if (value_to_change.length===7) {
                return value_to_change.replace(/(.{4})/g, '$1 ').replace(/(^\s+|\s+$)/,'');
              } else {
                return value;
              }
            }
        };
    })

    .filter('requisitionstatus', function () {
        return function (value) {
            if (!value) {
              return '';  
          } else if (value==='assigned') {
            return "Awaiting response";
          } else if (value==='in_progress') {
            return "In conversation";
          } else if (value==='booked') {
            return "Booked";
          } else if (value==='closed') {
            return "Closed";
          }
        };
    })

    .filter('smartCurrency', ['$filter',  function($filter) {
        return function(amount, currencyCode) {
            if(amount) {
                return $filter('isoCurrency')(amount, currencyCode).replace('.00', '');
            }
        };
    }]);
