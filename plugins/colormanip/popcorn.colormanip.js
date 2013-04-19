/*
*   popcorn.colormanip.js
*   Change the colors on a segment of video.
*   Color options are black and white, sepia, and custom.
*
*   This will NOT work cross-domain. It works by copying the image data from
*   a canvas which contains a frame of video, manipulating the image, and
*   re-placing the image on a canvas. For security reasons, most browsers
*   will not allow reading data that has been copied from an external
*   source onto an invisible canvas.
*
*   Color Manipulation Plug-in
*
*   @param {Object} options
*
*   Required parameters: start, end, coloring
*   Optional parameters: customRed, customGreen, customBlue
*
*       start: the time in seconds when the change in color should be applied
*
*       end: the time in seconds when the colors should return to normal
*
*       coloring: values may be "color-no-change", "blackwhite", "sepia", or "custom"
*                 The change in color to be applied.
*
*       customRed: the amount of red, from 0 to 255, to add to the video image
*
*       customGreen: the amount of green, from 0 to 255, to add to the video image
*
*       customBlue: the amount of blue, from 0 to 255, to add to the video image
*
*   Example:
*
*   // We want more green, a little more red, but less blue
*   Popcorn( function(){
*       var popcorn = Popcorn("#video");
*       popcorn.colormanip({
*           "start": 1.4,
*           "end": 5.2,
*           "coloring": "custom",
*           "customRed": 10,
*           "customGreen": 30,
*           "customBlue": -30
*       });
*   });
*/

