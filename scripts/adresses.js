import { connectWebSocket, sendWebSocketMessage } from './websocket.js';

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

connectWebSocket(token, 'SUMY-ADDRESSES', handleServerData, handleConnectionClose).then(() => {
    showAnimation('preloader');
    sendWebSocketMessage(JSON.stringify({ action: "sumy", parameters: { page: "adresses", table: "adresses" } }));
}).catch(error => {
    console.error('Failed to connect:', error);
    hideAnimation();
});

var dataFromDB = [];
var filteredData = [];
var streetsFromDB = [];

function handleServerData(event) {
    const data = JSON.parse(event.data);

    if (data.action === "adressesResponse") {
        dataFromDB = data.data;
        displayDataOnPage(data.data);
        // console.info('Server dataFromDB:', dataFromDB)
    } else if (data.action === "streetsResponse") {
        streetsFromDB = data.data;
        streetsFromDB.sort((a, b) => a.street.localeCompare(b.street));
        // console.info('Server streetsFromDB:', streetsFromDB)
    }
}

function handleConnectionClose() {
    const container = document.getElementById('adresses-container');
    if (!container) {
        console.error('Container element not found');
        return;
    }
    container.innerHTML = ` <br>
                            <div class="alert">
                                <div class="server_alert_title">
                                    П О М И Л К А !!!<br>Сервер закрив зʼєднання!
                                </div>
                                <br>
                                <div class="server_alert_text">
                                    Спробуйте перейти на ГОЛОВНУ сторінку, а потім повернутися на сторінку Адрес.<br>Якщо проблема не знакає, зверніться до адміністратора.
                                </div>
                            </div>`;
    hideAnimation();
}

function displayDataOnPage(data) {
    const container = document.getElementById('adresses-container');
    if (!container) {
        console.error('Container element not found');
        return;
    }

    container.innerHTML = '';

    data.forEach(row => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'page_column';

        const cardDiv = document.createElement('div');
        cardDiv.classList.add('page_card');
        cardDiv.addEventListener('dblclick', () => {
            displayAdrCRDForm(row);
        });        

        let addressLine1 = row.street.new_name;
        let addressLine2 = 'буд. ' + row.adr_building;
        if (row.adr_building2 && row.adr_building2 !== "0") {
            addressLine2 += ', корп. ' + row.adr_building2;
        }
        if (row.adr_fl_of && row.adr_fl_of !== "п/сектор") {
            addressLine2 += ', кв. ' + row.adr_fl_of;
        } else if (row.adr_fl_of === "п/сектор") {
            addressLine2 += ', ' + row.adr_fl_of;
        }

        const new_name = document.createElement('div');
        new_name.className = 'page_card_title';
        new_name.innerHTML = `${addressLine1}<br>${addressLine2}`;
        new_name.style.fontWeight = 'bold';
        new_name.style.fontSize = '120%';
        new_name.style.textAlign = 'center';
        cardDiv.appendChild(new_name);

        if (row.street.old_name && row.street.old_name !== "0") {
            const old_name = document.createElement('div');
            old_name.className = 'page_card_value';
            old_name.setAttribute('data-label', 'Колишня:');
            old_name.textContent = row.street.old_name;
            cardDiv.appendChild(old_name);
        }

        const district = document.createElement('div');
        district.className = 'page_card_value';
        district.setAttribute('data-label', 'Район:');
        district.textContent = row.street.district;
        cardDiv.appendChild(district);

        const phone = document.createElement('div');
        phone.className = 'page_card_value';
        phone.setAttribute('data-label', 'Телефон:');
       
        phone.innerHTML = formatPhoneNumber(row.phone).replace(/\n/g, '<br>');
        cardDiv.appendChild(phone);

        const meters = document.createElement('div');
        meters.className = 'page_card_value';
        meters.setAttribute('data-label', 'Лічильники:');
        meters.textContent = row.meters ? row.meters.length + " шт." : 'Відсутні';
        cardDiv.appendChild(meters);

        const tasks = document.createElement('div');
        tasks.className = 'page_card_value';
        tasks.setAttribute('data-label', 'Заявки:');
        tasks.textContent = row.tasks ? row.tasks.length + " шт." : 'Відсутні';
        cardDiv.appendChild(tasks);

        columnDiv.appendChild(cardDiv);
        container.appendChild(columnDiv);
    });
    hideAnimation();
}

