/**
 * Created by amandaghassaei on 3/17/17.
 */

var allDataTypes = {
    "uint8": 1,
    "int8": 1,
    "int16": 2,
    "int32": 4,
    "float32": 4
};

var dataViewTypes = {
    "uint8": THREE.UnsignedByteType,
    "int8": THREE.ByteType,
    "int16": THREE.ShortType,
    "int32": THREE.IntType,
    "float32": THREE.FloatType
};

var dataTypeLookup = {
    2: "uint8",
    4: "int16",
    8: "int32",
    16: "float32"
};

var currentFileName = null;
var currentFileSize = 0;
var currentFile = null;
var dataType = "int8";
var dataLength = allDataTypes[dataType];
var headerLength = 348;

var threeView;


var layerNumber = 0;
var lastLayerRequested = 0;
var size = [1,1,1];
var currentData = null;

var reader = new FileReader();
reader.onload = chunkRead;

function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object
    if (files.length<1) return;
    currentFile = files[0];
    currentFileName = currentFile.name;
    currentFileSize = currentFile.size;

    $("#currentFileName").html(currentFileName);
    $("#currentFileSize").html(numberWithCommas(currentFileSize));
    $("#fileInfo").show();
    $("#flythroughSlider").show();

    layerNumber = 0;
    $("#layerNumber").val(layerNumber);
    $('#flythroughSlider>div').slider( "value", layerNumber);

    readHeader();
    clear();
}

function chunkRead(e){
    if (e.target.error == null) {
        var data = new Uint16Array(e.target.result);
        var byteData = new Uint8Array(data.length);
        for (var i=0;i<data.length;i++){
            byteData[i] = data[i]>>8;
        }
        console.log(byteData);
        showData(byteData);
        currentData = byteData;
        if (lastLayerRequested != layerNumber) getLayer();
    } else {
        console.log("Read error: " + e.target.error);
    }
}

function readHeader(){
    reader.onload = getHeaderLength;
    readChunk(0, 4);
}

function getHeaderLength(e){
    if (e.target.error == null) {
        var data = new Int32Array(e.target.result);
        reader.onload = parseHeader;
        if (data[0] != 348) console.warn("header is not 348 bytes long");
        headerLength = data[0];
        readChunk(0, headerLength);
    } else {
        console.log("Read error: " + e.target.error);
    }
}

function readShort(data, start, end){
    var short = new Int16Array(data.slice(start, end));
    console.log(short);
    return short;
}

function readFloat(data, start, end){
    var float = new Float32Array(data.slice(start, end));
    console.log(float);
    return float;
}

function parseHeader(e){
    if (e.target.error == null) {
        console.log(e.target.result);
        var data = e.target.result;
        var dataArrayDimensions = readShort(data, 40, 56);
        if (dataArrayDimensions[0] !== 3){
            console.warn("more than 3 dimensions detected");
        }
        size = [dataArrayDimensions[1], dataArrayDimensions[2], dataArrayDimensions[3]];
        // var firstIntentParam = readFloat(data, 56, 60);
        // var secondIntentParam = readFloat(data, 60, 64);
        // var thirdIntentParam = readFloat(data, 64, 68);
        // var intentCode = readShort(data, 68, 70);
        var type = readShort(data, 70, 72);//Int16
        dataType = dataTypeLookup[type];
        if (dataType === undefined) {
            console.warn("unknown type code " + type);
            return;
        }
        dataLength = allDataTypes[dataType];
        var bitPix = readShort(data, 72, 74);
        if (bitPix != 8*dataLength) {
            console.warn("incompatible data lengths " + dataLength + " " + bitPix);
            return;
        }
        var firstSliceIndex = readShort(data, 74, 76);
        var lastSliceIndex = readShort(data, 120, 122);

        layerNumber = 0;
        $("#layerNumber").val(layerNumber);
        reader.onload = chunkRead;
        changeSize();
    } else {
        console.log("Read error: " + e.target.error);
    }
}

function readChunk(start, numPixels){
    if (!currentFile) return;
    var length = dataLength*numPixels;
    var blob = currentFile.slice(start, length+start);
    reader.readAsArrayBuffer(blob);
}

$(document).ready(function(){

    threeView = ThreeView();
    initDataView();
    initControls();

    // Check for the various File API support.
    if (window.File && window.FileReader && window.FileList && window.Blob) {
    } else {
        alert('The File APIs are not fully supported in this browser.');
        return;
    }

    $("#fileSelector").change(handleFileSelect);
});