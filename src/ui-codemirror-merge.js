'use strict';

/**
 * Binds a CodeMirror Merge widget to a <textarea> element.
 */
angular.module('ui.codemirror-merge', [])
  .constant('uiCodemirrorMergeConfig', {})
  .directive('uiCodemirrorMerge', uiCodemirrorMergeDirective);

/**
 * @ngInject
 */
function uiCodemirrorMergeDirective($timeout, uiCodemirrorMergeConfig) {

  return {
    restrict: 'EA',
    require: '?ngModel',
    compile: function compile() {

      // Require CodeMirror
      if (angular.isUndefined(window.CodeMirror)) {
        throw new Error('ui-codemirror needs CodeMirror to work... (o rly?)');
      }

      return postLink;
    }
  };

  function postLink(scope, iElement, iAttrs, ngModel) {

    var codemirrorOptions = angular.extend(
      { value: iElement.text() },
      uiCodemirrorMergeConfig.codemirror || {},
      scope.$eval(iAttrs.uiCodemirrorMerge),
      scope.$eval(iAttrs.uiCodemirrorMergeOpts)
    );

    var codemirror = newCodemirrorEditor(iElement, codemirrorOptions);

    configOptionsWatcher(
      codemirror,
      iAttrs.uiCodemirrorMerge || iAttrs.uiCodemirrorMergeOpts,
      scope
    );

    configNgModelLink(codemirror, ngModel, scope);

    configUiRefreshAttribute(codemirror, iAttrs.uiRefresh, scope);

    // Allow access to the CodeMirror instance through a broadcasted event
    // eg: $broadcast('CodeMirror', function(cm){...});
    scope.$on('CodeMirror', function(event, callback) {
      if (angular.isFunction(callback)) {
        callback(codemirror);
      } else {
        throw new Error('the CodeMirror event requires a callback function');
      }
    });

    // onLoad callback
    if (angular.isFunction(codemirrorOptions.onLoad)) {
      codemirrorOptions.onLoad(codemirror);
    }
  }

  function newCodemirrorEditor(iElement, codemirrorOptions) {
    var codemirror;

    /*iElement.html('');
    codemirror = window.CodeMirror.MergeView(iElement[0], codemirrorOptions);*/

    iElement.html('');
    codemirror = new window.CodeMirror.MergeView(iElement[0], codemirrorOptions, function(cm_el) {
        iElement.append(cm_el);
    }, codemirrorOptions);

    console.log(codemirror);

    return codemirror;
  }

  function configOptionsWatcher(codemirrot, uiCodemirrorMergeAttr, scope) {
    if (!uiCodemirrorMergeAttr) { return; }

    var codemirrorDefaultsKeys = Object.keys(window.CodeMirror.defaults);
    scope.$watch(uiCodemirrorMergeAttr, updateOptions, true);
    function updateOptions(newValues, oldValue) {
      if (!angular.isObject(newValues)) { return; }
      codemirrorDefaultsKeys.forEach(function(key) {
        if (newValues.hasOwnProperty(key)) {

          if (oldValue && newValues[key] === oldValue[key]) {
            return;
          }

          codemirrot.setOption(key, newValues[key]);
        }
      });
    }
  }

  function configNgModelLink(codemirror, ngModel, scope) {
    if (!ngModel) { return; }
    // CodeMirror expects a string, so make sure it gets one.
    // This does not change the model.
    ngModel.$formatters.push(function(value) {
      if (angular.isUndefined(value) || value === null) {
        return '';
      } else if (angular.isObject(value) || angular.isArray(value)) {
        throw new Error('ui-codemirror cannot use an object or an array as a model');
      }
      return value;
    });


    // Override the ngModelController $render method, which is what gets called when the model is updated.
    // This takes care of the synchronizing the codeMirror element with the underlying model, in the case that it is changed by something else.
    ngModel.$render = function() {
        var safeViewValue = ngModel.$viewValue || '';
        codemirror.edit.setValue(safeViewValue);
        codemirror.right.forceUpdate("full");
    };

    // Keep the ngModel in sync with changes from CodeMirror
    codemirror.edit.on('change', function(instance) {
      var newValue = instance.getValue();
      if (newValue !== ngModel.$viewValue) {
        scope.$evalAsync(function() {
          ngModel.$setViewValue(newValue);
        });
      }
    });
  }

  function configUiRefreshAttribute(codeMirror, uiRefreshAttr, scope) {
    if (!uiRefreshAttr) { return; }

    scope.$watch(uiRefreshAttr, function(newVal, oldVal) {
      // Skip the initial watch firing
      if (newVal !== oldVal) {
        $timeout(function() {
          codeMirror.refresh();
        });
      }
    });
  }

}
