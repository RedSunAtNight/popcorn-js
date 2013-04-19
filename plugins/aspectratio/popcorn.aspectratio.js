/*
*   popcorn.aspectratio.js
*   This plugin changes the aspect ratio of the video.
*
*   TODO: _update is a mess. It's not needed as long as this
*   plugin in not part of Popcorn Maker. 
*/

(function( Popcorn ) {
    Popcorn.plugin("aspectratio", (function() {
        // plugin-wide variables go here
        var _plid = 0,
            identifiers = {};
        
            
        // function for getting the coordinates of an object in the window, even if it lacks absolute position.
        // Stolen from StackOverflow, user YOU posted as an answer here:
        // http://stackoverflow.com/questions/1769584/get-position-of-element-by-javascript
        function getCoords(obj) {
            var theObj = obj;
            var left = theObj.offsetLeft,
                top = theObj.offsetTop;
            while (theObj = theObj.offsetParent) {
                left += theObj.offsetLeft;
            }
            theObj = obj;
            while (theObj = theObj.offsetParent) {
                top += theObj.offsetTop;
            }
            return [left, top];
        }
        
        // function to make the necessary style elements to deform the video:
        function createStyle(oldRatio, newRatio, className, width, oldHeight){
            var heightRatio = oldRatio / newRatio;
            var cssString = '.' + className + ' { transform:scale(1 ,' + heightRatio + '); -ms-transform:scale(1,' + heightRatio + '); -moz-transform:scale(1,' + heightRatio + '); -webkit-transform:scale(1,' + heightRatio + '); -o-transform:scale(1,' + heightRatio + '); }';
            var styleElem = document.createElement('style');
            styleElem.setAttribute('type', 'text/css');
            styleElem.setAttribute('id', className); // so we can find and remove it later, if necessary
            styleElem.innerHTML = cssString;
            document.head.appendChild(styleElem);
        }
        
        // function to make the black bars over the edges of the video
        function createBars(media, oldRatio, newRatio, barId, width, height){
            // step one: determine the dimensions and orientation of the bars
            var heightRatio = oldRatio / newRatio,
                barOrient,
                barWidth;
            if (heightRatio < 1) {
                barOrient = "horizontal";
                barWidth = height * (1 - heightRatio) / 2;
            }
            else if (heightRatio > 1) {
                barOrient = "vertical";
                barWidth = (width - (newRatio * height)) / 2;
            }
                    
            // step two: make the div to hold the canvas, and the canvas itself
            var vidContainer = media.parentNode,
                barContainer = document.createElement('div'),
                barCanvas = document.createElement('canvas'),
                mediaPosition = getCoords(media),
                ctx = barCanvas.getContext('2d');
                        
            barContainer.style.position = 'absolute';
            barContainer.style.top = mediaPosition[1] + 'px';
            barContainer.style.left = mediaPosition[0] + 'px';
                    
            barCanvas.setAttribute('width', width);
            barCanvas.setAttribute('height', height);
            barCanvas.setAttribute('id', barId);
            barCanvas.style.display = 'none';
                    
            vidContainer.appendChild(barContainer);
            barContainer.appendChild(barCanvas);
                    
            // step three: draw the bars
            ctx.fillStyle = '#000000';
            if (barOrient === "horizontal"){
                ctx.fillRect(0, 0, width, barWidth);
                ctx.fillRect(0, height-barWidth, width, barWidth);
            }
            else if (barOrient === "vertical"){
                ctx.fillRect(0, 0, barWidth, height);
                ctx.fillRect(width-barWidth, 0, barWidth, height);
            }                    
        }
        
        
        return {
            // Next is the manifest, which tells Butter how to build a form
            manifest: {
                about: {
                    name: "Aspect Ratio",
                    version: "0.2",
                    author: "Helenka Casler",
                    website: "author url"
                },
                options: {
                    start: {
                        elem: "input",
                        type: "text",
                        label: "Start"
                    },
                    end: {
                        elem: "input",
                        type: "text",
                        label: "End"
                    },
                    ratio: {
                        elem: "select",
                        options: ["As-is", "4:3", "16:9", "1.85:1", "2.39:1"],
                        values:["aspect-no-change", "aspect-4-3", "aspect-16-9", "aspect-1p85-1", "aspect-2p39-1"],
                        label: "Aspect Ratio",
                        "default": "aspect-no-change"
                    },
                    m_o: {
                        elem: "select",
                        options: ["Deform", "Black bars"],
                        values: ["deform", "blackbars"],
                        label: "Method",
                        "default": "blackbars"
                    }
                }
            }, // end manifest
            
            // For everything below:
            //  "this" refers to the popcorn object
            //  track (passed in as an argument) refers to the trackevent created by the options passed
            //  event refers to the event object
            _setup: function (options) {
                /* code for initializing plugin, fires on init
                    Gotta find that video element, make sure it really exists
                    Get the dimensions of the video element
                    Establish what the new dimensions will have to be
                    
                    Also - all the stuff involving showing on the timeline
                    Maybe put a mark on the video's representation on the timeline?*/
                
                if (! _plid){
                    _plid = 0;
                }
                
                _plid++;
                options.plid = _plid; // lets you keep multiple isntances separate
                var _this = this;
                
                function doIt(){
                
                    var h = _this.media.videoHeight,
                        w = _this.media.videoWidth,
                        oldAspectRatio = w / h,
                        newAspectRatio,
                        cssClass = options.ratio + '-' + options.plid,
                        barId = cssClass;
                        
                    options.identifier = cssClass; // so you can get at it later
                    
                    var strPlid = options.plid + '';
                    identifiers[strPlid] = options.identifier;
                    
                    console.log('The media item here is ' + _this.media);
                    console.log('The identifier here is ' + options.identifier);
                
                    console.log('Old video height is ' + w); // sanity check -- makes sure it's loaded right
                
                    // set the value of newAspectRatio
                    if (options.ratio === "aspect-no-change") {
                        newAspectRatio = oldAspectRatio;
                    }
                    else if (options.ratio === "aspect-4-3") {
                        newAspectRatio = 4/3;
                    }
                    else if (options.ratio === "aspect-16-9") {
                        newAspectRatio = 16/9;
                    }
                    else if (options.ratio === "aspect-1p85-1") {
                        newAspectRatio = 1.85;
                    }
                    else if (options.ratio === "aspect-2p39-1") {
                        newAspectRatio = 2.39;
                    }
                    else {
                        throw 'Error: nonexistent aspect ratio option selected.';
                    }
                    
                    // Make the style or canvas elements
                    if (options.m_o === "deform"){
                        createStyle(oldAspectRatio, newAspectRatio, cssClass, w, h);
                    }
                    else if (options.m_o === "blackbars"){
                        createBars(_this.media, oldAspectRatio, newAspectRatio, barId, w, h);
                    }
                    else {
                        throw 'Error: nonexistent method for changing aspect ratio';
                    }
                
                }
                
                // Lines below exists because without it, video dimensions were being read as zero
                if (_this.media.readyState >= 2){
                    doIt();
                }
                else {
                    window.addEventListener('load', doIt);
                }
                
            },
            _update: function (trackEvent, options) {
                /* code for update of plugin-created track event
                    mostly redoes _setup */
                
                /*
                if (! options._plid){
                    options.plid = _plid; // BAD. Need to hold onto plid some other way.
                }
                
                var _this = this,
                    h = _this.media.videoHeight,
                    w = _this.media.videoWidth,
                    oldAspectRatio = w / h,
                    newAspectRatio,
                    cssClass,
                    barId,
                    strPlid = options.plid + '';
                
                // The following if/else does not work.
                // Needs a way of keeping track of identifiers for css classes and
                // blackbar canvases on update.
                if (options.ratio) {
                    cssClass = options.ratio + '-' + options.plid;
                    barId = cssClass;
                    console.log('Updated ratio: identifier is now ' + cssClass);
                    identifiers[strPlid] = cssClass;
                } else {
                    // indicates ratio was not changed, and so keep the same identifier
                    cssClass = identifiers[strPlid];
                    barId = cssClass;
                    console.log('Did not update ratio: identifier is now ' + cssClass);
                }
                
                options.identifier = cssClass;
                
                console.log('The media item here is ' + _this.media);
                
                console.log('Update: Old video height is ' + w); // sanity check -- makes sure it's loaded right
                console.log('The identifier here is ' + options.identifier);
                
                // set the value of newAspectRatio
                if (options.ratio === "aspect-no-change") {
                    newAspectRatio = oldAspectRatio;
                }
                else if (options.ratio === "aspect-4-3") {
                    newAspectRatio = 4/3;
                }
                else if (options.ratio === "aspect-16-9") {
                    newAspectRatio = 16/9;
                }
                else if (options.ratio === "aspect-1p85-1") {
                    newAspectRatio = 1.85;
                }
                else if (options.ratio === "aspect-2p39-1") {
                    newAspectRatio = 2.39;
                }
                else {
                    throw 'Error: nonexistent aspect ratio option selected.';
                }
                    
                // Make the style or canvas elements
                if (options.m_o === "deform"){
                    createStyle(oldAspectRatio, newAspectRatio, cssClass, w, h);
                }
                else if (options.m_o === "blackbars"){
                    createBars(_this.media, oldAspectRatio, newAspectRatio, barId, w, h);
                }
                else {
                    throw 'Error: nonexistent method for changing aspect ratio';
                }
                */
            },
            _teardown: function (options) {
                /* code for removal of plugin or destruction of instance
                    Clean up all references to the aspect ratio on the timeline
                    Clear all event listeners made for this plugin
                    Remove the <style> element added by start, if it's still there*/
                if (options.m_o === "deform") {
                    // find the right CSS style element and remove it
                    var styleElem = document.getElementById(options.identifier);
                    document.head.removeChild(styleElem);
                }
                else if (options.m_o === "blackbars") {
                    // find the canvas with the bars on it, and remove it and its container
                    var barCanvas = document.getElementById(options.identifier),
                        barContainer = barCanvas.parentNode;
                    barContainer.removeChild(barCanvas);
                    document.body.removeChild(barContainer);
                }
            },
            start: function (event, options) {
                /* code to run on track.start*/
                if (options.m_o === "deform") {
                    // find the right CSS class, and add it to the video element
                    this.media.classList.add(options.identifier);
                    // TODO: If the clip changes before the end time, need to add this class to the other clip??
                }
                else if (options.m_o === "blackbars") {
                    // find the canvas with the bars on it, and show it
                    var barCanvas = document.getElementById(options.identifier);
                    barCanvas.style.display = '';
                }
            },
            end: function (event, options) {
                /* code to run on track.end*/
                if (options.m_o === "deform") {
                    // find the right CSS class, and remove it from the video element
                    this.media.classList.remove(options.identifier);
                    // TODO: if the clip changed during the aspect ratio time, need to remove the class from all clips??
                }
                else if (options.m_o === "blackbars") {
                    // find the canvas with the bars on it, and hide it
                    var barCanvas = document.getElementById(options.identifier);
                    barCanvas.style.display = 'none';
                }
            },
            frame: function (event, track) {/* code will fire on every frame between end and start, if frameAnimation is enabled*/},
            toString: function (options) {
                /* provides a string representation for the plugin */
                return options.ratio;
            }
        };
    })());
})(Popcorn);