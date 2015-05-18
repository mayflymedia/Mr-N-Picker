function MultiRootNodePicker($scope, dialogService, entityResource, $log, iconHelper) {
    $scope.renderModel = [];
    $scope.ids = [];

    var config = {
        multiPicker: true,
        entityType: "Document",
        type: "content",
        treeAlias: "content"
    };

    if ($scope.model.value) {
        entityResource.getByIds($scope.model.value.split(','), config.entityType).then(function (data) {
            _.each(data, function (item, i) {
                $scope.ids.push(item.id);
                item.icon = iconHelper.convertFromLegacyIcon(item.icon);
                $scope.renderModel.push({ name: item.name, id: item.id, icon: item.icon });
            });
        });
    }

    $scope.openContentPicker = function () {
        var d = dialogService.treePicker({
            section: config.type,
            treeAlias: config.treeAlias,
            multiPicker: config.multiPicker,
            callback: populate
        });
    };

    $scope.remove = function (index) {
        $scope.renderModel.splice(index, 1);
        $scope.ids.splice(index, 1);
        $scope.model.value = trim($scope.ids.join(), ",");
    };

    $scope.clear = function () {
        $scope.model.value = "";
        $scope.renderModel = [];
        $scope.ids = [];
    };

    $scope.add = function (item) {
        if ($scope.ids.indexOf(item.id) < 0) {
            item.icon = iconHelper.convertFromLegacyIcon(item.icon);

            $scope.ids.push(item.id);
            $scope.renderModel.push({ name: item.name, id: item.id, icon: item.icon });
            $scope.model.value = trim($scope.ids.join(), ",");
        }
    };

    $scope.$on("formSubmitting", function (ev, args) {
        $scope.model.value = trim($scope.ids.join(), ",");
    });

    function trim(str, chr) {
        var rgxtrim = (!chr) ? new RegExp('^\\s+|\\s+$', 'g') : new RegExp('^' + chr + '+|' + chr + '+$', 'g');
        return str.replace(rgxtrim, '');
    }

    function populate(data) {
        if (angular.isArray(data)) {
            _.each(data, function (item, i) {
                $scope.add(item);
            });
        } else {
            $scope.clear();
            $scope.add(data);
        }
    }
}

function contentPickerController($scope, dialogService, entityResource, editorState, $log, iconHelper, $routeParams, fileManager, contentEditingHelper) {

    function trim(str, chr) {
        var rgxtrim = (!chr) ? new RegExp('^\\s+|\\s+$', 'g') : new RegExp('^' + chr + '+|' + chr + '+$', 'g');
        return str.replace(rgxtrim, '');
    }

    function startWatch() {
        // We need to watch our renderModel so that we can update the underlying $scope.model.value properly, this is required
        // because the ui-sortable doesn't dispatch an event after the digest of the sort operation. Any of the events for UI sortable
        // occur after the DOM has updated but BEFORE the digest has occured so the model has NOT changed yet - it even states so in the docs.
        // In their source code there is no event so we need to just subscribe to our model changes here.
        // This also makes it easier to manage models, we update one and the rest will just work.

        $scope.$watch(function () {
            // return the joined Ids as a string to watch
            return _.map($scope.renderModel, function (i) {
                return i.id;
            }).join();
        }, function (newVal) {
            var currIds = _.map($scope.renderModel, function (i) {
                return i.id;
            });
            $scope.model.value = trim(currIds.join(), ",");

            // Validate!
            if ($scope.model.config && $scope.model.config.minNumber && parseInt($scope.model.config.minNumber) > $scope.renderModel.length) {
                $scope.multiRootContentPickerForm.minCount.$setValidity("minCount", false);
            }
            else {
                $scope.multiRootContentPickerForm.minCount.$setValidity("minCount", true);
            }

            if ($scope.model.config && $scope.model.config.maxNumber && parseInt($scope.model.config.maxNumber) < $scope.renderModel.length) {
                $scope.multiRootContentPickerForm.maxCount.$setValidity("maxCount", false);
            }
            else {
                $scope.multiRootContentPickerForm.maxCount.$setValidity("maxCount", true);
            }
        });
    }

    $scope.renderModel = [];

    $scope.dialogEditor = editorState && editorState.current && editorState.current.isDialogEditor === true;

    // the default pre-values
    var defaultConfig = {
        multiPicker: true,
        showEditButton: false,
        startNode: {
            query: "",
            type: "content",
            id: $scope.model.config.rootNodes
        }
    };

    if ($scope.model.config) {
        // merge the server config on top of the default config, then set the server config to use the result
        $scope.model.config = angular.extend(defaultConfig, $scope.model.config);
    }

    var entityType = $scope.model.config.startNode.type === "member"
        ? "Member"
        : $scope.model.config.startNode.type === "media"
        ? "Media"
        : "Document";

    var joinedXpath = "";
    for (var i = 0, len = $scope.model.config.xpath.length; i < len; i++) {
        joinedXpath += $scope.model.config.xpath[i].value + ";";
    }

    // the dialog options for the picker
    var dialogOptions = {
        multiPicker: $scope.model.config.multiPicker,
        entityType: entityType,
        filterCssClass: "not-allowed not-published",
        callback: function (data) {
            if (angular.isArray(data)) {
                _.each(data, function (item, i) {
                    $scope.add(item);
                });
            } else {
                $scope.clear();
                $scope.add(data);
            }
        },
        treeAlias: 'customcontent',
        section: 'customcontent', // $scope.model.config.startNode.type,
        customTreeParams: 'pageId=' + $routeParams.id + '&rootIds=' + $scope.model.config.rootNodes + '&xpath=' + encodeURIComponent(joinedXpath) + '&mergeRoots=' + $scope.model.config.mergeRoots
    };

    // since most of the pre-value config's are used in the dialog options (i.e. maxNumber, minNumber, etc...) we'll merge the 
    // pre-value config on to the dialog options
    angular.extend(dialogOptions, $scope.model.config);

    // dialog
    $scope.openContentPicker = function () {
        var d = dialogService.treePicker(dialogOptions);
    };

    $scope.remove = function (index) {
        $scope.renderModel.splice(index, 1);
    };

    $scope.add = function (item) {
        var currIds = _.map($scope.renderModel, function (i) {
            return i.id;
        });

        if (currIds.indexOf(item.id) < 0) {
            item.icon = iconHelper.convertFromLegacyIcon(item.icon);
            $scope.renderModel.push({ name: item.name, id: item.id, icon: item.icon });
        }
    };

    $scope.clear = function () {
        $scope.renderModel = [];
    };

    $scope.$on("formSubmitting", function (ev, args) {
        var currIds = _.map($scope.renderModel, function (i) {
            return i.id;
        });
        $scope.model.value = trim(currIds.join(), ",");
    });

    // load current data
    var modelIds = $scope.model.value ? $scope.model.value.split(',') : [];
    entityResource.getByIds(modelIds, entityType).then(function (data) {

        // Ensure we populate the render model in the same order that the ids were stored!
        _.each(modelIds, function (id, i) {
            var entity = _.find(data, function (d) {
                return d.id == id;
            });

            entity.icon = iconHelper.convertFromLegacyIcon(entity.icon);
            $scope.renderModel.push({ name: entity.name, id: entity.id, icon: entity.icon });

        });

        // everything is loaded, start the watch on the model
        startWatch();

    });
}

angular.module("umbraco").controller("Mayfly.PropertyEditors.MrNPickerController", contentPickerController);
angular.module("umbraco").controller("Mayfly.PrevalueEditors.MultiPickerController", MultiRootNodePicker);