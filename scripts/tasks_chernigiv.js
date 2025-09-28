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
        await connectWebSocket(token, 'CHERNIGIV-TASKS', handleServerData, handleConnectionClose);
        showAnimation('preloader');
        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "tasks", table: "tasks" } }));
    } catch (error) {
        console.error('Failed to connect:', error);
        hideAnimation();
    }
}
initialize();

function handleServerData(event) {
    const data = JSON.parse(event.data);

    switch (data.action) {
        case "tasksResponse":
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
        case "tasksSearchAddressesResponse":
            // console.log("Received data:", event.data);
            updateSearchResults(data.data, "SearchBlockAddress", "no_adr_address");
            break;
        case "tasksSearchMetersResponse":
            // console.log("Received data:", event.data);
            updateSearchResults(data.data, "SearchBlockMeter", "no_adr_meter");
            break;
        case "tasksFilterResponse":
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
    handleConnectionCloseMessage(code, 'tasks-container');
    hideAnimation();
    closeAllAlerts();
    closeAllCards('TASKS');
}

const tasksFieldLabels = {
    tasks_type: 'Вид робіт',
    address: 'Адреса',
    phone: 'Номер телефону',
    meters: 'Лічильники',
    brigade: 'Виконавець',
    cost: 'Вартість',
    pay_method: 'Спосіб оплати',
    status: 'Статус',
    note: 'Примітки'
};

// ========== Відображення на сторінці ==========
function displayDataOnPage(data) {
    const container = document.getElementById('tasks-container');
    if (!container) {
        console.error('Container element not found');
        return;
    }
    container.innerHTML = '';
    data.forEach(task => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'page_column';
        columnDiv.setAttribute('data-task-id', task.ID);
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('page_card');
        cardDiv.addEventListener('dblclick', () => {
            sendObjectRequest("TASKS", task.ID);
        });
        const headerDiv = document.createElement('div');
        headerDiv.className = 'page_card_title';
        headerDiv.style.fontWeight = 'bold';
        headerDiv.style.fontSize = '120%';
        headerDiv.style.textAlign = 'center';
        const addressParts = task.address.split('буд.');
        const addressContent = `${getValueOrDefault(addressParts[0])}<br>${getValueOrDefault(addressParts[1] ? 'буд.' + addressParts[1] : '')}`;
        headerDiv.innerHTML = addressContent;
        cardDiv.appendChild(headerDiv);
        const dateDiv = document.createElement('div');
        dateDiv.className = 'page_card_value';
        dateDiv.setAttribute('data-label', 'Дата:');
        dateDiv.innerHTML = getValueOrDefault(task.date ? formatDate(task.date) : null);
        cardDiv.appendChild(dateDiv);
        const work_dateDiv = document.createElement('div');
        work_dateDiv.className = 'page_card_value';
        work_dateDiv.setAttribute('data-label', 'Виконання:');
        work_dateDiv.innerHTML = getValueOrDefault(task.work_date ? formatDate(task.work_date) : null);
        cardDiv.appendChild(work_dateDiv);
        Object.keys(tasksFieldLabels).forEach(field => {
            if (field !== 'address' && field !== 'date') {
                const fieldDiv = document.createElement('div');
                fieldDiv.className = 'page_card_value';
                fieldDiv.setAttribute('data-label', tasksFieldLabels[field] + ':');
                switch (field) {
                    case 'phone':
                        fieldDiv.innerHTML = getValueOrDefault(task.phone ? PhoneNumberformat(task.phone) : null).replace(/\n/g, '<br>');
                        break;
                    case 'brigade':
                        if (task[field]) {
                            const brigadeMembers = task[field].split('|');
                            brigadeMembers.forEach(member => {
                                const memberDiv = document.createElement('div');
                                memberDiv.textContent = member;
                                fieldDiv.appendChild(memberDiv);
                            });
                        } else {
                            fieldDiv.innerHTML = getValueOrDefault(task[field]);
                        }
                        break;
                    case 'meters':
                        if (task.meters && task.meters.length > 0) {
                            task.meters.forEach(meter => {
                                const meterDiv = document.createElement('div');
                                if (meter === "nonumber") {
                                    meterDiv.innerHTML = '<span style="font-size: 80%; color: dimgray">БЕЗ НОМЕРА</span>';
                                } else {
                                    meterDiv.textContent = meter;
                                }
                                fieldDiv.appendChild(meterDiv);
                            });
                        } else {
                            fieldDiv.innerHTML = getValueOrDefault(null);
                        }
                        break;
                    case 'cost':
                        fieldDiv.innerHTML = getValueOrDefault(task.cost ? formatCost(task.cost) : null);
                        break;
                    default:
                        fieldDiv.innerHTML = getValueOrDefault(task[field]);
                }
                cardDiv.appendChild(fieldDiv);
            }
        });
        columnDiv.appendChild(cardDiv);
        container.appendChild(columnDiv);
    });

    hideAnimation();
}

