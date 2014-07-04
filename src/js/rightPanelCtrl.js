angular.module('fontEditor')
.controller( "rightPanelCtrl", ["$scope", "$fontInfo", "$editor", function ($scope, $fontInfo, $editor) {
    $scope.fontWeightList = [ 
        { name: 'Normal' , value: 'normal'  } ,
        { name: 'Bold'   , value: 'bold'    } ,
        { name: '100'    , value: '100'     } ,
        { name: '200'    , value: '200'     } ,
        { name: '300'    , value: '300'     } ,
        { name: '400'    , value: '400'     } ,
        { name: '500'    , value: '500'     } ,
        { name: '600'    , value: '600'     } ,
        { name: '700'    , value: '700'     } ,
        { name: '800'    , value: '800'     } ,
        { name: '900'    , value: '900'     } ,
    ];

    $scope.fontInfo = $fontInfo.data;
    $scope.editor = $editor;

    $scope.layout = function () {
        $fontInfo.layout();
    };
}]);
