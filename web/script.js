// script.js
// - Author: cocm1324@gmail.com

// TODO
// - submit

// # Variables Block
// - consist of two part, html elements and state variables
// - html elements are self explanatory
// - state variables are to hold states such as current pattern that selected

// ## HTML Element Variables 
var patternButton = document.getElementById('pattern-button');
var patternMenu = document.getElementById('pattern-menu');
var patternDiscription = document.getElementById('pattern-discription');
var inputPrefix = document.getElementById('input-prefix');
var inputSuffix = document.getElementById('input-suffix');
var urlInvalid = document.getElementById('url-invalid');
var inputStart = document.getElementById('input-start');
var inputMiddle = document.getElementById('input-middle');
var inputEnd = document.getElementById('input-end');
var patternInvalid = document.getElementById('pattern-invalid');
var previewText = document.getElementById('preview-text');
var submit = document.getElementById('submit');
var reset = document.getElementById('reset');
var download = document.getElementById('download');

// ## State Variables
var patternList = [];
var currentPattern = '';
var currentUrlValid = false;
var currentPatternValid = false;
var currentLang = 'en';
var isDownload = false;

var inputPrefixPrestine = true;
var inputSuffixPrestine = true;
var inputStartPrestine = true;
var inputEndPrestine = true;

// ## Constants 
var displayNoneClassName = 'd-none';
var dropdownDisplayClassName = 'show';
var inputInvalidClassName = 'is-invalid';
var buttonDisabledClassName = 'disabled';
var inputDisabledAttrName = 'disabled';
var urlValidationRegex = /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;

var backendUrl = 'http://localhost:3000/download'

// # Pattern Business Logic
// - define pattern business logic
// - refer integerPattern object to get how to write pattern object
var integerPattern = {
    value: 'integer',
    label: {
        en: 'Integer Range',
        ko: '정수 범위'
    },
    discription: {
        en: 'Set range with integer (ex: 1029~1120)',
        ko: '정수로 범위를 지정합니다 (예시: 1029~1120)',
    },
    validator: [
        startRequiredValidator,
        endRequiredValidator,
        integerRangeValidator,
        inputLengthLimitValidator(32),
        fileCountLimitValidator(100)
    ],
    mapper: function (prefix, suffix, start, end) {
        var _start = parseInt(start);
        var _end = parseInt(end);
        var mapped = [];
        for (var i = _start; i <= _end; i++) {
            mapped.push(prefix + i + suffix);
        }
        return mapped;
    }
}
patternList.push(integerPattern);

var enumPattern = {
    value: 'enum',
    label: {
        en: 'Enumeration',
        ko: '열거'
    },
    discription: {
        en: 'Without using range or pattern, enumerate all element with delimiters(,.- or space, line feeds, tabs)',
        ko: '범위나 패턴을 지정하지 않고 열거합니다. 구분자(,. 혹은 띄워쓰기, 줄바꿈, 탭)를 사용하여 구분합니다.',
    },
    validator: [
        startRequiredValidator,
        inputLengthLimitValidator(2048),
        fileCountLimitValidator(100)
    ],
    mapper: function(prefix, suffix, start, end) {
        var mapped = [];
        start.split(/[,\.\s\t\n]+/).forEach(function(elem) {
            if (elem.length == 0) return;
            mapped.push(prefix + elem + suffix);
        });
        return mapped;
    },
    hideMiddle: true,
    hideEnd: true
}
patternList.push(enumPattern);


// # DOM Element Manipulation Block
// - in here, put code that manipulates elements right after this js is loaded
// - kind of initialization
patternList.forEach(function(pattern) {
    var menu = document.createElement('a');
    menu.classList.add('dropdown-item');
    menu.innerText = pattern.label[currentLang];
    menu.setAttribute('pattern', pattern.value);
    menu.onclick = function(event) {
        var targetPattern = event.target.getAttribute('pattern');
        currentPattern = targetPattern;
        cleanUpPatternInput();
        applyPatternToForm(targetPattern);
        renderPreviewSubmit();
    } 
    patternMenu.appendChild(menu);
});

inputStart.setAttribute(inputDisabledAttrName, '');
inputEnd.setAttribute(inputDisabledAttrName, '');
submit.classList.add(buttonDisabledClassName);
reset.classList.add(displayNoneClassName);
download.classList.add(displayNoneClassName);

// # Event Block
// - event block is to register event handlers
window.onclick = function(event) {
    if (event.target == patternButton) {
        if (patternMenu.classList.contains(dropdownDisplayClassName)) {
            patternMenu.classList.remove(dropdownDisplayClassName);
            return;
        }
        patternMenu.classList.add(dropdownDisplayClassName);
        return;
    } else {
        patternMenu.classList.remove(dropdownDisplayClassName);
    }

    if (event.target == submit) {
        requestBulkDownload();
    }
}