function formatPhoneNumber(phoneNumberString) {
    const phoneNumbers = phoneNumberString.split('|');
    const formattedNumbers = phoneNumbers.map(phoneNumber => {
        if (phoneNumber.length === 10) {
            return `+38 (${phoneNumber.substring(0, 3)}) ${phoneNumber.substring(3, 6)}-${phoneNumber.substring(6, 8)}-${phoneNumber.substring(8, 10)}`;
        } else if (phoneNumber.length === 6) {
            return `+38 (0542) ${phoneNumber.substring(0, 2)}-${phoneNumber.substring(2, 4)}-${phoneNumber.substring(4, 6)}`;
        } else {
            return phoneNumber;
        }
    });
    return formattedNumbers.join('\n');
}

// ========== Пошук ==========
window.openSearchForm = function() {
    SearchFunction();
    document.getElementById("SearchForm").style.display = "block";
    setTimeout(function(){
      document.getElementById("SearchForm").style.opacity = "1";
    }, 100);
}

window.closeSearchForm = function() {
    document.getElementById("SearchValue").value = "";
    setTimeout(function(){
    document.getElementById("SearchForm").style.opacity = "0";
    }, 100);
    setTimeout(function(){
    document.getElementById("SearchForm").style.display = "none";
    }, 400);
}

window.SearchFunction = function() {
    var input = document.getElementById("SearchValue");
    var filter = input.value;
    if (filter.length > 0) {
        updateSearchResults(filter);
    } else {
        clearSearchResults();
    }
}

function clearSearchResults() {
    var searchBlock = document.getElementById("SearchBlock");
    if (searchBlock) {
        searchBlock.innerHTML = '';
    }
    
    var noAdrElement = document.getElementById("no_adr");
    if (noAdrElement) {
        noAdrElement.style.display = "none";
    }
}


function searchAddresses(query) {
    if (query.length < 2) {
        return [];
    }

    const searchTerms = query.split(' ').filter(term => term.length > 0);

    return dataFromDB.filter(row => {
        const addressString = formatFullAddress(row).toUpperCase();

        return searchTerms.every(term => addressString.includes(term.toUpperCase()));
    });
}

function updateSearchResults(query) {
    const results = searchAddresses(query);
    const searchBlock = document.getElementById("SearchBlock");
    const noAdrElement = document.getElementById("no_adr");

    searchBlock.innerHTML = '';

    if (query.length > 1 && results.length === 0) {
        noAdrElement.style.display = "block";
    } else {
        noAdrElement.style.display = "none";
        results.forEach(row => {
            const p = document.createElement("p");
            p.className = 'result_val';

            let addressText = formatFullAddress(row);

            p.innerHTML = highlightMatch(addressText, query);

            p.onclick = function() {
                closeSearchForm();
                displayAdrCRDForm(row);
            };

            searchBlock.appendChild(p);
        });
    }
}


function highlightMatch(text, query) {
    const searchTerms = query.split(' ').filter(term => term.length > 0);
    let highlightedText = text;

    searchTerms.forEach(term => {
        const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escapedTerm, 'gi');
        highlightedText = highlightedText.replace(regex, match => `<span class='highlight'>${match}</span>`);
    });

    return highlightedText;
}

function formatFullAddress(data) {
    let fullAddress = `<div>${data.street.new_name}</div>`;
    if (data.street.old_name && data.street.old_name !== "0") {
        fullAddress += `<div>(${data.street.old_name})</div>`;
    }

    let additionalInfo = `буд. ${data.adr_building}`;
    if (data.adr_building2 && data.adr_building2 !== "0") {
        additionalInfo += `, корп. ${data.adr_building2}`;
    }
    if (data.adr_fl_of) {
        additionalInfo += `, кв. ${data.adr_fl_of}`;
    }
    fullAddress += `<div>${additionalInfo}</div>`;

    return fullAddress;
}