// ========== Пошук ==========
window.SearchFunctionAddress = function () {
    var input = document.getElementById("SearchValueAddress").value;
    var criteria = input.split(' ').filter(term => term.length > 0);
    criteria = criteria.filter(term => {
        return /^[а-яА-ЯёЁїЇєЄіІґҐa-zA-Z]+$/.test(term) || /^[0-9]+$/.test(term);
    });

    const totalChars = criteria.join('').length;

    if (totalChars >= 3) {
        fetchAddressesFromServer(criteria);
    } else {
        clearSearchResults("SearchBlockAddress", "no_adr_address");
    }
}

window.SearchFunctionMeter = function () {
    var input = document.getElementById("SearchValueMeter").value;
    if (input.length > 1) {
        fetchMeterNumbersFromServer(input);
    } else {
        clearSearchResults("SearchBlockMeter", "no_adr_meter");
    }
}

function fetchAddressesFromServer(criteria) {
    const searchData = criteria.join(' ');
    sendWebSocketMessage(JSON.stringify({
        action: "chernigiv",
        parameters: {
            page: "tasks",
            table: "searchAddresses",
            searchData: searchData
        }
    }));
    showAnimation('preloader');
}

function fetchMeterNumbersFromServer(searchData) {
    sendWebSocketMessage(JSON.stringify({
        action: "chernigiv",
        parameters: {
            page: "tasks",
            table: "searchMeters",
            searchData: searchData
        }
    }));
    showAnimation('preloader');
}

function clearSearchResults(searchBlockId, noAdrElementId) {
    var searchBlock = document.getElementById(searchBlockId);
    if (searchBlock) {
        searchBlock.innerHTML = '';
    }

    var noAdrElement = document.getElementById(noAdrElementId);
    if (noAdrElement) {
        noAdrElement.style.display = "none";
    }
}

function updateSearchResults(results, searchBlockId, noAdrElementId) {
    const searchBlock = document.getElementById(searchBlockId);
    const noAdrElement = document.getElementById(noAdrElementId);
    const query = document.getElementById(searchBlockId.replace("SearchBlock", "SearchValue")).value;
    searchBlock.innerHTML = '';
    if (results.length === 0) {
        noAdrElement.style.display = "block";
    } else {
        noAdrElement.style.display = "none";
        results.forEach(row => {
            const p = document.createElement("p");
            p.className = 'result_val';
            let displayText;

            switch (searchBlockId) {
                case 'SearchBlockAddress':
                    const addressParts = row.address.split('буд.');
                    const firstPart = addressParts[0].trim();
                    const secondPart = 'буд.' + addressParts[1].trim();
                    displayText = `
                        <div>${formatDate(row.date)}</div>
                        <div>${row.tasks_type}</div>
                        <div>${highlightMatch(firstPart, query)}</div>
                        <div>${highlightMatch(secondPart, query)}</div>
                    `;
                    break;
                case 'SearchBlockMeter':
                    const meterNumbers = row.meterNumbers.map(number => `<div>${highlightMatch(number, query)}</div>`).join('');
                    displayText = `
                        <div>${formatDate(row.date)}</div>
                        <div>${row.tasks_type}</div>
                        ${meterNumbers}
                    `;
                    break;
            }
            p.innerHTML = displayText;
            p.onclick = function () {
                closeSearchForm();
                sendObjectRequest("TASKS", row.ID);
            };

            searchBlock.appendChild(p);
        });
    }
    hideAnimation();
}