window.onkeydown = function(event) {
    // regular key down 
    // setTimeout -> because it takes bit of milisecond for input element to get updated its value;
    // 1. fire validation functions
    // 2. update preview function
    setTimeout(function () {
        if (event.target != inputPrefix && event.target != inputSuffix && event.target != inputStart && event.target != inputEnd) { 
            return
        }
        if (event.target == inputPrefix || event.target == inputSuffix) {
            if (event.target == inputPrefix && inputPrefixPrestine) inputPrefixPrestine = false;
            if (event.target == inputSuffix && inputSuffixPrestine) inputSuffixPrestine = false;
            evaluateUrlForm();
        }
        if (event.target == inputStart || event.target == inputEnd) {
            if (event.target == inputStart && inputStartPrestine) inputStartPrestine = false;
            if (event.target == inputEnd && inputEndPrestine) inputEndPrestine = false;
            evaluatePatternForm();
        }
        resetDownload();
        renderPreviewSubmit();
    }, 100);
}


// # Functions
// - put function definitions here
// - consist of two category 1)validators 2)state changing functions

// ## Validator functions
function urlValidator(urlString) {
    if (urlValidationRegex.test(urlString)) {
        return null;
    }

    return {
        en: 'Invalid URL',
        ko: '잘못된 URL입니다'
    };
}

function startRequiredValidator(start, _) {
    if (start && start.length > 0) {
        return null;
    }
    return {
        en: 'Required',
        ko: '필수값입니다'
    };
}

function endRequiredValidator(_, end) {
    if (end && end.length > 0) {
        return null;
    }
    return {
        en: 'Required',
        ko: '필수값입니다'
    };
}

function integerRangeValidator(start, end) {
    var numericMessage = {
        en: 'Please type number value',
        ko: '숫자를 입력해 주시기 바랍니다'
    }
    var rangeMessage = {
        en: 'Please type in valid range',
        ko: '올바른 범위를 입력해 주시기 바랍니다'
    }
    if (isNaN(parseInt(start))) return numericMessage;
    if (isNaN(parseInt(end))) return numericMessage; 
    if (parseInt(start) > parseInt(end)) return rangeMessage;
    return null;
}

function inputLengthLimitValidator(startMaxLength, endMaxLength) {
    if (!endMaxLength) endMaxLength = startMaxLength;
    
    var message = {
        en: 'Please keep input limit: ' + startMaxLength + ', ' + endMaxLength,
        ko: '최대 글자수를 넘었습니다: ' + startMaxLength + ', ' + endMaxLength
    };

    return function(start, end) {
        if (('' + start).length > startMaxLength) return message;
        if (('' + end).length > endMaxLength) return message;
        return null;
    }
}

function fileCountLimitValidator(limit) {
    return function(start, end, self) {
        var length = self.mapper('', '', start, end).length; 
        if (length <= limit) {
            return null;
        }

        return {
            en: 'File limit had exceeded: (' + length + '/' + limit + ')',
            ko: '파일 갯수가 초과되었습니다: (' + length + '/' + limit + ')'
        } 
    }
}

// ## State Changing Functions
function applyPatternToForm(pattern) {
    // get target pattern
    var targets = patternList.filter(function(elem) {
        if (elem.value == pattern) return true;
        return false;
    });
    if (targets.length == 0) throw 'Invalid Pattern Value';

    var target = targets[0];
    
    // replace text
    patternButton.innerText = target.label[currentLang];
    patternDiscription.innerText = target.discription[currentLang];
    
    // remove disabled attribute
    inputStart.removeAttribute(inputDisabledAttrName);
    inputEnd.removeAttribute(inputDisabledAttrName);

    // initialize validation
    currentPatternValid = false;
    inputStartPrestine = true;
    inputEndPrestine = true;

    // apply input hide
    if (target.hideMiddle != null && target.hideMiddle) {
        inputMiddle.style.display = 'none';
    } else {
        inputMiddle.style.display = 'block';
    }

    if (target.hideEnd != null && target.hideEnd) {
        inputEnd.style.display = 'none';
    } else {
        inputEnd.style.display = 'block';
    }
}

