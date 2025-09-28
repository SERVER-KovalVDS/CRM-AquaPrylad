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
        await connectWebSocket(token, 'CHERNIGIV-ADDRESSES', handleServerData, handleConnectionClose);
        showAnimation('preloader');
        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "addresses", table: "addresses" } }));
    } catch (error) {
        console.error('Failed to connect:', error);
        hideAnimation();
    }
}
initialize();

function handleServerData(event) {
    const data = JSON.parse(event.data);
    switch (data.action) {
        case "addressesResponse":
            // console.log("Received data:", event.data);
            displayDataOnPage(data.data, data.totalRecords, data.displayedRecords);
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
        case "addressesSearchResponse":
            // console.log("Received data:", event.data);
            updateSearchResults(data.data);
            break;
        case "addressesFilterResponse":
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
    handleConnectionCloseMessage(code, 'addresses-container');
    hideAnimation();
    closeAllAlerts();
    closeAllCards('ADDRESSES');
}

// ========== Відображення на сторінці ==========
function displayDataOnPage(data) {
    const container = document.getElementById('addresses-container');
    if (!container) {
        console.error('Container element not found');
        return;
    }
    container.innerHTML = '';
    data.forEach(row => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'page_column';
        columnDiv.dataset.addressId = row.ID;
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('page_card');
        cardDiv.addEventListener('dblclick', () => {
            sendObjectRequest('ADDRESSES', row.ID);
        });

        let addressLine = `${row.street},<br>буд. ${getValueOrDefault(row.adr_building)}`;
        if (row.adr_building2 && row.adr_building2 !== '0') {
            addressLine += `, корп. ${getValueOrDefault(row.adr_building2)}`;
        }
        if (row.adr_fl_of === 'п/сектор') {
            addressLine += `, ${getValueOrDefault(row.adr_fl_of)}`;
        } else {
            addressLine += `, кв. ${getValueOrDefault(row.adr_fl_of)}`;
        }
        const address = document.createElement('div');
        address.className = 'page_card_title';
        address.innerHTML = addressLine;
        address.style.fontWeight = 'bold';
        address.style.fontSize = '120%';
        address.style.textAlign = 'center';
        cardDiv.appendChild(address);

        const phone = document.createElement('div');
        phone.className = 'page_card_value';
        phone.setAttribute('data-label', 'Телефон:');
        phone.innerHTML = getValueOrDefault(PhoneNumberformat(row.phone)).replace(/\n/g, '<br>');
        cardDiv.appendChild(phone);

        const subscriberName = document.createElement('div');
        subscriberName.className = 'page_card_value';
        subscriberName.setAttribute('data-label', 'ПІБ абонента:');
        subscriberName.innerHTML = getValueOrDefault(row.fml);
        cardDiv.appendChild(subscriberName);

        const metersDiv = document.createElement('div');
        metersDiv.className = 'page_card_value';
        metersDiv.setAttribute('data-label', 'Лічильники:');
        metersDiv.innerHTML = getValueOrDefault(row.meters);
        cardDiv.appendChild(metersDiv);

        const tasksDiv = document.createElement('div');
        tasksDiv.className = 'page_card_value';
        tasksDiv.setAttribute('data-label', 'Заявки:');
        tasksDiv.innerHTML = getValueOrDefault(row.tasks);
        cardDiv.appendChild(tasksDiv);

        columnDiv.appendChild(cardDiv);
        container.appendChild(columnDiv);
    });
    hideAnimation();
}

// ========== Пошук ==========
window.SearchFunction = function () {
    var input = document.getElementById("SearchValue").value;
    var criteria = input.split(' ').filter(term => term.length > 0);
    criteria = criteria.filter(term => {
        return /^[а-яА-ЯёЁїЇєЄіІґҐa-zA-Z]+$/.test(term) || /^[0-9]+$/.test(term);
    });

    const totalChars = criteria.join('').length;
    
    if (totalChars >= 3) {
        fetchAddressesFromServer(criteria);
    } else {
        clearSearchResults();
    }
}