// ========== Фільтрування ==========
window.openTaskFilter = function() {
    document.querySelectorAll('.autocomplete input[type="text"]').forEach(input => {
        const calendarId = input.id.replace('Input', 'Calendar');
        const calendarContainer = document.getElementById(calendarId);

        if (input.id === 'dateInput' || input.id === 'work_dateInput') {
            if (calendarContainer) {
                if (!calendarContainer.customCalendar) {
                    calendarContainer.customCalendar = new RangeSelectionCalendar(calendarContainer, input);
                }

                input.addEventListener('focus', () => {
                    sendFilterRequest(input.id);
                    calendarContainer.customCalendar.buildCalendar();
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

window.closeTaskFilter = function() {
    document.querySelectorAll('.autocomplete input[type="text"], .autocomplete textarea').forEach(input => {
        // Удаляем слушатели на focus и input
        input.removeEventListener('focus', input._focusListener);
        input.removeEventListener('input', input._inputListener);

        // Удаляем сохраненные слушатели
        delete input._focusListener;
        delete input._inputListener;

        // Очищаем значение полей
        input.value = '';
        if (input.dataset.selectedId) {
            input.dataset.selectedId = '';
        }
        if (input.dataset.serverValue) {
            input.dataset.serverValue = '';
        }
    });

    document.querySelectorAll('.calendar-container').forEach(calendarContainer => {
        if (calendarContainer.customCalendar) {
            calendarContainer.customCalendar.clearSelection();
        }
    });
}

window.applyFilter = function() {
    const container = document.getElementById('tasks-container');
    container.innerHTML = '';
    sendFilterRequest('all');
    closeFilterForm('TASKS');
}

const columnMapping = {
    dateInput: 'date',
    work_dateInput: 'work_date',
    tasks_typeInput: 'tasks_type',
    brigadeInput: 'brigade',
    pay_methodInput: 'pay_method',
    statusInput: 'status',
    addressInput: 'address_id'
};

function sendFilterRequest(activeField) {
    let criteria = {};
    let list;

    criteria = {
        date: document.getElementById('dateInput').dataset.serverValue || '',
        work_date: document.getElementById('work_dateInput').dataset.serverValue || '',
        tasks_type: document.getElementById('tasks_typeInput').value,
        brigade: document.getElementById('brigadeInput').value,
        pay_method: document.getElementById('pay_methodInput').value,
        status: document.getElementById('statusInput').value,
        address_id: document.getElementById('addressInput').dataset.selectedId || ''
    };

    if (activeField === 'all') {
        list = 'all';
    } else {
        list = columnMapping[activeField];
    }

    sendWebSocketMessage(JSON.stringify({
        action: "chernigiv",
        parameters: {
            page: "tasks",
            table: "filter",
            list: list,
            criteria: criteria
        }
    }));
    showAnimation('preloader');
}

function displayAutocompleteList(inputId, values) {
    let list, input, suffix = '';
    inputId = getMappedInputId(inputId);
    suffix = (inputId === 'date' || inputId === 'work_date') ? 'Calendar' : 'List';
    list = document.getElementById(inputId + suffix);
    input = document.getElementById(inputId + "Input");

    if (suffix === 'Calendar') {
        const calendarContainer = document.getElementById(inputId + 'Calendar');
        if (calendarContainer && calendarContainer.customCalendar) {
            const availableDates = values.map(item => new Date(item));
            calendarContainer.customCalendar.setAvailableDates(availableDates);
            calendarContainer.customCalendar.buildCalendar();
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
                displayValue = value;
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