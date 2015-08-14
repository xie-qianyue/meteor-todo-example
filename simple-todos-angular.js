Tasks = new Mongo.Collection('tasks');

if (Meteor.isClient) {

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  // This code only runs on the client
  angular.module('simple-todos', ['angular-meteor']);

  angular.module('simple-todos').controller('TodosListCtrl', ['$scope', '$meteor',
    function($scope, $meteor) {

      $scope.$meteorSubscribe('tasks');

      $scope.tasks = $meteor.collection(function() {
        return Tasks.find(
          $scope.getReactively('query')
          // $scope.query
          // {checked: {$ne: true}}
          , {
            sort: {
              createdAt: -1
            }
          })
      });

      $scope.addTask = function(newTask) {
        // optimistic UI
        // 1, send request to server
        // 2, a simulation run in the client
        $meteor.call('addTask', newTask);
      };

      $scope.deleteTask = function(task) {
        $meteor.call('deleteTask', task._id);
      };

      $scope.setChecked = function(task) {
        $meteor.call('setChecked', task._id, !task.checked);
      };

      $scope.$watch('hideCompleted', function() {
        if ($scope.hideCompleted)
          $scope.query = {
            checked: {
              $ne: true
            }
          };
        else
          $scope.query = {};
      });

      $scope.incompleteCount = function() {
        return Tasks.find({
          checked: {
            $ne: true
          }
        }).count();
      };

      $scope.setPrivate = function(task) {
        $meteor.call('setPrivate', task._id, !task.private);
      };
    }
  ]);
}

Meteor.methods({
  addTask: function(text) {
    // Make sure the user is logged in before inserting a task
    if (!Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function(taskId) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error('not-authorized');
    }
    Tasks.remove(taskId);
  },
  setChecked: function(taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error('not-authorized');
    }
    Tasks.update(taskId, {
      $set: {
        checked: setChecked
      }
    });
  },
  setPrivate: function(taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    // Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, {
      $set: {
        private: setToPrivate
      }
    });
  }
});

if (Meteor.isServer) {
  Meteor.publish('tasks', function() {
    return Tasks.find({
      $or: [{
        private: {
          $ne: true
        }
      }, {
        owner: this.userId
      }]
    });
  });
}