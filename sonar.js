var win = window;
var doc = document;
var body = doc.body;
var pollId;
var pollQueue = {};
var pollActive = 0;
var onScreenEvent = 'scrollin';
var offScreenEvent = 'scrollout';

pollQueue[ onScreenEvent ] = [];
pollQueue[ offScreenEvent ] = [];

function Sonar() {};

Sonar.prototype.detect = function(elem, distance, full) {
    var parentElem, elemTop, bodyHeight, screenHeight, scrollTop, elemHeight;

    if (elem) {

        body || (body = doc.body); // Cache the body elem in our private global.
        parentElem = elem; // Clone the elem for use in our loop.
        elemTop = 0; // The resets the calculated elem top to 0.
        bodyHeight = body.offsetHeight; // Used to recalculate elem.sonarElemTop if body height changes.
        screenHeight = win.innerHeight || doc.documentElement.clientHeight || body.clientHeight || 0; // Height of the screen.
        scrollTop = doc.documentElement.scrollTop || win.pageYOffset || body.scrollTop || 0; // How far the user scrolled down.
        elemHeight = elem.offsetHeight || 0; // Height of the element.

        // If our custom "sonarTop" variable is undefined, or the document body
        // height has changed since the last time we ran sonar.detect()...
        if (!elem.sonarElemTop || elem.sonarBodyHeight !== bodyHeight) {

            // Loop through the offsetParents to calculate it.
            if (parentElem.offsetParent) {
                do {
                    elemTop += parentElem.offsetTop;
                }
                while (parentElem = parentElem.offsetParent);
            }

            // Set the custom property (sonarTop) to avoid future attempts to calculate
            // the distance on this elem from the top of the page.
            elem.sonarElemTop = elemTop;

            // Along the same lines, store the body height when we calculated
            // the elem's top.
            elem.sonarBodyHeight = bodyHeight;
        }

        // If no distance was given, assume 0.
        distance = distance === undefined ? 0 : distance;

        // If elem bottom is above the screen top and
        // the elem top is below the screen bottom, it's false.
        // If full is specified, it si subtracted or added
        // as needed from the element's height.
        return (!(elem.sonarElemTop + (full ? 0 : elemHeight) < scrollTop - distance) &&
            !(elem.sonarElemTop + (full ? elemHeight : 0) > scrollTop + screenHeight + distance));
    }
};

Sonar.prototype.addSonar = function(elem, options) {
    var distance = options.px;
    var full = options.full;
    var screenEvent = options.evt;
    var detected = this.detect(elem, distance, full);
    var triggered = 0;

    elem['_' + screenEvent] = 1;

    // If the elem is not detected (offscreen) or detected (onscreen)
    // trigger the event and fire the callback immediately.
    if (screenEvent === offScreenEvent ? !detected : detected) {
        options.callback && options.callback.apply(elem, []);
        triggered = 1;

        // Otherwise, add it to the polling queue.
    }

    // Push the element and its callback into the poll queue.
    pollQueue[screenEvent].push({
        elem: elem,
        px: distance,
        full: full,
        tr: triggered,
        callback: options.callback
    });

    // Activate the poll if not currently activated.
    if (!pollActive) {
        win.onscroll = this.poll.bind(this);
        pollActive = 1;
    }
};

Sonar.prototype.poll = function() {
            
    // Debouncing speed optimization. Essentially prevents
    // poll requests from queue'ing up and overloading
    // the scroll event listener.
    pollId && clearTimeout(pollId);
    
    pollId = setTimeout(function() {
        var elem, elems, screenEvent, options, detected, i, l;

        for (screenEvent in pollQueue) {
            elems = pollQueue[screenEvent];

            for (i = 0, l = elems.length; i < l; i++) {
                options = elems[i];
                elem = options.elem;
                detected = this.detect(elem, options.px, options.full);

                // If the elem is not detected (offscreen) or detected (onscreen)
                // remove the elem from the queue and fire the callback.
                if (screenEvent === offScreenEvent ? !detected : detected) {
                    if (!options.tr) {
                        if (elem['_' + screenEvent]) {
                            // Trigger the onscreen or offscreen event depending
                            // on the desired event.
                            options.callback && options.callback.apply(elem, []);
                            options.tr = 1;
                            // removeSonar was called on this element, clean it up
                            // instead of triggering the event.
                        } else {
                            // Remove this object from the elem poll container.
                            elems.splice(i, 1);
                            // Decrement the counter and length because we just removed
                            // one from it.
                            i--;
                            l--;
                        }
                    }
                } else {
                    options.tr = 0;
                }
            }
        }
    }.bind(this), 0); // End setTimeout performance tweak.
};

module.exports = new Sonar();