(function( Popcorn ) {
    Popcorn.plugin("colormanip", (function() {
        // plugin-wide variables go here
            
        function makeBW(media, bufctx, colctx, w, h, framecount) {
            framecount += 1;
            //console.log('in function makeBW()');
            bufctx.drawImage(media, 0, 0);
            var imgD = bufctx.getImageData(0, 0, w, h), // will not work cross-domain
                pixels = imgD.data;
            // change pixels to black-and-white pixels
            for (var i = 0; i < pixels.length; i += 4) {
                var red = pixels[i],
                    green = pixels[i+1],
                    blue = pixels[i+2],
                    gray = ( red + green + blue ) / 3;
                pixels[i] = gray;
                pixels[i+1] = gray;
                pixels[i+2] = gray;
                // keep pixels[i+3] the same, as that's alpha - the opacity.
            }
            colctx.putImageData(imgD, 0, 0);
            var redrawID = setTimeout(makeBW, 20, media, bufctx, colctx, w, h, framecount); // this is WAY better than telling it to redraw on timeupdate
            // No need to have it keep drawing when the video is paused:
            media.addEventListener('pause', function() {clearTimeout(redrawID)});
            if (framecount === 1) {
                return redrawID;
            }
        }
        
        function makeSepia(media, bufctx, colctx, w, h, framecount) {
            framecount += 1;
            //console.log('in function makeSepia');
            bufctx.drawImage(media, 0, 0);
            var imgD = bufctx.getImageData(0, 0, w, h), // will not work cross-domain
                pixels = imgD.data;
            // change pixels to black-and-white pixels
            for (var i = 0; i < pixels.length; i += 4) {
                var red = pixels[i],
                    green = pixels[i+1],
                    blue = pixels[i+2],
                    gray = ( red + green + blue ) / 3;
                pixels[i] = gray + 46;
                pixels[i+1] = gray; // was + 56
                pixels[i+2] = gray - 46;
                // keep pixels[i+3] the same, as that's alpha - the opacity.
            }
            colctx.putImageData(imgD, 0, 0);
            var redrawID = setTimeout(makeSepia, 20, media, bufctx, colctx, w, h, framecount); // this is WAY better than telling it to redraw on timeupdate
            media.addEventListener('pause', function() {clearTimeout(redrawID)});
            if (framecount === 1) {
                return redrawID;
            }
        }
        
        function adjustColor(media, bufctx, colctx, w, h, framecount, redAdd, greenAdd, blueAdd) {
            //console.log('in adjustColor()');
            framecount += 1;
            bufctx.drawImage(media, 0, 0);
            var imgD = bufctx.getImageData(0, 0, w, h), // will not work cross-domain
                pixels = imgD.data;
            // add values to each color in each pixel
            for (var i = 0; i < pixels.length; i += 4) {
                pixels[i] += redAdd;
                pixels[i+1] += greenAdd;
                pixels[i+2] += blueAdd;
                // keep pixels[i+3] the same, as that's alpha - the opacity.
            }
            colctx.putImageData(imgD, 0, 0);
            var redrawID = setTimeout(adjustColor, 20, media, bufctx, colctx, w, h, framecount, redAdd, greenAdd, blueAdd); // this is WAY better than telling it to redraw on timeupdate
            media.addEventListener('pause', function() {clearTimeout(redrawID)});
            if (framecount === 1) {
                return redrawID;
            }
        }
        
        return {
            // Next is the manifest, which tells Butter how to build a form
            manifest: {
                about: {
                    name: "Color Manipulation",
                    version: "0.1",
                    author: "Helenka Casler",
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
                    target: "#video", // should 'stick' to a particular video element
                    coloring: {
                        elem: "select",
                        options: ["As-is", "Black & White", "Sepia", "Custom"],
                        values:["color-no-change", "blackwhite", "sepia", "custom"],
                        label: "Colors",
                        "default": "color-no-change"
                    },
                    customRed: {
                        elem: "input",
                        type: "number",
                        label: "Red",
                        "default": 0
                    },
                    customGreen: {
                        elem: "input",
                        type: "number",
                        label: "Green",
                        "default": 0
                    },
                    customBlue: {
                        elem: "input",
                        type: "number",
                        label: "Blue",
                        "default": 0
                    }
                }
            }, // end manifest
            
            // For everything below:
            //  "this" refers to the popcorn object
            //  track (passed in as an argument) refers to the trackevent created by the options passed
            //  event refers to the event object
            _setup: function (options) {
                var _this = this,
                    _mediaHolder = _this.media.parentNode,
                    _coloring = options.coloring,
                    _colorCanvas,
                    _bufferCanvas,
                    _media = this.media,
                    _redAdd = options.customRed,
                    _greenAdd = options.customGreen,
                    _blueAdd = options.customBlue,
                    _bufctx,
                    _colctx,
                    w,
                    h;
                
                options.media = _media;
                    
                //console.log('Popcorn media is ' + media);
                    
                function makeCanvases() {
                    w = _this.media.videoWidth;
                    h = _this.media.videoHeight;
                    
                    // create a canvas to display the color-changed video, and a div to hold the canvas
                    var candiv = document.createElement('div');
                    candiv.style.position = 'absolute';
                    _mediaHolder.appendChild(candiv);
                    candiv.style.top = _media.offsetTop + 'px'; // so that the canvas will appear over the video
                    candiv.style.left = _media.offsetLeft + 'px';
                    _colorCanvas = document.createElement('canvas');
                    _colorCanvas.style.display = 'none';
                    _colorCanvas.width = w;
                    _colorCanvas.height = h;
                    candiv.appendChild(_colorCanvas);
                    
                    _colctx = _colorCanvas.getContext('2d');
                    options.colorCanvas = _colorCanvas;
                    
                    // create a buffer canvas to hold each frame for processing
                    // note that it just "floats" and is never appended to the document
                    _bufferCanvas = document.createElement('canvas');
                    _bufferCanvas.style.display = 'none';
                    _bufferCanvas.width = w;
                    _bufferCanvas.height = h;
                    _bufctx = _bufferCanvas.getContext('2d');
                    options.bufferCanvas = _bufferCanvas;
                    console.log('The variable bufctx is ' + _bufctx);
                    
                    
                    if (_coloring === "color-no-change"){
                        return;
                    }
                    else if (_coloring === "blackwhite"){
                        _media.addEventListener('play', function(){
                            var framecounter = 0;
                            console.log('Playing. The variable bufctx is ' + _bufctx);
                            options.redrawID = makeBW(_media, _bufctx, _colctx, w, h, framecounter);
                        });
                    }
                    else if (_coloring === "sepia"){
                        _media.addEventListener('play', function(){
                            var framecounter = 0;
                            options.redrawID = makeSepia(_media, _bufctx, _colctx, w, h, framecounter);
                        });
                    }
                    else if (_coloring === "custom"){
                        _media.addEventListener('play', function(){
                            var framecounter = 0;
                            options.redrawID = adjustColor(_media, _bufctx, _colctx, w, h, framecounter, _redAdd, _greenAdd, _blueAdd);
                        });
                    }
                }
                
                if (_media.readyState >= 3) {
                    makeCanvases();
                }
                else {
                    window.addEventListener('load', makeCanvases);
                }
            },
            _update: function (trackEvent, options) {
                /* code for update of plugin-created track event
                    mostly redoes _setup */
                // TBA
            },
            _teardown: function (options) {
                /* code for removal of plugin or destruction of instance */
                options.media.removeEventListener('play', makeBW);
                options.media.removeEventListener('play', makeSepia);
                options.media.removeEventListener('play', adjustColor);
                
                canvasDiv = options.colorCanvas.parentNode;
                canvasDiv.removeChild(options.colorCanvas);
                document.removeChild(canvasDiv);
            },
            start: function (event, options) {
                options.colorCanvas.style.display = '';
            },
            end: function (event, options) {
                options.colorCanvas.style.display = 'none';
            },
            frame: function (event, track) {/* code will fire on every frame between end and start, if frameAnimation is enabled*/},
            toString: function () {
                /* provides a string representation for the plugin */
                return 'Color adjustment'
            }
        };
    })());
})(Popcorn);