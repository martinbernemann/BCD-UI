/*
  Copyright 2010-2017 BusinessCode GmbH, Germany

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
"use strict";
/**
 * This namespace contains functionality directly related to BCD-UI cube
 * @namespace bcdui.component.cube
 */
bcdui.util.namespace("bcdui.component.cube");
bcdui.component.cube.CubeModel = bcdui._migPjs._classCreate( bcdui.core.ModelWrapper,
/**
 * @lends bcdui.component.cube.CubeModel.prototype
 */
{
  /**
   * @classdesc
   * Creates a cube model, provides data with calculations and col dimensions applied
   * @extends bcdui.core.ModelWrapper
   *
   * @constructs
   * @param {Object} args The parameter map contains the following properties:
   * @param {bcdui.core.DataProvider} [args.config] - The model containing the cube meta data (see cube-2.0.0.xsd). If it is not present, the configuration at './cubeConfiguration.xml' is used
   * @param {string}                  [args.cubeId] - When settings are to be derived from status model, this is the id in <cube:Layout cubeId="myCube">
   * @param {string}                  [args.id]     - The object's id, needed only when later accessing via id. If given the CubeModel registers itself at {@link bcdui.factory.objectRegistry}
   * @param {bcdui.core.DataProvider} [args.statusModel=bcdui.wkModels.guiStatusEstablished] - StatusModel, containing the filters as /SomeRoot/f:Filter and the layout definition at /SomeRoot//cube:Layout[@cubeId=args.cubeId]
   */
  initialize: function(args) {
    
    var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.component.cube.CubeModel" ): "") != "";
    
    args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.component._schema_createCubeModel_args );
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.component._schema_createCubeModel_args);

    args.id = args.id ? args.id : bcdui.factory.objectRegistry.generateTemporaryIdInScope("cubeModel");
    // param {bcdui.core.DataProvider} [args.chain=bcdui/component/cube/chain.xml] - Processing chain, usually the default chain does a good job and is required for support of cube-2.0.0.xsd
    args.chain = args.chain || new bcdui.core.SimpleModel( { id: args.id+"_bcdImpl_chain", url: bcdui.component.cube._cubeChain } );
    args.metaDataModel         = args.config || args.metaDataModel || new bcdui.core.SimpleModel( { id: args.id+"_bcdImpl_configuration", url: "cubeConfiguration.xml" } );
    args.statusModel           = args.statusModel           || bcdui.wkModels.guiStatusEstablished;
    args.enhancedConfiguration = args.enhancedConfiguration || new bcdui.core.ModelWrapper( {
      id: args.id+"_bcdImpl_enhancedConfiguration", inputModel: args.metaDataModel,
      chain: [ bcdui.contextPath+"/bcdui/js/component/cube/mergeLayout.xslt",
               bcdui.contextPath+"/bcdui/js/component/cube/serverCalc.xslt",
               bcdui.contextPath+"/bcdui/js/component/cube/configuration.xslt" ],
      parameters: {cubeId: args.cubeId, statusModel: args.statusModel } } );


    // We start with an empty DataProviderHolder until we known, whether a server request is to be done, which we only know once enhancedConfiguration is ready
    var reqHolder = new bcdui.core.DataProviderHolder();
    var inputModel = new bcdui.core.SimpleModel( { id: args.id+"_bcdImpl_inputModel", url: new bcdui.core.RequestDocumentDataProvider( { uri: "cube_" + args.id, requestModel: reqHolder } ) } );
    bcdui.core.ModelWrapper.call( this, { id: args.id, inputModel: inputModel, chain: args.chain, parameters: { paramModel: args.enhancedConfiguration } } );

    bcdui.factory.objectRegistry.withReadyObjects( args.enhancedConfiguration, function() {

      // We only process a server request, if at least one measure or one dimension is selected, otherwise further execution is prevented
      var rqModel = null;
      if( ! bcdui.factory.objectRegistry.getObject(args.enhancedConfiguration).getData().selectSingleNode("/*/cube:Layout/cube:Measures//dm:MeasureRef | /*/cube:Layout/cube:Measures//dm:Measure")
       && ! bcdui.factory.objectRegistry.getObject(args.enhancedConfiguration).getData().selectSingleNode("/*/cube:Layout/cube:Dimensions//dm:LevelRef")
          ) {
        rqModel = new bcdui.core.StaticModel( "<Wrq xmlns='http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0'></Wrq>" );
      } else {
        rqModel = new bcdui.core.ModelWrapper( { id: args.id+"_bcdImpl_requestDoc", inputModel: args.enhancedConfiguration,
          parameters: {statusModel: args.statusModel }, chain: bcdui.contextPath+"/bcdui/js/component/cube/request.xslt" } );
      }
      reqHolder.setSource(rqModel);
      reqHolder.execute();
    }.bind(this) );
    
    if (isLeaf)
      this._checkAutoRegister();
  }
});

//default layout renderer

/**
 * @private
 */