function fetchAddressesFromServer(criteria) {
    const searchData = criteria.join(' ');
    sendWebSocketMessage(JSON.stringify({
        action: "chernigiv",
        parameters: {
            page: "addresses",
            table: "search",
            searchData: searchData
        }
    }));
    showAnimation('preloader');
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

function updateSearchResults(results) {
    const searchBlock = document.getElementById("SearchBlock");
    const noAdrElement = document.getElementById("no_adr");
    const query = document.getElementById("SearchValue").value;

    searchBlock.innerHTML = '';

    if (results.length === 0) {
        noAdrElement.style.display = "block";
    } else {
        noAdrElement.style.display = "none";
        results.forEach(row => {
            const p = document.createElement("p");
            p.className = 'result_val';
            let addressText = formatFullAddress(row);

            p.innerHTML = highlightMatch(addressText, query);

            p.onclick = function () {
                closeSearchForm();
                sendObjectRequest('ADDRESSES', row.ID);
            };

            searchBlock.appendChild(p);
        });
    }
    hideAnimation();
}

function formatFullAddress(data) {
    let fullAddress = `${data.street}, буд. ${data.adr_building}`;
    if (data.adr_building2 && data.adr_building2 !== '0') {
        fullAddress += `, корп. ${data.adr_building2}`;
    }
    if (data.adr_fl_of && data.adr_fl_of !== '0') {
        fullAddress += `, кв. ${data.adr_fl_of}`;
    }
    return fullAddress;
}

// ========== Фільтрування ==========
window.openAddressFilter = function() {
    document.querySelectorAll('.autocomplete input[type="text"]').forEach(input => {
        const focusListener = () => {
            sendFilterRequest(input.id);
        };
        input.addEventListener('focus', focusListener);
        if (!input._listeners) {
            input._listeners = {};
        }
        input._listeners.focus = focusListener;
    });
}

window.closeAddressFilter = function() {
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

    let criteriaKeys = Object.keys(criteria);
    criteriaKeys.forEach(key => {
        criteria[key] = '';
    });
}

window.applyFilter = function() {
    const container = document.getElementById('addresses-container');
    container.innerHTML = '';
    sendFilterRequest('all');
    closeFilterForm('ADDRESSES');
}

let criteria = {
    street: '',
    adr_building: '',
    adr_building2: '',
    adr_fl_of: ''
};

const columnMapping = {
    streetInput: 'street',
    adr_buildingInput: 'adr_building',
    adr_building2Input: 'adr_building2',
    adr_fl_ofInput: 'adr_fl_of'
};

function sendFilterRequest(activeField) {
    let criteria = {
        street: document.getElementById('streetInput').dataset.selectedId || '',
        adr_building: document.getElementById('adr_buildingInput').value,
        adr_building2: document.getElementById('adr_building2Input').value,
        adr_fl_of: document.getElementById('adr_fl_ofInput').value
    };
    let list = activeField === 'all' ? 'all' : columnMapping[activeField];
    // console.log("Sending these criteria to server:", criteria);
    sendWebSocketMessage(JSON.stringify({
        action: "chernigiv",
        parameters: {
            page: "addresses",
            table: "filter",
            list: list,
            criteria: criteria
        }
    }));
    showAnimation('preloader');
}

function displayAutocompleteList(inputId, values) {
    inputId = getMappedInputId(inputId);
    const listId = inputId + 'List';
    const list = document.getElementById(listId);
    const input = document.getElementById(inputId + "Input");
    if (!input) {
        console.error("Input field not found:", inputId);
        return;
    }
    list.innerHTML = '';
    values.forEach(item => {
        const option = document.createElement('div');
        const displayValue = item.value || item;
        option.innerHTML = highlightMatch(displayValue, input.value);
        option.className = 'autocomplete-item';
        
        if (item.id) {
            option.dataset.id = item.id;
            option.addEventListener('click', function () {
                input.value = option.textContent;
                input.dataset.selectedId = option.dataset.id;
                list.style.display = 'none';
            });
        } else {
            option.addEventListener('click', function () {
                input.value = option.textContent;
                list.style.display = 'none';
            });
        }
        
        list.appendChild(option);
    });
    list.style.display = 'block';
}

function getMappedInputId(inputId) {
    const inputIdMapping = {
        'street': 'street',
        'adr_building': 'adr_building',
        'adr_building2': 'adr_building2',
        'adr_fl_of': 'adr_fl_of'
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