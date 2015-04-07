define([ "require", "exports", "module", "block-static-park-map", "block-instagram-strip" ], function(require, exports, module, BlockStaticParkMap, BlockInstagramStrip) {
    "use strict";
    function replaceParkIdInQueryString(urlString, newId) {
        return urlString.replace(/([?|\&]id=)(\d*)([&|$])/, "$1" + newId + "$3");
    }
    var thisIdIndex, rootElement = document.querySelector("body"), parkNameElement = rootElement.querySelector(".park-name"), withArray = viewData.withList ? viewData.withList.split(",") : null;
    withArray && parkNameElement.addEventListener("click", function(e) {
        e.preventDefault(), "BUTTON" === e.target.tagName && (thisIdIndex = withArray.indexOf(viewData.park_id), 
        "embed-back-button" === e.target.className ? (0 === thisIdIndex ? thisIdIndex = withArray.length - 1 : thisIdIndex--, 
        location.href = replaceParkIdInQueryString(location.href, withArray[thisIdIndex])) : (thisIdIndex + 1 > withArray.length - 1 ? thisIdIndex = 0 : thisIdIndex++, 
        location.href = replaceParkIdInQueryString(location.href, withArray[thisIdIndex])));
    }), setTimeout(function() {
        new BlockStaticParkMap(".block-static-park-map", viewData, function(err, blockStaticParkMap) {
            blockStaticParkMap.utils.get(".block-static-park-map .big-park-map")[0].style.height = "100%", 
            google.maps.event.trigger(blockStaticParkMap.bigMap.getCenter(), "resize"), blockStaticParkMap.bigMap.setCenter(blockStaticParkMap.bigMap.getCenter());
        }), new BlockInstagramStrip(".block-instagram-strip", viewData, function() {});
    }, 100);
});