bcdui.component.cube._renderDndArea = function(args) {
  if (jQuery("#" + args.targetHtml).hasClass("bcdDndBlindOpen") || jQuery("#" + args.targetHtml).hasClass("bcdDndBlindClosed"))
    return "<div id='bcdUpDown_Dnd_{{=it.id}}' class='bcdUpDown'></div><div id='bcdUpDownBody_Dnd_{{=it.id}}'><div id='bcdDndMatrixDiv_{{=it.id}}'>" + bcdui.component.cube.configuratorDND._generateDefaultLayout() + "</div></div>";
  else
    return "<div id='bcdDndMatrixDiv_{{=it.id}}'>" + bcdui.component.cube.configuratorDND._generateDefaultLayout() + "</div>";
};
/**
 * @private
 */
bcdui.component.cube._renderApplyArea = function(args) {
  return "<div><span id='bcdDNDApplyButton_{{=it.id}}'></span></div>";
};

// Extension Points

/**
 * @private
 */
bcdui.component.cube._contextMenuUrl = bcdui.config.jsLibPath+"component/cube/cubeConfigurator/contextMenu.xslt";
/**
 * @private
 */
bcdui.component.cube._cubeChain = bcdui.contextPath+"/bcdui/js/component/cube/chain.xml";


// cube

bcdui.component.cube.Cube = bcdui._migPjs._classCreate( bcdui.core.Renderer,
/**
 * @lends bcdui.component.cube.Cube.prototype
 */
{
  /**
   * @classdesc
   * Creates a cube front end based on given data or a configuration
   * @extends bcdui.core.Renderer
   *
   * @constructs
   * @param args The parameter map contains the following properties:
   * @param {targetHtmlRef}           args.targetHtml                                        - A reference to the HTML DOM Element where to put the output
   * @param {bcdui.core.DataProvider} [args.config]                                          - The model containing the cube's configuration (see cube-2.0.0.xsd). If it is not present, the configuration at './cubeConfiguration.xml' is used
   * @param {bcdui.core.DataProvider} [args.statusModel=bcdui.wkModels.guiStatusEstablished] - StatusModel (default is 'guiStatusEstablished'), containing the filters as /SomeRoot/f:Filter and the layout definition at /SomeRoot//cube:Layout[@cubeId=args.cubeId]
   * @param {bcdui.core.DataProvider} [args.detailExportFilterModel] 									       - Use this to overwrite filters found in args.statusModel, default set to args.statusModel
   * @param {string}                  [args.id]                                              - The object's id, needed only when later accessing via id. If given the Cube registers itself at {@link bcdui.factory.objectRegistry}
   * @param {chainDef}                [args.chain]                                           - An alternative rendering chain, See {@link bcdui.core.Renderer}. Default here is HtmlBuilder.
   * @param {Object}                  [args.parameters]                                      - An object, where each property holds a DataProvider being a renderer parameter used in custom chains
   */
  initialize: function(args) {

    var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.component.cube.Cube" ): "") != "";

    args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.component._schema_createCube_args );
    this.targetHtml = args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "cube_");
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.component._schema_createCube_args);

    args.id = args.id ? args.id : bcdui.factory.objectRegistry.generateTemporaryIdInScope("cube");
    this.metaDataModel = args.metaDataModel = args.config || args.metaDataModel || new bcdui.core.SimpleModel( { id: args.id+"_bcdImpl_configuration", url: "cubeConfiguration.xml" } );
    this.statusModel = args.statusModel = args.statusModel || bcdui.wkModels.guiStatusEstablished;
    args.detailExportFilterModel = args.detailExportFilterModel || args.statusModel;

    //-----------------------------------------------------------
    // Enhanced configuration translates the input into parameters for the XSLTs out chain
    this.enhancedConfiguration = args.enhancedConfiguration = args.enhancedConfiguration || new bcdui.core.ModelWrapper( {
      id: args.id+"_bcdImpl_enhancedConfiguration", inputModel: args.metaDataModel,
      chain: [ bcdui.contextPath+"/bcdui/js/component/cube/mergeLayout.xslt",
               bcdui.contextPath+"/bcdui/js/component/cube/serverCalc.xslt",
               bcdui.contextPath+"/bcdui/js/component/cube/configuration.xslt" ],
      parameters: { cubeId: args.id, statusModel: args.statusModel } } );

    //-----------------------------------------------------------
    // If we do not have an explicit input model, we create our own here from the metadata
    if( ! args.inputModel ) {
      var modelArgs = jQuery.extend({},args);
      modelArgs.chain = undefined;  // If we get a chain argument, it refers to the renderer not to the model
      modelArgs.id = args.id+"_bcdImpl_model";
      modelArgs.cubeId = args.id;
      args.inputModel = new bcdui.component.cube.CubeModel( modelArgs );
    }

    bcdui.core.Renderer.call( this, {
        id: args.id,
        inputModel: args.inputModel,
        targetHtml: args.targetHtml, 
        parameters: jQuery.extend({paramModel: args.enhancedConfiguration, cubeId: args.id}, args.parameters ),
        chain: args.chain || args.url || bcdui.contextPath+"/bcdui/xslt/renderer/htmlBuilder.xslt"
      }
    );
    
    // cube rendering chain, any change on enhancedConfiguration will refresh input model and any change to that will re-render this cube
    args.enhancedConfiguration.onChange( { callback: args.inputModel.execute.bind(args.inputModel) } );
    args.inputModel.onChange( { callback: function() { this.execute() }.bind(this) } );

    //-----------------------------------------------------------
    // Standard action handlers

    // Fires a detail export request based on current bcdRow/ColIdents of context menu
    jQuery("#"+this.targetHtml).on( "cubeActions:detailExport",
      function(id, cubeGroupedDataModel, cubeEnhancedConfiguration, metaDataModel, detailExportFilterModel, evt, memo) {

        var modelName = id + "_detailExportWrq";

        if( ! bcdui.factory.objectRegistry.getObject(modelName) ) { // If this is the first call, create the export wrs request mw
          var parameters = {
            bcdRowIdent: memo.bcdRowIdent, bcdColIdent: memo.bcdColIdent,
            cubeOrigConfiguration: bcdui.factory.objectRegistry.getObject(metaDataModel),
            cubeEnhancedConfiguration: bcdui.factory.objectRegistry.getObject(cubeEnhancedConfiguration),
            dimensionModel: bcdui.wkModels.bcdDimensions,
            filterModel: bcdui.factory.objectRegistry.getObject(detailExportFilterModel)
          }
          jQuery.extend(parameters, memo.chainParameters);
          var chain = memo.chain || bcdui.contextPath + "/bcdui/js/component/cube/detailExportWrq.xslt";
          new bcdui.core.ModelWrapper({ id: modelName, inputModel: bcdui.factory.objectRegistry.getObject(cubeGroupedDataModel), chain: chain, parameters: parameters });

        } else { // On nth>1 call, just re-run it
          var wrq =  bcdui.factory.objectRegistry.getObject(modelName);
          wrq.dataProviders.push(new bcdui.core.ConstantDataProvider({name: "bcdColIdent", value: memo.bcdColIdent}));
          wrq.dataProviders.push(new bcdui.core.ConstantDataProvider({name: "bcdRowIdent", value: memo.bcdRowIdent}));
          for (var cP in memo.chainParameters) {
            wrq.addDataProvider(
              memo.chainParameters[cP] instanceof bcdui.core.DataProvider
                ? memo.chainParameters[cP]
                : new bcdui.core.ConstantDataProvider({name: cP, value:  memo.chainParameters[cP]})
            , cP);
          }
          wrq.execute(true); // Enforce updating of parameters
        }

        // Run the export wrq, open response in a new window
        var fileType = memo.fileType || bcdui.config.settings.bcdui.component.exports.detailExportDefaultFormat;
        var exportParams = jQuery.extend({wrq: modelName, type: fileType}, memo);
        bcdui.component.exports.detailExport(exportParams);
      }.bind(undefined,args.id, args.inputModel, args.enhancedConfiguration, args.metaDataModel, args.detailExportFilterModel)
    );

    // Fires a detail export request based on current bcdRow/ColIdents of context menu
    jQuery("#"+this.targetHtml).on( "cubeActions:reportExport",
      function(targetHtml) {
      	bcdui.component.exports.exportWysiwygAsExcel({rootElement: targetHtml});
      }.bind(undefined,this.targetHtml)
    );
    
    if (isLeaf)
      this._checkAutoRegister();
  },

  /**
   * @deprecated, use getConfigModel instead
   * @private
   * @returns {bcdui.core.DataProvider} MetaData model of the cube
   */
  getMetaDataModel: function() { 
    return this.metaDataModel;
  },

  /**
   * @returns {bcdui.core.DataProvider} configuration model of the cube
   */
  getConfigModel: function() { 
    return this.metaDataModel;
  },

  /**
   * @returns {bcdui.core.DataProvider} Enhanced configuration model of the cube
   */
  getEnhancedConfiguration: function() { 
    return this.enhancedConfiguration 
  },
  
  /**
   * Only for backward compatibility. If needed in future, should be part of Renderer
   * @private
   * @returns {targetHtmlref} Target element in HTML of the cube
   */
  getTargetHTMLElement: function() { 
    return jQuery("#"+this.targetHtml).get(0);
  }

});