function evaluateUrlForm() {
    var invalidMessage = startRequiredValidator(inputPrefix.value);
    if (!inputPrefixPrestine && invalidMessage != null) {
        setUrlInvalid(invalidMessage);
        currentUrlValid = false;
    } else {
        invalidMessage = urlValidator(inputPrefix.value + 'pattern' + inputSuffix.value);
        if (!inputPrefixPrestine && invalidMessage != null) {
            setUrlInvalid(invalidMessage);
            currentUrlValid = false;
        } else {
            currentUrlValid = true; 
            setUrlValid();
        }
    } 
}

function evaluatePatternForm() {
    var targetPattern = patternList.filter(function(elem) { return elem.value == currentPattern })[0];
    invalidMessage = targetPattern.validator.map(function(elem) { 
        return elem(inputStart.value, inputEnd.value, targetPattern);
    }).reduce(function(prev, curr, _) {
        if (prev != null) return prev;
        return curr;
    });
    if (invalidMessage != null) {
        setPatternInvalid(invalidMessage);
        currentPatternValid = false;
    }
    
    if (invalidMessage == null) {
        currentPatternValid = true;
        setPatternValid();
    }
}

function renderPreviewSubmit() {
    if (!currentUrlValid && !currentPatternValid) {
        submit.classList.add(buttonDisabledClassName);
        previewText.innerHTML = '-';
    }

    if (currentUrlValid && !currentPatternValid) {
        submit.classList.add(buttonDisabledClassName);
        previewText.innerHTML = inputPrefix.value + '{{ pattern }}' + inputSuffix.value;
    }

    if (currentUrlValid && currentPatternValid) {
        submit.classList.remove(buttonDisabledClassName);
        var mapper = patternList.filter(function(elem) { return elem.value == currentPattern })[0].mapper; 
        var mapped = mapper(inputPrefix.value, inputSuffix.value, inputStart.value, inputEnd.value);

        previewText.innerHTML = 'Total: ' + mapped.length + '<br><br>' + mapped.join('<br>');
    }
}

function getEnumeratedValue() {
    var mapper = patternList.filter(function(elem) { return elem.value == currentPattern })[0].mapper; 
    return mapper('', '', inputStart.value, inputEnd.value);
}

function getMappedValue() {
    var mapper = patternList.filter(function(elem) { return elem.value == currentPattern })[0].mapper; 
    return mapper(inputPrefix.value, inputSuffix.value, inputStart.value, inputEnd.value);
}

function setUrlInvalid(validationMessage) {
    inputPrefix.classList.add(inputInvalidClassName);
    inputSuffix.classList.add(inputInvalidClassName);
    urlInvalid.innerHTML = validationMessage[currentLang];
}

function setUrlValid() {
    inputPrefix.classList.remove(inputInvalidClassName);
    inputSuffix.classList.remove(inputInvalidClassName);
    urlInvalid.innerHTML = '-';
}

function setPatternInvalid(validationMessage) {
    inputStart.classList.add(inputInvalidClassName);
    inputEnd.classList.add(inputInvalidClassName);
    patternInvalid.innerHTML = validationMessage[currentLang];
}

function setPatternValid() {
    inputStart.classList.remove(inputInvalidClassName);
    inputEnd.classList.remove(inputInvalidClassName);
    patternInvalid.innerHTML = '-'; 
}

function cleanUpPatternInput() {
    inputStart.value = '';
    inputEnd.value = '';
    inputStartPrestine = true;
    inputEndPrestine = true;
}

function setDownload() {
    if (isDownload) {
        return;
    }
    isDownload = true;
    submit.classList.add(displayNoneClassName);
    reset.classList.remove(displayNoneClassName);
    download.classList.remove(displayNoneClassName);
}

function resetDownload() {
    if (!isDownload) {
        return;
    }
    isDownload = false;
    submit.classList.remove(displayNoneClassName);
    reset.classList.add(displayNoneClassName);
    download.classList.add(displayNoneClassName);
}

// ## Backend Request Functions
function requestBulkDownload() {
    if (!currentPatternValid || ! currentUrlValid) {
        return;
    }

    var request = {
        prefix: inputPrefix.value,
        suffix: inputSuffix.value,
        pattern: getEnumeratedValue()
    }

    var xhr = new XMLHttpRequest();
    xhr.open("POST", backendUrl, true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.setRequestHeader("Access-Control-Allow-Origin", "*");
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            // alert("Failed to download:" + xhr.status + "---" + xhr.statusText);
            var blob = new Blob([xhr.response], {type: "octet/stream"});
            var fileName = "archive.zip";
            var url = window.URL.createObjectURL(blob);
            download.href = url;
            download.download = fileName;

            setDownload();
            return
        }
        
        alert("Something went wrong! Contact Administrator");
    }
    xhr.responseType = "arraybuffer";
    xhr.send(JSON.stringify(request));
}
