import { connectWebSocket, sendWebSocketMessage } from './websocket.js';

// document.addEventListener('DOMContentLoaded', function() {
//     const alertContainer = document.querySelector('.alert');
//     const alertMessage = document.getElementById('alertMessage');
//     if (alertContainer && alertMessage) {
//         const message = `<strong>УВАГА!</strong> Сторінка знаходиться у розробці.`;
//         alertMessage.innerHTML = message;
//         alertContainer.style.display = 'flex';
//         createMarquee(alertMessage, message);
//     }
// });

async function initialize() {
    await fetchSessionData();
    try {
        await connectWebSocket(token, 'CHERNIGIV-METERS', handleServerData, handleConnectionClose);
        showAnimation('preloader');
        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "meters", table: "meters" } }));
    } catch (error) {
        console.error('Failed to connect:', error);
        hideAnimation();
    }
}
initialize();

function handleServerData(event) {
    const data = JSON.parse(event.data);
    switch (data.action) {
        case "metersResponse":
            // console.log("Received data:", event.data);
            displayDataOnPage(data.data);
            const infoContainer = document.querySelector('.info');
            const warningContainer = document.querySelector('.warning');
            const infoMessage = document.getElementById('infoMessage');
            const warningMessage = document.getElementById('warningMessage');

            const isDataValid = data.totalRecords !== null && data.totalRecords !== undefined &&
                                data.filteredRecords !== null && data.filteredRecords !== undefined &&
                                data.displayedRecords !== null && data.displayedRecords !== undefined;
            switch (true) {
                case infoContainer && infoMessage && isDataValid:
                    const infoMsg = `Показано: <strong>${data.displayedRecords}</strong>. Всього записів: <strong>${data.totalRecords}</strong>. Фільтрація відсутня.`;
                    infoContainer.style.display = 'flex';
                    createMarquee(infoMessage, infoMsg);
                    break;
                
                case warningContainer && warningMessage && !isDataValid:
                    const warningMsg = `Помилка у підрахунку кількості даних.`;
                    warningContainer.style.display = 'flex';
                    createMarquee(warningMessage, warningMsg);
                    break;
                default:
                    console.error('Контейнер для повідомлення не знайдено!');
                    break;
            }
            break;
        case "metersSearchResponse":
            // console.log("Received data:", event.data);
            updateSearchResults(data.data);
            break;
        case "metersFilterResponse":
            // console.log("Received data:", event.data);
            if (data.field === 'all') {
                displayDataOnPage(data.values, data.totalRecords, data.displayedRecords);
                const infoContainer = document.querySelector('.info');
                const warningContainer = document.querySelector('.warning');
                const infoMessage = document.getElementById('infoMessage');
                const warningMessage = document.getElementById('warningMessage');
    
                const isDataValid = data.totalRecords !== null && data.totalRecords !== undefined &&
                                    data.filteredRecords !== null && data.filteredRecords !== undefined &&
                                    data.displayedRecords !== null && data.displayedRecords !== undefined;
                switch (true) {
                    case infoContainer && infoMessage && isDataValid:
                        let infoMsg;
                        if (data.filteredRecords === 'ALL') {
                            infoMsg = `Показано: <strong>${data.displayedRecords}</strong>. Всього записів: <strong>${data.totalRecords}</strong>. Фільтрація відсутня.`;
                        } else {
                            infoMsg = `Показано: <strong>${data.displayedRecords}</strong>. Відфільтровано: <strong>${data.filteredRecords}</strong>. Всього записів: <strong>${data.totalRecords}</strong>.`;
                        }
                        infoContainer.style.display = 'flex';
                        createMarquee(infoMessage, infoMsg);
                        break;
                    
                    case warningContainer && warningMessage && !isDataValid:
                        const warningMsg = `Помилка у підрахунку кількості даних.`;
                        warningContainer.style.display = 'flex';
                        createMarquee(warningMessage, warningMsg);
                        break;
                    default:
                        console.error('Контейнер для повідомлення не знайдено!');
                        break;
                }
            } else {
                displayAutocompleteList(data.field, data.values);
            }
            hideAnimation();
            break;
        default:
            handleServerDataGeneral(event);
            break;
    }
}