bcdui.util.namespace("bcdui.component",
/** @lends bcdui.component */
{
  /**
   * Helper for jsp and XAPI. First waits for all dependencies to be available
   * @private
   */
  createCubeModel: function( args )
  {
    args.id = args.id ? args.id : bcdui.factory.objectRegistry.generateTemporaryIdInScope("cubeModel");
    args.config = args.config || args.metaDataModel;
    bcdui.factory.objectRegistry.withObjects( [args.chain, args.config, args.statusModel, args.enhancedConfiguration ],  function() {
      new bcdui.component.cube.CubeModel( { id: args.id, cubeId: args.cubeId, 
        config:         			 bcdui.factory.objectRegistry.getObject(args.config),
        chain:                 bcdui.factory.objectRegistry.getObject(args.chain),
        stylesheetUrl:         args.stylesheetUrl,
        statusModel:           bcdui.factory.objectRegistry.getObject(args.statusModel),
        enhancedConfiguration: bcdui.factory.objectRegistry.getObject(args.enhancedConfiguration)
      });
    });
    return { refId: args.id, symbolicLink: true };
  },

  /**
   * Helper for jsp and XAPI. First waits for all dependencies to be available
   * @param {targetHtmlRef}           args.targetHtml                                 - A reference to the HTML DOM Element where to put the output
   * @param {bcdui.core.DataProvider} [args.config]                                   - The model containing the cube's configuration (see cube-2.0.0.xsd). If it is not present, the configuration at './cubeConfiguration.xml' is used
   * @param {bcdui.core.DataProvider} [args.statusModel]                              - StatusModel (default is 'guiStatusEstablished'), containing the filters as /SomeRoot/f:Filter and the layout definition at /SomeRoot//cube:Layout[@cubeId=args.cubeId]
   * @param {bcdui.core.DataProvider} [args.detailExportFilterModel]                  - Use this to overwrite filters found in args.statusModel
   * @param {string}                  [args.id]                                       - The object's id, needed only when later accessing via id. If given the Cube registers itself at {@link bcdui.factory.objectRegistry}
   * @private
   */
  createCube: function( args )
  {
    args.id = args.id ? args.id : bcdui.factory.objectRegistry.generateTemporaryIdInScope("cube");
    args.config = args.config || args.metaDataModel;
    bcdui.factory.objectRegistry.withObjects( [args.chain, args.config, args.statusModel, args.enhancedConfiguration, args.detailExportFilterModel], function() {
      new bcdui.component.cube.Cube( { id: args.id,
        targetHtml:              bcdui.util._getTargetHtml(args, "cube_"),
        config:                  bcdui.factory.objectRegistry.getObject(args.config),
        chain:                   bcdui.factory.objectRegistry.getObject(args.chain),
        statusModel:             bcdui.factory.objectRegistry.getObject(args.statusModel),
        enhancedConfiguration:   bcdui.factory.objectRegistry.getObject(args.enhancedConfiguration),
        detailExportFilterModel: bcdui.factory.objectRegistry.getObject(args.detailExportFilterModel),
        url:                     args.url
      });
    });
    return { refId: args.id, symbolicLink: true };
  },
    
  /**
   * Creates a cube configurator, providing the cube:Layout section of the cube configuration, able of
   * 1) Showing the drag and drop area for the dimensions and measures
   * 2) Providing templates to the user
   * 3) Allowing the user to save templates for him/herself
   * 4) Allowing the user to create new measures with the formula editor
   *
   * @param {Object} args - The parameter map contains the following properties:
   * @param {string}                  args.id                                                     - Id of the created object
   * @param {targetHtmlRef}           args.targetHtml                                             - The target HTML element for the drag-and-drop matrix.
   * @param {writableModelXPath}      [args.targetModelXPath=$guiStatus/guiStatus:Status/cube:Layout]  - Where to write the result
   * @param {string|bcdui.core.DataProvider}  [args.config=./dimensionsAndMeasures.xml]           - DataProvider containing the configuration for the cube configurator, per defaulz ./dimensionsAndMeasures.xml is loaded
   * @param {string|bcdui.component.cube.Cube} args.cubeRenderer                                  - Cube we belong to
   * @param {boolean}                 [args.isRanking=false]                                      - Show ranking editor. This is an Enterprise Edition only feature.
   * @param {boolean}                 [args.isTemplate=false]                                     - Show template Editor true/false. This is an Enterprise Edition only feature.
   * @param {boolean}                 [args.showSummary=false]                                    - Show summary of cube settings
   * @param {string}                  [args.rankingTargetHtmlElementId]                           - Custom location for ranking editor
   * @param {string}                  [args.templateTargetHtmlElementId]                          - Custom location for template editor
   * @param {string}                  [args.summaryTargetHtmlElementId]                           - Custom location for summary display
   * @param {(boolean|string)}        [args.contextMenu=false]                                    - If true, cube's default context menu is used, otherwise provide the url to your context menu xslt here.
   * @param {boolean}                 [args.isDefaultHtmlLayout=false]                            - If true, a standard layout for dnd area, ranking, templates and summary is created. Separate targetHTMLElements will be obsolete then. If false, you need to provide containers with classes: bcdCurrentRowDimensionList, bcdCurrentColMeasureList, bcdCurrentColDimensionList, bcdCurrentMeasureList, bcdDimensionList, bcdMeasureList within an outer bcdCubeDndMatrix container. if your targetHtml got classes bcdDndBlindOpen or bcdDndBlindClosed, the actual dnd area is also put in collapsable boxes (either open or closed by default).
   * @param {boolean}                 [args.hasUserEditRole]                                      - Template Editor also has edit capability. If not given, bcdui.config.clientRights.bcdCubeTemplateEdit is used to determine state (either *(any) or cubeId to enable).
   * @param {string}                  [args.applyFunction=bcdui.core.lifecycle.applyAction]       - Function name which is used for the apply button in isDefaultHtmlLayout=true mode.
   * @param {string}                  [args.url=WrsServlet]                                       - The URL the model for the grouping editor is loaded from. If omitted the WrsServlet is taken as default.
   * @param {string}                  [args.expandCollapseCells]                                  - When specified (with 'expand' or 'collapse'), cube turns on the expand/collapse mode.
   * @param {boolean}                 [args.doSortOptions=false]                                  - When setting this to true, dimensions and measures lists are sorted by caption.
   *
   * @return null.
   *
   * @example
   *   new bcdui.core.SimpleModel({
   *    id:  "myDndOptions", // define ID explicitely
   *    url: "dndOptionsModel.xml"
   *   );
   *   bcdui.component.createCubeConfigurator({
   *       id:                  "cubeConfigurator",
   *     , config:              "myDndOptions"
   *     , targetHtml:          "cubeConfiguratorDiv"
   *     , targetModelId        "guiStatus"
   *     , isRanking            true
   *     , cubeRenderer:        "cube"
   *     , rankingTargetHtmlElementId: "rankingDiv"
   *   });
   * @example
   *  &lt;div class='container_24 bcdCubeDndMatrix'>
   *    &lt;div class='grid_24'>
   *      &lt;div class='grid_3 omega bcdCurrentRowDimensionList alpha'>&lt;/div>
   *      &lt;div class='grid_3 omega bcdCurrentColMeasureList'>&lt;/div>
   *      &lt;div class='grid_3 omega'>
   *        &lt;div class='bcdCurrentColDimensionList'>&lt;/div>
   *        &lt;div class='bcdCurrentMeasureList'>&lt;/div>
   *      &lt;/div>
   *      &lt;div class='grid_5 omega'>
   *        &lt;div class='bcdHeader'>Dimensions&lt;/div>
   *        &lt;div class='bcdDimensionList'>&lt;/div>
   *      &lt;/div>
   *      &lt;div class='grid_5 omega'>
   *        &lt;div class='bcdHeader'>Measures&lt;/div>
   *        &lt;div class='bcdMeasureList'>&lt;/div>
   *      &lt;/div>
   *    &lt;/div>
   *  &lt;/div> 
   *
   */
  createCubeConfigurator: function(/* Object */ args){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("Creating DndMatrix");
    args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.component._schema_createCubeConfigurator_args );
    args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "cubeConfigurator_");
    if(args.config){
      if(args.config.id){ // reference -> ensure is known to registry
        if(!bcdui.factory.objectRegistry.getObject(args.config.id)){
          bcdui.factory.objectRegistry.registerObject(args.config);
        }
        args.metaDataModelId = args.config.id;
      }else if(args.config.refId){ // SymLink
        args.metaDataModelId = args.config.refId;
      } else { // String assumed
        args.metaDataModelId = args.config;
      }
    }
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.component._schema_createCubeConfigurator_args);
    var actualIdPrefix = bcdui.factory.objectRegistry.generateTemporaryIdInScope(typeof args.idPrefix == "undefined" ? "dndMatrix" : args.idPrefix);
    bcdui.log.isTraceEnabled() && bcdui.log.trace("DnDMatrix idPrefix = " + actualIdPrefix);

    var targetModelId = args.targetModelId || "guiStatus";

    var metaDataModel = null;
    var targetModel = bcdui.wkModels.guiStatus;

    // allow cube instance, too
    if (args.cubeRenderer instanceof bcdui.component.cube.Cube)
      args.cubeRenderer = args.cubeRenderer.id;

    // derive cubeId from cubeRenderer
    args.cubeId = (typeof args.cubeRenderer == "string") ? args.cubeRenderer : args.cubeRenderer.refId;

    if (args.targetModelId && bcdui.util.isString(args.targetModelId) && args.targetModelId != ""){
      targetModel = bcdui.factory._generateSymbolicLink(args.targetModelId);
    }
    if (args.metaDataModelId && bcdui.util.isString(args.metaDataModelId) && args.metaDataModelId != ""){
      metaDataModel = bcdui.factory._generateSymbolicLink(args.metaDataModelId);
    } else {
      metaDataModel = bcdui.factory.createModel({
        id: args.cubeId+"_dndOptionsModel",
        url: "dimensionsAndMeasures.xml"
      });
      args.metaDataModelId = args.cubeId+"_dndOptionsModel";
    }

    bcdui.log.isTraceEnabled() && bcdui.log.trace("Cube targetModel: " + targetModel);
    bcdui.log.isTraceEnabled() && bcdui.log.trace("DndMatrix metaDataModel: " + metaDataModel);

    // update targetModelId (args.targetModelId might be undefined) in arguments from current constructed targetModelId (cubeConfiguratorDND.init uses args only)
    args.targetModelId = targetModelId;

    args.isRanking  = bcdui.component._trueFalse(args.isRanking);
    args.isTemplate = bcdui.component._trueFalse(args.isTemplate);
    args.showSummary  = bcdui.component._trueFalse(args.showSummary);
    args.isDefaultHtmlLayout = bcdui.component._trueFalse(args.isDefaultHtmlLayout);
    args.doSortOptions = bcdui.component._trueFalse(args.doSortOptions);
    
    // remember url parameter on target (so it can be accessed through e.g. grouping editor
    jQuery("#" + args.targetHTMLElementId).data("url", args.url);    

    var action = function() {

      if( !args.targetHTMLElementId ) {
        var ccTarget = document.createElement("div");
        ccTarget.setAttribute("id",args.id+"Configurator");
        bcdui._migPjs._$(args.cubeRenderer.targetHTMLElementId).get(0).parentNode.insertBefore(ccTarget,bcdui._migPjs._$(args.cubeRenderer.targetHTMLElementId).get(0));
        args.targetHTMLElementId = args.id+"Configurator";
      }

      var cube = bcdui.factory.objectRegistry.getObject(args.cubeId);

      var layoutModelId = (typeof cube != "undefined") ? cube.getConfigModel().getData().selectSingleNode("//cube:Layout[@cubeId ='"+ args.cubeId +"']/@layoutModel") : null;
      layoutModelId = (layoutModelId != null && layoutModelId.text != "") ? layoutModelId.text : targetModelId;

      if (args.isDefaultHtmlLayout) {

        var template = "<div class='bcdCubeDNDBlind'>" +
        "<div id='bcdUpDown_{{=it.id}}' class='bcdUpDown'></div>" + 
        "<div id='bcdUpDownBody_{{=it.id}}'>";
        [bcdui.component.cube.templateManager._renderTemplateArea, bcdui.component.cube._renderDndArea, bcdui.component.cube.rankingEditor._renderRankingArea, bcdui.component.cube._renderApplyArea].forEach(function(e) {if (typeof e == "function") template += e(args);});
        template += "</div>";
        [bcdui.component.cube.summaryDisplay._renderSummaryArea].forEach(function(e) {if (typeof e == "function") template += e(args);});
        template += "</div>";

        var defTemplate = jQuery(doT.template(template)({id:args.cubeId}));
        jQuery("#" + args.targetHTMLElementId).append(defTemplate);

        args.targetHTMLElementId = "bcdDndMatrixDiv_" + args.cubeId;
        args.rankingTargetHtmlElementId = "bcdDndRankingDiv_" + args.cubeId;
        args.templateTargetHtmlElementId = "bcdDndTemplateDiv_" + args.cubeId;
        args.summaryTargetHtmlElementId = "bcdDndSummaryDiv_" + args.cubeId;

        args.applyFunction = args.applyFunction || bcdui.core.lifecycle.applyAction;

        bcdui.widget.createBlindUpDownArea({
          id: "bcdBlindUpDown_" + args.cubeId
          ,targetHTMLElementId: "bcdUpDown_" + args.cubeId
          ,bodyIdOrElement:"bcdUpDownBody_" + args.cubeId
          ,caption: bcdui.i18n.TAG + "bcd_Cb_Blind_Definition"
          ,defaultState: bcdui.factory.objectRegistry.getObject(layoutModelId).getData().selectSingleNode("/*/cube:Layout") == null ? "open": "closed"
        });

        // optionally add a blind for the dnd area when classes bcdDndBlindOpen/bcdDndBlindClosed are specified
        if (jQuery("#" + args.targetHtml).hasClass("bcdDndBlindOpen") || jQuery("#" + args.targetHtml).hasClass("bcdDndBlindClosed")) {
          bcdui.widget.createBlindUpDownArea({
            id: "bcdBlindUpDown_Dnd_" + args.cubeId
          , targetHtml: "bcdUpDown_Dnd_" + args.cubeId
          , bodyIdOrElement:"bcdUpDownBody_Dnd_" + args.cubeId
          , caption: bcdui.i18n.TAG + "bcd_Cb_Blind_Layout"
          , defaultState: jQuery("#" + args.targetHtml).hasClass("bcdDndBlindOpen") ? "open": "closed"
          });
        }

        bcdui.widgetNg.createButton({
          caption: "Apply",
          onClickAction: bcdui.util._toJsFunction(args.applyFunction),
          targetHtml: "#bcdDNDApplyButton_" + args.cubeId
        });
      }

      // optional expandCollapseCells activation, either add new value to layout or clean it
      var layoutRoot = bcdui.factory.objectRegistry.getObject(layoutModelId).query("//cube:Layout[@cubeId ='"+ args.cubeId +"']");
      if (args.expandCollapseCells) {
        if (layoutRoot == null)
          layoutRoot = bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(layoutModelId).getData(), "/*/cube:Layout[@cubeId ='"+ args.cubeId +"']");
        var oldValue = layoutRoot.getAttribute("expandCollapseCells");
        layoutRoot.setAttribute("expandCollapseCells", args.expandCollapseCells);
        if (oldValue != args.expandCollapseCells && cube != null) {
          cube.getEnhancedConfiguration().write("//xp:ExpandCollapseCells/@apply", args.expandCollapseCells, true);
        }
      }
      else if (layoutRoot != null && layoutRoot.getAttribute("expandCollapseCells") != null) {
        layoutRoot.removeAttribute("expandCollapseCells");
        if (cube != null)
          cube.getEnhancedConfiguration().write("//xp:ExpandCollapseCells/@apply", "false", true);
      }

      var bucketModelId = bcdui.component.cube.configuratorDND.init(args);
      
      if (args.isRanking)
        bcdui.component.cube.rankingEditor._initRanking(args, targetModelId, bucketModelId);

      if ( !!args.contextMenu && args.contextMenu !== 'false'  && args.contextMenu !== false ) {
        var contextMenuUrl = args.contextMenu === 'true' || args.contextMenu === true ? bcdui.component.cube._contextMenuUrl : args.contextMenu;

        // try to attach clicked measure / dimension information which is reused in contextMenu
        var prepareContextMenu = function(doc, args) {
          var target = jQuery("#bcdContextMenuDiv").attr("bcdEventSourceElementId");
          if (target != null) {
            var targetModel = bcdui.factory.objectRegistry.getObject(args.bcdInputModelId);
            var colIdent = bcdui.wkModels.bcdColIdent.getData() || "";
            var posPipe = colIdent.lastIndexOf('|');
            var bRef  = (posPipe > 0) ? (jQuery("#" + target).closest("tr").attr("levelId")) || "" : (bcdui.wkModels.bcdColIdent.getData() || "");
            var idRef = (posPipe > 0) ? colIdent.slice(posPipe + 1) : (bcdui.wkModels.bcdColIdent.getData() || "");
            bcdui.factory.objectRegistry.getObject(args.cubeId + "_bcdDimension").value = (targetModel.query("//cube:Layout[@cubeId ='"+ args.cubeId +"']/cube:Dimensions/*/dm:*[@bRef='" + bRef + "' or @id='" + bRef + "']") != null) ? bRef : "";
            bcdui.factory.objectRegistry.getObject(args.cubeId + "_bcdMeasure").value = (targetModel.query("//cube:Layout[@cubeId ='"+ args.cubeId +"']/cube:Measures/*/dm:*[@idRef='" + idRef + "' or @id='" + idRef + "']") != null) ? idRef : "";
          }
          return doc;
        };

        var contextMenu = bcdui.factory.createModelWrapper({
          inputModel: targetModel
        , chain     : [prepareContextMenu, contextMenuUrl]
        , parameters: {
            bcdRowIdent    : bcdui.wkModels.bcdRowIdent
          , bcdColIdent    : bcdui.wkModels.bcdColIdent
          , bcdDimension   : new bcdui.core.ConstantDataProvider({id: args.cubeId + "_bcdDimension", name: "bcdDimension", value: ""})
          , bcdMeasure     : new bcdui.core.ConstantDataProvider({id: args.cubeId + "_bcdMeasure", name: "bcdMeasure", value: ""})
          , wrsModel       : { refId: args.cubeId }
          , cubeId         : args.cubeId
          , cubeConfig     : bcdui.factory.objectRegistry.getObject(args.cubeId).getConfigModel()
          }
        });
        bcdui.widget.createContextMenu({
            targetRendererId: args.cubeId
          , inputModel      : contextMenu
          , tableMode       : true
          , refreshMenuModel: true
        });
      }

      if( args.isTemplate  ) {

        if (args.isDefaultHtmlLayout) {
          bcdui.widget.createBlindUpDownArea({
            id: "bcdBlindUpDown_Template_" + args.cubeId
            ,targetHTMLElementId: "bcdUpDown_Template_" + args.cubeId
            ,bodyIdOrElement:"bcdUpDownBody_Template_" + args.cubeId
            ,caption: bcdui.i18n.TAG + "bcd_Cb_Blind_Templates"
            ,defaultState: "open"
          });
        }
        
        // template editor requires a registered metaDataModel
        if (cube != null && typeof bcdui.factory.objectRegistry.getObject(cube.getConfigModel().id) == "undefined")
          bcdui.factory.objectRegistry.registerObject(cube.getConfigModel());

        var templateRenderer = new bcdui.core.Renderer({
          chain: bcdui.component.cube.templateManager._templateUrl,
          inputModel: bcdui.factory.objectRegistry.getObject(targetModelId),
          targetHtml: args.templateTargetHtmlElementId,
          parameters:{
            metaDataModel:   bcdui.factory.objectRegistry.getObject(args.metaDataModelId),
            metaDataModelId: args.metaDataModelId,
            reportName:      args.reportName,
            hasUserEditRole: args.hasUserEditRole
                             || (bcdui.config.clientRights && bcdui.config.clientRights.bcdCubeTemplateEdit
                               &&    (bcdui.config.clientRights.bcdCubeTemplateEdit.indexOf("*") != -1
                                   || bcdui.config.clientRights.bcdCubeTemplateEdit.indexOf(args.cubeId) != -1 )),
            targetModelId:   targetModelId,
            objectId:        args.cubeId
          }
        });
        templateRenderer.onReady(function(){jQuery(templateRenderer.getTargetHtml()).trigger("bcdui:cubeConfigurator:templateManagerRendered")});
        bcdui.factory.objectRegistry.getObject(args.metaDataModelId).onChange(function() {templateRenderer.execute()}, "/*/cube:Layouts");
      }
      if ( args.showSummary ){
        
        if (args.isDefaultHtmlLayout) {
          bcdui.widget.createBlindUpDownArea({
            id: "bcdBlindUpDown_Summary_" + args.cubeId
            ,targetHTMLElementId: "bcdUpDown_Summary_" + args.cubeId
            ,bodyIdOrElement:"bcdUpDownBody_Summary_" + args.cubeId
            ,caption:bcdui.i18n.TAG + "bcd_Cb_Blind_Settings"
            ,defaultState: "open"
          });
        }

        var summaryRenderer = new bcdui.core.Renderer({
          chain: bcdui.component.cube.summaryDisplay._summaryUrl,
          inputModel: args.statusModel,
          targetHtml: args.summaryTargetHtmlElementId,
          parameters:{
            dndOptionsModel: bcdui.factory.objectRegistry.getObject(args.metaDataModelId),
            guiStatus:       bcdui.wkModels.guiStatus,
            objectId:        args.cubeId
          }
        });
        summaryRenderer.onReady(function(){jQuery(summaryRenderer.getTargetHtml()).trigger("bcdui:cubeConfigurator:summaryRendered")});

        var trackingXPath = "/*/cube:Layout";
        trackingXPath += "|//f:Or[@type='bcdCubeExclude_" + args.cubeId + "']"
        trackingXPath += "|//f:Expression[@type='bcdCubeExclude_" + args.cubeId + "']"

        bcdui.factory.objectRegistry.getObject(targetModel).onChange(function() {summaryRenderer.execute(true)}, trackingXPath);

        // since disableClientRefresh flag is always stored in guiStatus (targetModel above does not have to be guiStatus)
        // we need to have a second listener here which rerenders the summary
        bcdui.wkModels.guiStatus.onChange(function() {summaryRenderer.execute(true)}, "/*/guiStatus:ClientSettings//cube:ClientLayout[@cubeId ='" + args.cubeId + "']/@disableClientRefresh");
      }

      // cube redisplay listener, greys out cube or triggers enhanced config
      // if client sided refresh is possible (determined by disableClientRefresh flag)
      // either listens to cube configurator targetmodel or given layoutModel
      if (typeof cube != "undefined") {

        bcdui.factory.addDataListener({
          idRef: layoutModelId,
          trackingXPath: "//cube:Layout[@cubeId ='"+ args.cubeId +"']",
          side: "after",
          onlyOnce: false,
          listener: function() {
            // enhancedConfig's input model is the cube metadata model, we need to ensure
            // that both are ready, otherwise you get a refresh which is one step out of sync
            var targetHtmlElement = bcdui.factory.objectRegistry.getObject(args.cubeId).getTargetHTMLElement();
            if (jQuery(targetHtmlElement).find(".bcdInfoBox").length == 0) {
              if (targetHtmlElement.firstChild && ! bcdui._migPjs._$("bcdCubeHide" + args.cubeId).length > 0) {
                // Indicate that the cube is currently working and disable context menu as it would work on vanishing HTML elements (producing errors)
                var div = document.createElement("div");
                div.setAttribute("id", "bcdCubeHide" + args.cubeId);
                div.setAttribute("class", "bcdCubeHide");
                div.setAttribute("title", bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_PressApplyFirst"}));
                var child = targetHtmlElement.children.length > 0 ? targetHtmlElement.children[0] : targetHtmlElement.firstChild;
                bcdui._migPjs._$(div).css({position: "absolute", width: child.offsetWidth + "px", height: child.offsetHeight + "px"});
                div.oncontextmenu = function(event) {event = event || window.event; event.stopPropagation(); return false;};
                targetHtmlElement.insertBefore(div, targetHtmlElement.firstChild);
              }
            }

            var clientSettingsDisableNode = bcdui.wkModels.guiStatus.getData().selectSingleNode("/*/guiStatus:ClientSettings//cube:ClientLayout[@cubeId ='" + args.cubeId + "']");
            var doDisable = (clientSettingsDisableNode != null && clientSettingsDisableNode.getAttribute("disableClientRefresh") == "true");
            // only run renderer if clientlayout node is set to false i.e. a direct rerender is actually allowed and possible
            if(! doDisable)
              cube.getEnhancedConfiguration().execute();
            else
              jQuery("#" + args.targetHtml).trigger("bcdui:cubeConfigurator:layoutChanged");
          }
        });
      }
      // Single entry point for standard context menu actions refreshing the cube appearance
      // Will be deregistered once configuration changes to not allow ad-hoc redisplay anymore
      bcdui._migPjs._$(args.cubeRenderer.targetHTMLElementId).on( "cubeActions:contextMenuCubeClientRefresh", function( targetModelId, cubeId, evt, memo ) {
        bcdui.component.cube.configurator._dispatchContextMenuCubeClientRefresh( memo.actionId, targetModelId, cubeId, memo );
          }.bind(undefined,targetModelId, args.cubeId)
      );
    };

    if( typeof args.cubeRenderer == "string" || args.cubeRenderer.refId) {
      bcdui.factory.objectRegistry.withReadyObjects( [args.cubeRenderer, args.metaDataModelId], function() {
        args.cubeRenderer = bcdui.factory.objectRegistry.getObject(args.cubeRenderer);
        action();
       });
    }
    else {
      bcdui.factory.objectRegistry.withReadyObjects( [args.metaDataModelId], function() {
        action();
      });
    }

    return null; //cubeDnDMatrixRenderer;
  },
  /**
  * @private
  */
  _trueFalse: function( value ){
    return ( value && value !="false" && value != "" );
  }
});