// ========== Фільтрування ==========
window.openFilterForm = function() {
    createFilteredDataArray();
    document.getElementById("FilterForm").style.display = "block";
    setTimeout(function() {
        document.getElementById("FilterForm").style.opacity = "1";
    }, 100);
};

window.closeFilterForm = function() {
    document.getElementById("filterForm").reset();
    filteredData = [];
    setTimeout(function() {
        document.getElementById("FilterForm").style.opacity = "0";
    }, 100);
    setTimeout(function() {
        document.getElementById("FilterForm").style.display = "none";
    }, 400);
};

function createFilteredDataArray() {
    filteredData = dataFromDB.map(item => {
        return {
            id: item.ID,
            newName: item.street.new_name,
            oldName: item.street.old_name,
            buildingNumber: item.adr_building,
            buildingUnit: item.adr_building2,
            flatOfficeNumber: item.adr_fl_of,
            district: item.street.district
        };
    });
}

function updateAutocomplete(inputElement, dataKey) {
    let inputValue = inputElement.value.toLowerCase();
    let autocompletePopup = document.getElementById('autocompletePopup');
    autocompletePopup.innerHTML = '';
    autocompletePopup.style.display = 'block';
    positionPopup(inputElement, autocompletePopup);

    let uniqueValues = new Set();
    filteredData.forEach(item => {
        let itemValue = item[dataKey] ? item[dataKey].toLowerCase() : '';
        let oldNameValue = item.oldName ? item.oldName.toLowerCase() : '';

        if (itemValue.includes(inputValue) || oldNameValue.includes(inputValue)) {
            let displayValue = item[dataKey];
            if (item.oldName && item.oldName !== "0") {
                displayValue += `<br><span style="font-style: italic;">("${item.oldName}")</span>`;
            }
            uniqueValues.add(displayValue);
        }
    });

    if (uniqueValues.size === 0) {
        let noMatchDiv = document.createElement("div");
        noMatchDiv.textContent = "Збігів не знайдено";
        autocompletePopup.appendChild(noMatchDiv);
    } else {
        uniqueValues.forEach(displayValue => {
            let listItem = document.createElement("div");
            listItem.innerHTML = displayValue;
            listItem.addEventListener("click", function() {
                inputElement.value = displayValue.split('<br>')[0];
                filterData(dataKey, displayValue.split('<br>')[0]);
                autocompletePopup.style.display = 'none';
            });
            autocompletePopup.appendChild(listItem);
        });
    }
}


function filterData(key, value) {
    filteredData = filteredData.filter(item => {
        let itemValue = item[key] ? item[key].toString().toLowerCase() : '';
        return itemValue === value.toLowerCase();
    });
}

document.addEventListener("DOMContentLoaded", function() {
    let mappings = {
        'newNameInput': 'newName',
        'buildingNumberInput': 'buildingNumber',
        'buildingUnitInput': 'buildingUnit',
        'flatOfficeNumberInput': 'flatOfficeNumber',
        'districtInput': 'district'
    };

    for (let id in mappings) {
        let inputElement = document.getElementById(id);
        if (inputElement) {
            inputElement.addEventListener("input", () => updateAutocomplete(inputElement, mappings[id]));
            inputElement.addEventListener("focus", () => updateAutocomplete(inputElement, mappings[id]));
        }
    }
});

window.applyFilter = function() {
    let filteredIds = filteredData.map(item => item.id);
    let filteredResults = dataFromDB.filter(item => filteredIds.includes(item.ID));
    displayDataOnPage(filteredResults);
    window.closeFilterForm();
};

document.addEventListener('click', function(event) {
    const autocompletePopup = document.getElementById('autocompletePopup');
    if (!autocompletePopup.contains(event.target) && !event.target.matches('input[type="text"]')) {
        autocompletePopup.style.display = 'none';
    }
});

function positionPopup(inputElement, popupElement) {
    const rect = inputElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    const inputWidth = inputElement.offsetWidth;
    const popupWidth = popupElement.offsetWidth;

    const leftPosition = rect.left + scrollLeft + (inputWidth - popupWidth) / 2;

    popupElement.style.top = `${rect.bottom + scrollTop}px`;
    popupElement.style.left = `${leftPosition}px`;
    popupElement.style.display = 'block';
}