function handleConnectionClose(code) {
    handleConnectionCloseMessage(code, 'meters-container');
    hideAnimation();
    closeAllAlerts();
    closeAllCards('METERS');
}

// ========== Відображення на сторінці ==========
function displayDataOnPage(data) {
    const container = document.getElementById('meters-container');
    if (!container) {
        console.error('Container element not found');
        return;
    }
    container.innerHTML = '';
    data.forEach(row => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'page_column';
        columnDiv.setAttribute('data-meter-id', row.ID);
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('page_card');
        cardDiv.addEventListener('dblclick', () => {
            sendObjectRequest("METERS", row.ID);
        });
        const headerDiv = document.createElement('div');
        headerDiv.className = 'page_card_title';
        headerDiv.style.fontWeight = 'bold';
        headerDiv.style.fontSize = '120%';
        headerDiv.style.textAlign = 'center';
        headerDiv.innerHTML = getValueOrDefault(row.number);
        cardDiv.appendChild(headerDiv);
        const headers = ['Тип', 'Дата', 'Температура', 'Показники', 'Розташування', 'Балансоутримувач', 'Повірка', 'Статус', 'Адреса', 'Заявки'];
        headers.forEach(header => {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'page_card_value';
            fieldDiv.setAttribute('data-label', header + ':');
            const cellValue = getValueOrDefault(
                header === 'Тип' ? row.type_id :
                header === 'Дата' ? (row.prod_date ? row.prod_date + ' р.' : getValueOrDefault(row.prod_date)) :
                header === 'Температура' ? (row.service_type === 1 ? "Холодний" : row.service_type === 2 ? "Гарячий" : row.service_type) :
                header === 'Показники' ? formatValue(row.value) :
                header === 'Розташування' ? row.location :
                header === 'Балансоутримувач' ? row.balanser :
                header === 'Повірка' ? (row.result === 1 ? "Придатний" : row.result === 2 ? "НЕпридатний" : row.result) :
                header === 'Статус' ? row.status :
                header === 'Адреса' ? (row.address === null ? getValueOrDefault(null) : (function() {
                    const addressParts = row.address.split('буд.');
                    return `${addressParts[0]}<br>${addressParts[1] ? 'буд.' + addressParts[1] : ''}`;
                })()) :
                header === 'Заявки' ? getValueOrDefault(row.tasks) : getValueOrDefault(null)
            );
            fieldDiv.innerHTML = cellValue;
            cardDiv.appendChild(fieldDiv);
        });
        columnDiv.appendChild(cardDiv);
        container.appendChild(columnDiv);
    });
    hideAnimation();
}

// ========== Пошук ==========
window.SearchFunction = function () {
    var input = document.getElementById("SearchValue");
    var filter = input.value;
    if (filter.length > 1) {
        fetchMeterNumbersFromServer(filter);
    } else {
        clearSearchResults();
    }
}

function clearSearchResults() {
    var searchBlock = document.getElementById("SearchBlock");
    if (searchBlock) {
        searchBlock.innerHTML = '';
    }

    var noAdrElement = document.getElementById("no_meters");
    if (noAdrElement) {
        noAdrElement.style.display = "none";
    }
}

function fetchMeterNumbersFromServer(searchData) {
    sendWebSocketMessage(JSON.stringify({
        action: "chernigiv",
        parameters: {
            page: "meters",
            table: "search",
            searchData: searchData
        }
    }));
    showAnimation('preloader');
}

function updateSearchResults(results) {
    if (!Array.isArray(results)) {
        console.error('Invalid search results:', results);
        return;
    }

    const searchBlock = document.getElementById("SearchBlock");
    const noMeterElement = document.getElementById("no_meters");
    const query = document.getElementById("SearchValue").value;

    searchBlock.innerHTML = '';

    if (results.length === 0) {
        noMeterElement.style.display = "block";
    } else {
        noMeterElement.style.display = "none";
        results.forEach(meter => {
            const p = document.createElement("p");
            p.className = 'result_val';
            p.innerHTML = highlightMatch(meter.number, query);
            p.onclick = function () {
                closeSearchForm();
                sendObjectRequest("METERS", meter.ID);
            };
            searchBlock.appendChild(p);
        });
    }
    hideAnimation();
}

