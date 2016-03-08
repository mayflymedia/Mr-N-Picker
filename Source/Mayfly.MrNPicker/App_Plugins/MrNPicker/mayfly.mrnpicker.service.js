function mfyDialogService($rootScope, $compile, $http, $timeout, $q, $templateCache, appState, eventsService) {

    var dialogs = [];

    /** Internal method that removes all dialogs */
    function removeAllDialogs(args) {
        for (var i = 0; i < dialogs.length; i++) {
            var dialog = dialogs[i];

            //very special flag which means that global events cannot close this dialog - currently only used on the login 
            // dialog since it's special and cannot be closed without logging in.
            if (!dialog.manualClose) {
                dialog.close(args);
            }

        }
    }

    /** Internal method that closes the dialog properly and cleans up resources */
    function closeDialog(dialog) {

        if (dialog.element) {
            dialog.element.modal('hide');

            //this is not entirely enough since the damn webforms scriploader still complains
            if (dialog.iframe) {
                dialog.element.find("iframe").attr("src", "about:blank");
                $timeout(function () {
                    //we need to do more than just remove the element, this will not destroy the 
                    // scope in angular 1.1x, in angular 1.2x this is taken care of but if we dont
                    // take care of this ourselves we have memory leaks.
                    dialog.element.remove();
                    //SD: No idea why this is required but was there before - pretty sure it's not required
                    $("#" + dialog.element.attr("id")).remove();
                    dialog.scope.$destroy();
                }, 1000);
            } else {
                //we need to do more than just remove the element, this will not destroy the 
                // scope in angular 1.1x, in angular 1.2x this is taken care of but if we dont
                // take care of this ourselves we have memory leaks.
                dialog.element.remove();
                //SD: No idea why this is required but was there before - pretty sure it's not required
                $("#" + dialog.element.attr("id")).remove();
                dialog.scope.$destroy();
            }
        }

        //remove 'this' dialog from the dialogs array
        dialogs = _.reject(dialogs, function (i) { return i === dialog; });
    }

    /** Internal method that handles opening all dialogs */
    function openDialog(options) {
        var defaults = {
            container: $("body"),
            animation: "fade",
            modalClass: "umb-modal",
            width: "100%",
            inline: false,
            iframe: false,
            show: true,
            template: "views/common/notfound.html",
            callback: undefined,
            closeCallback: undefined,
            element: undefined,
            // It will set this value as a property on the dialog controller's scope as dialogData,
            // used to pass in custom data to the dialog controller's $scope. Though this is near identical to 
            // the dialogOptions property that is also set the the dialog controller's $scope object. 
            // So there's basically 2 ways of doing the same thing which we're now stuck with and in fact
            // dialogData has another specially attached property called .selection which gets used.
            dialogData: undefined
        };

        var dialog = angular.extend(defaults, options);

        //NOTE: People should NOT pass in a scope object that is legacy functoinality and causes problems. We will ALWAYS
        // destroy the scope when the dialog is closed regardless if it is in use elsewhere which is why it shouldn't be done.
        var scope = options.scope || $rootScope.$new();

        //Modal dom obj and unique id
        dialog.element = $('<div ng-swipe-right="swipeHide($event)"  data-backdrop="false"></div>');
        var id = dialog.template.replace('.html', '').replace('.aspx', '').replace(/[\/|\.|:\&\?\=]/g, "-") + '-' + scope.$id;

        if (options.inline) {
            dialog.animation = "";
        }
        else {
            dialog.element.addClass("modal");
            dialog.element.addClass("hide");
        }

        //set the id and add classes
        dialog.element
            .attr('id', id)
            .addClass(dialog.animation)
            .addClass(dialog.modalClass);

        //push the modal into the global modal collection
        //we halt the .push because a link click will trigger a closeAll right away
        $timeout(function () {
            dialogs.push(dialog);
        }, 500);


        dialog.close = function (data) {
            if (dialog.closeCallback) {
                dialog.closeCallback(data);
            }

            closeDialog(dialog);
        };

        //if iframe is enabled, inject that instead of a template
        if (dialog.iframe) {
            var html = $("<iframe src='" + dialog.template + "' class='auto-expand' style='border: none; width: 100%; height: 100%;'></iframe>");
            dialog.element.html(html);

            //append to body or whatever element is passed in as options.containerElement
            dialog.container.append(dialog.element);

            // Compile modal content
            $timeout(function () {
                $compile(dialog.element)(dialog.scope);
            });

            dialog.element.css("width", dialog.width);

            //Autoshow 
            if (dialog.show) {
                dialog.element.modal('show');
            }

            dialog.scope = scope;
            return dialog;
        }
        else {

            //We need to load the template with an httpget and once it's loaded we'll compile and assign the result to the container
            // object. However since the result could be a promise or just data we need to use a $q.when. We still need to return the 
            // $modal object so we'll actually return the modal object synchronously without waiting for the promise. Otherwise this openDialog
            // method will always need to return a promise which gets nasty because of promises in promises plus the result just needs a reference
            // to the $modal object which will not change (only it's contents will change).
            $q.when($templateCache.get(dialog.template) || $http.get(dialog.template, { cache: true }).then(function (res) { return res.data; }))
                .then(function onSuccess(template) {

                    // Build modal object
                    dialog.element.html(template);

                    //append to body or other container element  
                    dialog.container.append(dialog.element);

                    // Compile modal content
                    $timeout(function () {
                        $compile(dialog.element)(scope);
                    });

                    scope.dialogOptions = dialog;

                    //Scope to handle data from the modal form
                    scope.dialogData = dialog.dialogData ? dialog.dialogData : {};
                    scope.dialogData.selection = [];

                    // Provide scope display functions
                    //this passes the modal to the current scope
                    scope.$modal = function (name) {
                        dialog.element.modal(name);
                    };

                    scope.swipeHide = function (e) {

                        if (appState.getGlobalState("touchDevice")) {
                            var selection = window.getSelection();
                            if (selection.type !== "Range") {
                                scope.hide();
                            }
                        }
                    };

                    //NOTE: Same as 'close' without the callbacks
                    scope.hide = function () {
                        closeDialog(dialog);
                    };

                    //basic events for submitting and closing
                    scope.submit = function (data) {
                        if (dialog.callback) {
                            dialog.callback(data);
                        }

                        closeDialog(dialog);
                    };

                    scope.close = function (data) {
                        dialog.close(data);
                    };

                    //NOTE: This can ONLY ever be used to show the dialog if dialog.show is false (autoshow). 
                    // You CANNOT call show() after you call hide(). hide = close, they are the same thing and once
                    // a dialog is closed it's resources are disposed of.
                    scope.show = function () {
                        if (dialog.manualClose === true) {
                            //show and configure that the keyboard events are not enabled on this modal
                            dialog.element.modal({ keyboard: false });
                        }
                        else {
                            //just show normally
                            dialog.element.modal('show');
                        }

                    };

                    scope.select = function (item) {
                        var i = scope.dialogData.selection.indexOf(item);
                        if (i < 0) {
                            scope.dialogData.selection.push(item);
                        } else {
                            scope.dialogData.selection.splice(i, 1);
                        }
                    };

                    //NOTE: Same as 'close' without the callbacks
                    scope.dismiss = scope.hide;

                    // Emit modal events
                    angular.forEach(['show', 'shown', 'hide', 'hidden'], function (name) {
                        dialog.element.on(name, function (ev) {
                            scope.$emit('modal-' + name, ev);
                        });
                    });

                    // Support autofocus attribute
                    dialog.element.on('shown', function (event) {
                        $('input[autofocus]', dialog.element).first().trigger('focus');
                    });

                    dialog.scope = scope;

                    //Autoshow 
                    if (dialog.show) {
                        scope.show();
                    }

                });

            //Return the modal object outside of the promise!
            return dialog;
        }
    }

    /** Handles the closeDialogs event */
    eventsService.on("app.closeDialogs", function (evt, args) {
        removeAllDialogs(args);
    });

    return {
        /**
         * @ngdoc method
         * @name umbraco.services.dialogService#close
         * @methodOf umbraco.services.dialogService
         *
         * @description
         * Closes a specific dialog
         * @param {Object} dialog the dialog object to close
         * @param {Object} args if specified this object will be sent to any callbacks registered on the dialogs.
         */
        close: function (dialog, args) {
            if (dialog) {
                dialog.close(args);
            }
        },

        /**
         * @ngdoc method
         * @name umbraco.services.dialogService#closeAll
         * @methodOf umbraco.services.dialogService
         *
         * @description
         * Closes all dialogs
         * @param {Object} args if specified this object will be sent to any callbacks registered on the dialogs.
         */
        closeAll: function (args) {
            removeAllDialogs(args);
        },

        /**
         * @ngdoc method
         * @name umbraco.services.dialogService#treePicker
         * @methodOf umbraco.services.dialogService
         *
         * @description
         * Opens a tree picker in a modal, the callback returns a object representing the selected tree item
         * @param {Object} options iconpicker dialog options object
         * @param {String} options.section tree section to display
         * @param {String} options.treeAlias specific tree to display
         * @param {Boolean} options.multiPicker should the tree pick one or multiple items before returning
         * @param {Function} options.callback callback function
         * @returns {Object} modal object
         */
        treePicker: function (options) {
            options.template = 'views/treePicker.html';
            options.show = true;
            return openDialog(options);
        }
    };
}

angular.module('umbraco.services').factory('mfyDialogService', mfyDialogService);