// ========== Форма адреси ==========
function displayAdrCRDForm(data) {
    document.getElementById("adrCRDtitle").textContent = `${data.street.new_name}, ${data.adr_building}` + 
                                                        (data.adr_fl_of ? ` - кв. ${data.adr_fl_of}` : "");
    document.getElementById("adrCRDold_name").textContent = data.street.old_name || "Недоступно";
    document.getElementById("adrCRDdistrict").textContent = data.street.district || "Недоступно";

    if (data.phone) {
        document.getElementById("adrCRDphone").innerHTML = formatPhoneNumber(data.phone).replace(/\n/g, '<br>');
    } else {
        document.getElementById("adrCRDphone").textContent = "Недоступно";
    }

    if (data.meters && data.meters.length > 0) {
        var metersFormatted = data.meters.map(meter => meter.number).join('<br>');
        document.getElementById("adrCRDmeters").innerHTML = metersFormatted;
    } else {
        document.getElementById("adrCRDmeters").textContent = "Відсутні";
    }

    if (data.tasks && data.tasks.length > 0) {
        const months = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];

        var tasksFormatted = data.tasks.map(task => {
            const date = new Date(task.date);
            const formattedDate = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} р.`;
            return `${formattedDate} -> ${task.type}`;
        }).join('<br>');
        document.getElementById("adrCRDtasks").innerHTML = tasksFormatted;
    } else {
        document.getElementById("adrCRDtasks").textContent = "Відсутні";
    }

    var adrCRDForm = document.getElementById("adrCRDform");
    adrCRDForm.classList.add("show");
};

// ========== Додавання нової адреси ==========
window.openAddNewForm = function() {
    var addNewForm = document.getElementById("AddNewForm");
    addNewForm.style.display = "block";
    setTimeout(function() {
        addNewForm.style.opacity = "1";
    }, 100);
    sendWebSocketMessage(JSON.stringify({ action: "sumy", parameters: { page: "adresses", table: "streets" } }));
};

window.closeAddNewForm = function() {
    setTimeout(function() {
        document.getElementById("AddNewForm").style.opacity = "0";
    }, 100);

    setTimeout(function() {
        var addNewForm = document.getElementById("AddNewForm");
        addNewForm.style.display = "none";
        
        var phoneFields = document.getElementById('phoneFields');
        var phoneFieldDivs = phoneFields.getElementsByClassName('phoneField');
        
        while (phoneFieldDivs.length > 1){
            phoneFields.removeChild(phoneFieldDivs[phoneFieldDivs.length - 1]);
        }

        var removeButton = document.getElementById('removePhoneButton');
        removeButton.style.display = 'none';

        var inputs = addNewForm.getElementsByTagName('input');
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].value = '';
        }

        var selects = addNewForm.getElementsByTagName('select');
        for (var j = 0; j < selects.length; j++) {
            selects[j].selectedIndex = 0;
        }

        clearValidationErrors();
    }, 400);
};

window.addPhoneField = function() {
    var phoneFields = document.getElementById('phoneFields');

    var newPhoneField = document.createElement('div');
    newPhoneField.className = 'phoneField';

    var select = document.createElement('select');
    var options = ['050', '066', '099', '067', '097', '093', '073', '0542'];
    for (var i = 0; i < options.length; i++) {
        var option = document.createElement('option');
        option.value = options[i];
        option.textContent = options[i];
        select.appendChild(option);
    }
    newPhoneField.appendChild(select);

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'ххх-хх-хх';
    newPhoneField.appendChild(input);

    select.onchange = function() {
        input.placeholder = this.value === '0542' ? 'хх-хх-хх' : 'ххх-хх-хх';
        window.formatPhoneNumber(input);
    };

    input.oninput = function() { window.formatPhoneNumber(this); };
    
    phoneFields.insertBefore(newPhoneField, phoneFields.children[phoneFields.children.length - 2]);

    var removeButton = document.getElementById('removePhoneButton');
    var phoneFieldDivs = phoneFields.getElementsByClassName('phoneField');
    if (phoneFieldDivs.length > 1) {
        removeButton.style.display = '';
    }
    select.onchange();
};

window.removePhoneField = function() {
    var phoneFields = document.getElementById('phoneFields');
    var phoneFieldDivs = phoneFields.getElementsByClassName('phoneField');

    if (phoneFieldDivs.length > 1) {
        phoneFields.removeChild(phoneFieldDivs[phoneFieldDivs.length - 1]);
    }

    var removeButton = document.getElementById('removePhoneButton');
    if (phoneFieldDivs.length <= 1) {
        removeButton.style.display = 'none';
    }
};

window.toggleCorpusField = function() {
    var corpusRow = document.getElementById('corpusRow');
    var checkbox = document.getElementById('toggleCorpus');
    corpusRow.style.display = checkbox.checked ? '' : 'none';
};

window.formatPhoneNumber = function(input) {
    var prefix = input.previousElementSibling.value;
    var numbers = input.value.replace(/\D/g, '');
    var char = {};

    if (prefix === '0542') {
        char = {2: '-', 4: '-'};
    } else {
        char = {3: '-', 5: '-'};
    }

    var phoneNumber = '';
    for (var i = 0; i < numbers.length; i++) {
        phoneNumber += (char[i] || '') + numbers[i];
    }

    var maxLength = prefix === '0542' ? 8 : 9;
    input.value = phoneNumber.substr(0, maxLength);
};


window.formatUpper = function(input) {
    input.value = input.value.toUpperCase().replace(/[^A-ZА-ЯЄІЇҐ0-9\/]/gi, '');
};

window.formatApartment = function(input) {
    input.value = input.value.replace(/[^a-zA-Zа-яА-ЯєіїґЄІЇҐ0-9\/]/g, '');
};

function updateStreetAutocomplete(inputElement) {
    let inputValue = inputElement.value.toLowerCase();
    let autocompletePopup = document.getElementById('streetAutocompletePopup');
    autocompletePopup.innerHTML = '';
    autocompletePopup.style.display = 'block';
    showStreetAutocompletePopup();

    let filteredStreets = streetsFromDB.filter(street =>
        street.street.toLowerCase().includes(inputValue)
    );

    if (filteredStreets.length === 0) {
        let noMatchDiv = document.createElement("div");
        noMatchDiv.textContent = "Збігів не знайдено";
        autocompletePopup.appendChild(noMatchDiv);
    } else {
        filteredStreets.forEach(street => {
            let listItem = document.createElement("div");
            listItem.className = 'street-autocomplete-item';
            let newStreetName = document.createElement("div");
            newStreetName.textContent = street.street.split(' (')[0];

            listItem.appendChild(newStreetName);

            if (street.street.includes('(')) {
                let oldStreetName = document.createElement("div");
                oldStreetName.textContent = '(' + street.street.split(' (')[1];
                oldStreetName.className = 'old-street-name';
                listItem.appendChild(oldStreetName);
            }

            listItem.addEventListener("click", function() {
                inputElement.value = street.street;
                autocompletePopup.style.display = 'none';
            });

            autocompletePopup.appendChild(listItem);
        });
    }
}

document.addEventListener("DOMContentLoaded", function() {
    let streetInput = document.getElementById('streetInput');
    if (streetInput) {
        streetInput.addEventListener("input", () => updateStreetAutocomplete(streetInput));
        streetInput.addEventListener("focus", () => updateStreetAutocomplete(streetInput));
    }
});

document.addEventListener('click', function(event) {
    const autocompletePopup = document.getElementById('streetAutocompletePopup');
    if (!autocompletePopup.contains(event.target) && event.target !== streetInput) {
        autocompletePopup.style.display = 'none';
    }
});

window.saveNewAddress = function() {
    if (validateFormData()) {
        submitFormData();
    } else {
        console.log("Форма заповнена некоректно.");
    }
};

function validateFormData() {
    let isValid = true;
    clearValidationErrors();

    const streetInput = document.getElementById('streetInput');
    const streetName = streetInput.value.trim();
    const streetId = getStreetIdByName(streetName);
    if (!streetName || streetId === null) {
        showError(streetInput, "Дані відсутні або введені некорректно");
        isValid = false;
    }

    const buildingInput = document.querySelector('input[placeholder="Будинок"]');
    if (!buildingInput.value.trim()) {
        showError(buildingInput, "Дані відсутні або введені некорректно");
        isValid = false;
    }

    const apartmentInput = document.querySelector('input[placeholder="Квартира"]');
    if (!apartmentInput.value.trim()) {
        showError(apartmentInput, "Дані відсутні або введені некорректно");
        isValid = false;
    }

    const phoneFields = document.querySelectorAll('.phoneField input[type="text"]');
    if (phoneFields.length > 0 && !validatePhoneNumber(phoneFields[0].value)) {
        showError(phoneFields[0], "Дані відсутні або введені некорректно");
        isValid = false;
    }

    for (let i = 1; i < phoneFields.length; i++) {
        if (phoneFields[i].value && !validatePhoneNumber(phoneFields[i].value)) {
            showError(phoneFields[i], "Дані відсутні або введен і некорректно");
            isValid = false;
        }
    }
   return isValid;
}

function showError(inputElement, errorMessage) {
    inputElement.classList.add('error-field');
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error-message');
    errorDiv.textContent = errorMessage;
    inputElement.parentNode.appendChild(errorDiv);
}

function clearValidationErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(msg => msg.remove());

    const errorFields = document.querySelectorAll('.error-field');
    errorFields.forEach(field => field.classList.remove('error-field'));
}

function getStreetIdByName(name) {
    const street = streetsFromDB.find(s => s.street === name);
    return street ? street.ID : null;
}

function validatePhoneNumber(number) {
    return /^\d{3}-\d{2}-\d{2}$/.test(number);
}

document.addEventListener('input', function(e) {
    if (e.target.matches('.error-field')) {
        e.target.classList.remove('error-field');
        const errorMsg = e.target.parentNode.querySelector('.error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    }
});

function submitFormData() {
    const streetName = document.getElementById('streetInput').value;
    const street = streetsFromDB.find(s => s.street === streetName);
    const adrStreetId = street ? street.ID : null;

    const adrBuilding = document.querySelector('input[placeholder="Будинок"]').value.trim();
    const adrBuilding2Input = document.querySelector('input[placeholder="Корпус"]');
    const adrBuilding2 = adrBuilding2Input && adrBuilding2Input.value.trim() !== '' ? adrBuilding2Input.value.trim() : '0';
    const adrFlOf = document.querySelector('input[placeholder="Квартира"]').value.trim();

    const phoneFields = document.getElementsByClassName('phoneField');
    let phones = [];
    for (const field of phoneFields) {
        const phoneCode = field.querySelector('select').value;
        const phoneNumber = field.querySelector('input[type="text"]').value.replace(/\D/g, '');
        if (phoneNumber.length === 7) {
            phones.push(phoneCode + phoneNumber);
        }
    }
    const phone = phones.join('|');

    if (!adrStreetId || !adrBuilding || !adrFlOf || phones.length === 0) {
        console.error('Не всі обов\'язкові поля заповнені коректно.');
        return;
    }

    const formData = {
        type: "NewAddress",
        adrStreetId,
        adrBuilding,
        adrBuilding2,
        adrFlOf,
        phone
    };

    fetch('./addnewdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            sendWebSocketMessage(JSON.stringify({ action: "sumy", parameters: { page: "adresses", table: "adresses" } }));
            window.closeAddNewForm();
            showAnimation('preloader');
            logMessage('database', pages('AddNewAddress'), '[INFO]', `Нова адреса [${streetName}, буд. ${adrBuilding}, корп. ${adrBuilding2}, кв. ${adrFlOf}, тел. ${phone}] додана до БД користувачем [${token}]`);
            alert('Адреса успішно додана до БД.');
        } else {
            alert('Помилка при запису до Бази Даних: ' + data.message);
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

function showStreetAutocompletePopup() {
    let inputElement = document.getElementById('streetInput');
    let popupElement = document.getElementById('streetAutocompletePopup');

    const rect = inputElement.getBoundingClientRect();

    popupElement.style.top = `${rect.bottom}px`;
    popupElement.style.left = `${rect.left}px`;
    popupElement.style.display = 'block';
}