// ========== Фільтрування ==========
window.openMeterFilter = function() {
    const dateFieldsIds = ['certificate_dateInput', 'verification_dateInput', 'validity_dateInput'];
    document.querySelectorAll('.autocomplete input[type="text"]').forEach(input => {
        const calendarId = input.id.replace('Input', 'Calendar');
        const calendarContainer = document.getElementById(calendarId);

        if (dateFieldsIds.includes(input.id)) {
            if (calendarContainer) {
                if (!calendarContainer.customCalendar) {
                    calendarContainer.customCalendar = new RangeSelectionCalendar(calendarContainer, input);
                }

                input.addEventListener('focus', () => {
                    sendFilterRequest(input.id);
                    calendarContainer.customCalendar.renderDays();
                });
            } else {
                console.error("Calendar container not found for:", calendarId);
            }
        } else {
            const focusListener = () => {
                sendFilterRequest(input.id);
            };
            input.addEventListener('focus', focusListener);
            if (!input._listeners) {
                input._listeners = {};
            }
            input._listeners.focus = focusListener;
        }
    });
}

window.closeMeterFilter = function() {
    document.querySelectorAll('.autocomplete input[type="text"]').forEach(input => {
        if (input._listeners && input._listeners.focus) {
            input.removeEventListener('focus', input._listeners.focus);
            delete input._listeners.focus;
        }
    });

    const inputs = Object.keys(columnMapping);
    inputs.forEach(inputId => {
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
            inputElement.value = '';
            if (inputElement.dataset.selectedId) {
                inputElement.dataset.selectedId = '';
            }
            if (inputElement.dataset.serverValue) {
                inputElement.dataset.serverValue = '';
            }
        }
    });

    document.querySelectorAll('.calendar-container').forEach(calendarContainer => {
        if (calendarContainer.customCalendar) {
            calendarContainer.customCalendar.clearSelection();
        }
    });

    let criteriaKeys = Object.keys(criteria);
    criteriaKeys.forEach(key => {
        criteria[key] = '';
    });
}

window.applyFilter = function() {
    const container = document.getElementById('meters-container');
    container.innerHTML = '';
    sendFilterRequest('all');
    closeFilterForm('METERS');
}

window.showNoAddressMeters = function() {
    let criteria = {
        address_id: null
    };
    sendWebSocketMessage(JSON.stringify({
        action: "chernigiv",
        parameters: {
            page: "meters",
            table: "filter",
            list: 'all',
            criteria: criteria
        }
    }));
    closeFilterForm('METERS');
    showAnimation('preloader');
}

window.showDublicateMeters = function() {
    let criteria = {
        number: 'dublicates',
        type_id: 'dublicates'
    };
    sendWebSocketMessage(JSON.stringify({
        action: "chernigiv",
        parameters: {
            page: "meters",
            table: "filter",
            list: 'all',
            criteria: criteria
        }
    }));
    closeFilterForm('METERS');
    showAnimation('preloader');
}

let criteria = {
    number: '',
    type_id: '',
    prod_date: '',
    service_type: '',
    certificate_date: '',
    verification_date: '',
    validity_date: '',
    location: '',
    balanser: '',
    result: '',
    status: '',
    address_id: ''
};

const columnMapping = {
    numberInput: 'number',
    typeInput: 'type_id',
    prod_dateInput: 'prod_date',
    service_typeInput: 'service_type',
    certificate_dateInput: 'certificate_date',
    verification_dateInput: 'verification_date',
    validity_dateInput: 'validity_date',
    locationInput: 'location',
    balanserInput: 'balanser',
    resultInput: 'result',
    statusInput: 'status',
    addressInput: 'address_id'
};

