angular.module('common.resources')

.factory('Menu', ['$resource', 'domainName', 'Category', 'Product', 'ProductOptionGroup', function ($resource, domainName, Category, Product, ProductOptionGroup) {

    var transformer = function(data, header) {
        var category, product, optionGroup;

        data = angular.fromJson(data);

        if (data.categories) {
          var categories = [];
          angular.forEach(data.categories, function (category) {
            category = new Category(category);
            if (category.products) {
              var products = [];
              angular.forEach(category.products, function (product) {
                product = new Product(product);
                if (product.optionGroups) {
                  var optionGroups = [];
                  angular.forEach(product.optionGroups, function (optionGroup) {
                    optionGroup = new ProductOptionGroup(optionGroup);
                    optionGroups.push(optionGroup);
                  });
                  product.optionGroups = optionGroups;
                }
                products.push(product);
              });
              category.products = products;
            }
            categories.push(category);
          });
          data.categories = categories;
        }
        return data;
    };

    return $resource(domainName + '/api/dashboard/menus/:id', { id: '@id' }, {

    create: {
      method: 'POST',
      transformResponse: transformer
    },

    update: {
      method: 'PUT',
      transformResponse: transformer
    },
    
    query: {
      isArray: true
    },

    get: {
      transformResponse: transformer
    },

    delete: {
      method: 'DELETE',
      transformResponse: transformer
    }

  });

}]);