function sendFilterRequest(activeField) {
    let criteria = {
        number: document.getElementById('numberInput').value,
        type_id: document.getElementById('typeInput').dataset.selectedId || '',
        prod_date: document.getElementById('prod_dateInput').value,
        service_type: document.getElementById('service_typeInput').value === 'Холодний' ? '1' : document.getElementById('service_typeInput').value === 'Гарячий' ? '2' : '',
        certificate_date: document.getElementById('certificate_dateInput').dataset.serverValue || '',
        verification_date: document.getElementById('verification_dateInput').dataset.serverValue || '',
        validity_date: document.getElementById('validity_dateInput').dataset.serverValue || '',
        location: document.getElementById('locationInput').value,
        balanser: document.getElementById('balanserInput').value,
        result: document.getElementById('resultInput').value === 'Придатний' ? '1' : document.getElementById('resultInput').value === 'НЕпридатний' ? '2' : '',
        status: document.getElementById('statusInput').value,
        address_id: document.getElementById('addressInput').dataset.selectedId || ''
    };
    let list = activeField === 'all' ? 'all' : columnMapping[activeField];
    // console.log("Sending these criteria to server:", criteria);
    sendWebSocketMessage(JSON.stringify({
        action: "chernigiv",
        parameters: {
            page: "meters",
            table: "filter",
            list: list,
            criteria: criteria
        }
    }));
    showAnimation('preloader');
}

function displayAutocompleteList(inputId, values) {
    inputId = getMappedInputId(inputId);
    const dateFields = ['certificate_date', 'verification_date', 'validity_date'];
    const suffix = dateFields.includes(inputId) ? 'Calendar' : 'List';
    const listId = inputId + suffix;
    const list = document.getElementById(listId);
    const input = document.getElementById(inputId + "Input");
    if (!input) {
        console.error("Input field not found:", inputId);
        return;
    }

    if (suffix === 'Calendar') {
        const calendarContainer = document.getElementById(inputId + 'Calendar');
        if (calendarContainer && calendarContainer.customCalendar) {
            const availableDates = values.map(item => new Date(item));
            calendarContainer.customCalendar.setAvailableDates(availableDates);
            calendarContainer.customCalendar.renderDays();
        } else {
            console.error("Calendar container or custom calendar not found for:", inputId + 'Calendar');
        }
    } else {
        list.innerHTML = '';
        values.forEach(value => {
            const option = document.createElement('div');
            let displayValue;
            if (value && typeof value === 'object' && value.hasOwnProperty('id') && value.hasOwnProperty('value')) {
                displayValue = value.value;
                option.dataset.id = value.id;
            } else {
                switch (inputId) {
                    case 'service_type':
                        displayValue = value === 1 ? 'Холодний' : value === 2 ? 'Гарячий' : value;
                        break;
                    case 'result':
                        displayValue = value === 1 ? 'Придатний' : value === 2 ? 'НЕпридатний' : value;
                        break;
                    default:
                        displayValue = value;
            }
            }
            option.innerHTML = highlightMatch(displayValue, input.value);
            option.className = 'autocomplete-item';
            option.addEventListener('click', function () {
                input.value = option.textContent;
                if ('id' in option.dataset) {
                    input.dataset.selectedId = option.dataset.id;
                }
                list.style.display = 'none';
            });
            list.appendChild(option);
        });
    }
    list.style.display = 'block';
}

function getMappedInputId(inputId) {
    const inputIdMapping = {
        'type_id': 'type',
        'address_id': 'address'
    };
    return inputIdMapping[inputId] || inputId;
}

document.querySelectorAll('.autocomplete input[type="text"]').forEach(input => {
    input.addEventListener('input', function () {
        filterClientSide(input.id, input.value);
    });
});

function filterClientSide(inputId, query) {
    let listId = inputId.replace('Input', 'List');
    let list = document.getElementById(listId);
    if (!list) {
        console.error('List element not found:', listId);
        return;
    }
    const queryParts = query.toLowerCase().split(' ').filter(Boolean);
    let foundMatch = false;
    Array.from(list.children).forEach(option => {
        const optionText = option.textContent.toLowerCase();
        const isMatch = queryParts.every(part => optionText.includes(part));
        option.style.display = isMatch ? 'block' : 'none';
        if (isMatch) {
            option.innerHTML = highlightMatch(option.textContent, query);
            foundMatch = true;
        }
    });
    const notFoundDiv = list.querySelector('.not-selectable');
    if (notFoundDiv) {
        list.removeChild(notFoundDiv);
    }
    if (!foundMatch) {
        let notFoundDiv = document.createElement('div');
        notFoundDiv.textContent = "ЕЛЕМЕНТ НЕ ЗНАЙДЕНО";
        notFoundDiv.className = 'autocomplete-item not-selectable';
        list.appendChild(notFoundDiv);
    }
}