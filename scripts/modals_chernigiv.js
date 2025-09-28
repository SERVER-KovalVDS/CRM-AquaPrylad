import { sendWebSocketMessage } from './websocket.js';

let openPopupsCount = 0;
const baseIndex = 100;
let animation_time = 0;
let phoneSufixArea = [];
let service_types = [];
let locations = [];
let balansers = [];
let tasks_types = [];
let nonumber_meters_types = [];
let workers = [];
let pay_methods = [];
let streetsFromDB = [];
let autocompleteData = {}
let autocompleteTasksData = {}

// ========== Завантаження глобальних змінних із JSON файлу ==========
window.addEventListener('DOMContentLoaded', (event) => {
    loadJSONData();
});
async function loadJSONData() {
    try {
        const response = await fetch('vocabulary.json');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        animation_time = data.system.animation_time;
        phoneSufixArea = data.chernigiv.phoneSufixArea;
        service_types = data.chernigiv.service_types;
        locations = data.chernigiv.locations;
        balansers = data.chernigiv.balansers;
        tasks_types = data.chernigiv.tasks_types;
        nonumber_meters_types = data.chernigiv.nonumber_meters_types;
        workers = data.chernigiv.workers;
        pay_methods = data.chernigiv.pay_methods;

        autocompleteData = {
            meter_type_name: [],
            prod_date: [],
            service_type: service_types,
            meter_location: locations,
            balanser: balansers,
            meter_address: []
        };

        autocompleteTasksData = {
            tasks_address: [],
            tasks_type: tasks_types,
            brigade: workers,
            pay_method: pay_methods
        };
    } catch (error) {
      console.error('Error loading JSON data:', error);
    }
}

// ========== Розподілення між модальними вікнами ==========
window.openAddNewForm = function(page) {
    switch (page) {
        case "ADDRESSES":
            openAddNewADRForm();
            break;
        case "METERS":
            openAddNewMeterForm();
            break;
        case "ROUTE":
            openAddNewTaskForm();
            break;
    }
};

window.closeAddNewForm = function(page) {
    switch (page) {
        case "ADDRESSES":
            closeAddNewADRForm();
            break;
        case "METERS":
            closeAddNewMeterForm();
            break;
        case "TASKS":
            closeAddNewTaskForm();
            break;
    }
}

// ========== Обробка відповідей сервера ==========
window.handleServerDataGeneral = function(event) {
    const data2 = JSON.parse(event.data);
    switch (data2.action) {
        case "addressesObjectResponse":
            // console.log("Received data:", event.data);
            hideAnimation();
            displayAdrCRDForm(data2.data)
            break;
        case "addressesStreetsResponse":
            streetsFromDB = data2.data;
            streetsFromDB.sort((a, b) => a.street.localeCompare(b.street));
            break;
        case "addressesMetersArrResponse":
            // console.log("Received data:", event.data);
            addressAddMeterToADR('server_response_meters', null, data2.data)
            break;
        case "metersObjectResponse":
            // console.log("Received data:", event.data);
            hideAnimation();
            displayMeterForm(data2.data);
            break;
        case "metersMeterTypesResponse":
            autocompleteData.meter_type_name = data2.data.map(type => {
                return { id: type.id, text: type.type }
            }).sort((a, b) => a.text.localeCompare(b.text));
            break;
        case "metersAddressesResponse":
            // console.log('metersAddressesResponse recieved')
            autocompleteData.meter_address = data2.data.map(meter_address => ({
                id: meter_address.id, 
                text: meter_address.address 
            })).sort((a, b) => a.text.localeCompare(b.text));
            displayNewMeterPopup(document.getElementById('meter_address'), document.getElementById('meter_address').value, false);
            break;
        case "metersAddressesEditResponse":
            // console.log('metersAddressesEditResponse recieved: ', data2.data);
            metersAddAddressToMeter('server_response_addresses', null, data2.data)
            break;
        case "tasksObjectResponse":
            // console.log("Received data:", data2.data);
            hideAnimation();
            displayTasksForm(data2.data);
            break;
        case "tasksArchiveObjectResponse":
            // console.log("Received data:", data2.data);
            hideAnimation();
            displayTasksForm(data2.data, 'archive');
            break;
        case "tasksAddressesResponse":
            // console.log('tasksAddressesResponse recieved', data2.data);
            autocompleteTasksData.tasks_address = data2.data.map(tasks_address => ({
                id: tasks_address.id,
                text: tasks_address.address,
                meters: tasks_address.meters,
                phone: tasks_address.phone
            })).sort((a, b) => a.text.localeCompare(b.text));
            displayNewTaskPopup(document.getElementById('tasks_address'), document.getElementById('tasks_address').value, false);
            break;
        case "tasksMetersArrResponse":
            // console.log("Received data:", event.data);
            identifyMeterWithNoNumberServerResponse(data2.data);
            break;
        default:
            console.warn('Невідомий тип відповіді серверу: ', data2.action);
            break;
    }
}

// ========== Загальні функції ==========
// ========== Блоки помилок на формах ==========
function showError(inputElement, errorMessage) {
    inputElement.classList.add('error-field');
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error-message');
    errorDiv.textContent = errorMessage;
    inputElement.parentNode.appendChild(errorDiv);
}

function hideError(input) {
    let errorElement = input.nextElementSibling;
    while (errorElement && !errorElement.classList.contains('error-message')) {
        errorElement = errorElement.nextElementSibling;
    }
    if (errorElement && errorElement.classList.contains('error-message')) {
        errorElement.remove();
        input.classList.remove('error-field');
    }
}

function clearValidationErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(msg => msg.remove());

    const errorFields = document.querySelectorAll('.error-field');
    errorFields.forEach(field => field.classList.remove('error-field'));
}

function clearMeterValidationErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(msg => msg.remove());

    const errorFields = document.querySelectorAll('.error-field');
    errorFields.forEach(field => field.classList.remove('error-field'));
}

// ========== Форми фільтру та пошуку ==========
// ========== Відкриття та закриття ==========
let SearchFormEscClose;
function openSearchForm() {
    const searchForm = document.getElementById("SearchForm");
    searchForm.style.display = "block";

    const tabs = searchForm.querySelectorAll(".tabcontent");
    if (tabs.length > 0) {
        adjustTabs();
        const activeTab = document.querySelector(".tabcontent:target") || document.getElementById("AddressTab");
        if (activeTab.id === "AddressTab") {
            SearchFunctionAddress();
        } else if (activeTab.id === "MeterTab") {
            SearchFunctionMeter();
        }
    } else {
        SearchFunction();
    }
    setTimeout(function() {
        searchForm.classList.add("show");
    }, 10);

    SearchFormEscClose = createOnKeydownWrapper('closeSearchForm');
    document.addEventListener('keydown', SearchFormEscClose);
}
window.openSearchForm = openSearchForm;

function closeSearchForm() {
    const searchValues = document.querySelectorAll('[id*="SearchValue"]');
    const searchResults = document.querySelectorAll('.result_div');
    searchValues.forEach(element => {
        element.value = "";
    });
    searchResults.forEach(element => {
        element.innerHTML = "";
    });

    const searchForm = document.getElementById("SearchForm");
    searchForm.classList.remove("show");
    setTimeout(function() {
        searchForm.style.display = "none";
    }, 300);

    if (SearchFormEscClose) {
        document.removeEventListener('keydown', SearchFormEscClose);
        SearchFormEscClose = null;
    }
}
window.closeSearchForm = closeSearchForm;

let FilterFormEscClose;
window.openFilterForm = function(pageType) {
    const filterForm = document.getElementById("FilterForm");
    filterForm.style.display = "block";
    setTimeout(function() {
        filterForm.classList.add("show");
    }, 10);
    switch (pageType) {
        case 'ADDRESSES':
            openAddressFilter();
            break;
        case 'METERS':
            openMeterFilter();
            break;
        case 'TASKS':
            openTaskFilter();
            break;
        case 'ROUTE':
            let container_count = 1;
            let cookie_value = null;
            const filter_cookie_result = checkFilterCookie(true);
            if (filter_cookie_result.filter_cookie) {
                const cookieValue = JSON.parse(filter_cookie_result.value);
                container_count = Array.isArray(cookieValue) ? cookieValue.length : 1;
                cookie_value = cookieValue;
            }
            openRouteFilter(container_count, cookie_value);
            break;
    }
    manageAutocompleteListeners('add', 'FilterForm');
    FilterFormEscClose = createOnKeydownWrapper('closeFilterForm', pageType);
    document.addEventListener('keydown', FilterFormEscClose);
};

window.closeFilterForm = function(pageType) {
    const filterForm = document.getElementById("FilterForm");
    filterForm.classList.remove("show");
    setTimeout(function() {
        filterForm.style.display = "none";
        document.removeEventListener('click', document.currentDropdownCloser);

        switch (pageType) {
            case 'ADDRESSES':
                closeAddressFilter();
                break;
            case 'METERS':
                closeMeterFilter();
                break;
            case 'TASKS':
                closeTaskFilter();
                break;
            case 'ROUTE':
                closeRouteFilter();
                break;
            case 'ALL':
                if (typeof window.closeAddressFilter === 'function') {
                    closeAddressFilter();
                }
                if (typeof window.closeMeterFilter === 'function') {
                    closeMeterFilter();
                }
                if (typeof window.closeTaskFilter === 'function') {
                    closeTaskFilter();
                }
                if (typeof window.closeRouteFilter === 'function') {
                    closeRouteFilter();
                }
                break;
        }

        manageAutocompleteListeners('remove', 'FilterForm');

        if (FilterFormEscClose) {
            document.removeEventListener('keydown', FilterFormEscClose);
            FilterFormEscClose = null;
        }
    }, 300);
};

// ========== Картки об'єктів ==========
// ========== Формування карточок ==========
function addTableRow(tableBody, label, value, objectId = null, fieldId = null, editMarkup = null) {
    const row = tableBody.insertRow();
    const labelCell = row.insertCell(0);
    labelCell.textContent = label;
    const valueCell = row.insertCell(1);
    if (editMarkup !== null && fieldId !== null) {
        const valueContainer = document.createElement('div');
        valueContainer.className = 'value-container';
        valueContainer.id = `${fieldId}-display`;
        const editIcon = document.createElement('div');
        editIcon.className = 'edit-icon';
        editIcon.innerHTML = `<svg><use href="#edit_icon"></use></svg>`;
        editIcon.onclick = function() {
            valueContainer.style.display = 'none';
            editFormContainer.style.display = 'flex';
        };
        const valueText = document.createElement('div');
        valueText.className = 'value-text';
        valueText.innerHTML = getValueOrDefault(value);
        valueContainer.appendChild(editIcon);
        valueContainer.appendChild(valueText);
        valueCell.appendChild(valueContainer);
        const editFormContainer = document.createElement('div');
        editFormContainer.className = 'edit-form';
        editFormContainer.id = `${fieldId}-edit`;
        const formFieldsContainer = document.createElement('div');
        formFieldsContainer.className = 'edit-fields';
        formFieldsContainer.innerHTML = editMarkup;
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'edit-buttons';
        buttonsContainer.innerHTML = `
            <div class="save" onclick="saveEdit('${objectId}', '${fieldId}')">
                <svg><use href="#save_icon"></use></svg>
            </div>
            <div class="cancel" onclick="cancelEdit('${fieldId}')">
                <svg><use href="#not-save_icon"></use></svg>
            </div>
        `;
        editFormContainer.appendChild(buttonsContainer);
        editFormContainer.appendChild(formFieldsContainer);
        valueCell.appendChild(editFormContainer);
    } else {
        valueCell.innerHTML = getValueOrDefault(value);
    }
}

function createHistoryEntries(historyData) {
    let historyEntries = [];
    if (historyData) {
        try {
            historyEntries = JSON.parse(historyData);
        } catch (e) {
            console.error('Error parsing history JSON:', e);
        }
    }
    const historyContainer = document.createElement('div');
    historyContainer.className = 'object_history_container';
    if (Array.isArray(historyEntries) && historyEntries.length > 0) {
        historyEntries.forEach((entry, index) => {
            if (entry.user === 'kovaladmin') {
                entry.user = 'АДМІНІСТРАТОР';
            }
            const historyTitle = document.createElement('div');
            historyTitle.className = 'object_history_title';
            historyTitle.innerHTML = `${entry.datetime}<br>${entry.process}<br>користувач ${entry.user}`;

            const historyValue = document.createElement('div');
            historyValue.className = 'object_history_value';
            historyValue.innerHTML = entry.value;

            historyContainer.appendChild(historyTitle);
            historyContainer.appendChild(historyValue);

            if (index < historyEntries.length - 1) {
                const hr = document.createElement('hr');
                historyContainer.appendChild(hr);
            }
        });
    } else {
        const noHistoryRow = document.createElement('div');
        noHistoryRow.innerHTML = 'Історія відсутня';
        historyContainer.appendChild(noHistoryRow);
    }
    return historyContainer;
}

function sendObjectRequest(page_name, object_id) {
    let page = null;
    switch (page_name) {
        case "ADDRESSES":
            page = 'addresses';
            break;
        case "METERS":
            page = 'meters';
            break;
        case "TASKS":
            page = 'tasks';
            break;
        case "ROUTE":
            page = 'route';
            break;
    }
    if (page != null) {
        showAnimation('preloader');
        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: page, table: "object", DataId: object_id } }));
    } else {
        console.error('Invalid page name:', page_name);
    }
}
window.sendObjectRequest = sendObjectRequest;

// ========== Форма карток ==========
let AdrCRDEscClose;
function displayAdrCRDForm(data) {
    const adrCRDForm = document.getElementById('adrCRDform');
    const adrCRDTitle = document.getElementById('adrCRDtitle');
    const adrCRDTableBody1 = document.getElementById('adrCRDTableBody1');
    const adrCRDTableBody2 = document.getElementById('adrCRDTableBody2');
    let address = (function() {
        const addressParts = data.address.split('буд.');
        return `${addressParts[0]}<br>${addressParts[1] ? 'буд.' + addressParts[1] : ''}`;
    })();
    adrCRDTitle.innerHTML = address;
    adrCRDTableBody1.innerHTML = '';
    adrCRDTableBody2.innerHTML = '';
  
    const fmlEditMarkup = `<textarea id="addresses_edit_fml" placeholder="Введіть ПІБ абонента" data-old-value="${data.fml ? data.fml : ''}">${data.fml ? data.fml : ''}</textarea>`;
    addTableRow(adrCRDTableBody1, 'Телефон', data.phone ? PhoneNumberformat(data.phone).replace(/\n/g, '<br>') : null, data.ID, 'addresses_phones', createPhoneEditFields(data.phone, 'ADR_Card'));
    addTableRow(adrCRDTableBody1, 'ПІБ абонента', data.fml ? data.fml : null, data.ID, 'addresses_fml', fmlEditMarkup);
    addTableRow(adrCRDTableBody1, 'Лічильники', AddressCreateMeterFields(data.meters, 'show'), data.ID, 'addresses_meters', AddressCreateMeterFields(data.meters, 'edit'));
    addTableRow(adrCRDTableBody1, 'Заявки', AddressCreateTaskFields(data.tasks));
    const historyContainer = createHistoryEntries(data.history);
    adrCRDTableBody2.appendChild(historyContainer);
    if (adrCRDForm.classList.contains('show')) {
        adrCRDForm.classList.remove('show');
        setTimeout(() => {
            adrCRDForm.classList.add('show');
            openPopupsCount++;
        adrCRDForm.style.zIndex = baseIndex + openPopupsCount;
        }, 500);
    } else {
        adrCRDForm.classList.add('show');
        openPopupsCount++;
        adrCRDForm.style.zIndex = baseIndex + openPopupsCount;
    }
    adjustTabs();
    AdrCRDEscClose = createOnKeydownWrapper('closeCardForm', 'adrCRDform');
    document.addEventListener('keydown', AdrCRDEscClose);
}

let MeterEscClose;
function displayMeterForm(data) {
    const metersForm = document.getElementById('MetersForm');
    const metersTitle = document.getElementById('MetersTitle');
    const metersTableBody1 = document.getElementById('metersTableBody1');
    const metersTableBody2 = document.getElementById('metersTableBody2');
    const metersTableBody3 = document.getElementById('metersTableBody3');
    const metersTableBody4 = document.getElementById('metersTableBody4');
    metersTitle.textContent = data.number;
    metersTableBody1.innerHTML = '';
    metersTableBody2.innerHTML = '';
    metersTableBody3.innerHTML = '';
    metersTableBody4.innerHTML = '';
    const valueEditMarkup = `<input type="number" id="meters_edit_value" placeholder="Введіть показники" data-old-value="${data.value ? data.value : ''}" value="${data.value ? data.value : ''}">`;
    addTableRow(metersTableBody1, 'Тип', data.type_id);
    addTableRow(metersTableBody1, 'Дата', data.prod_date ? data.prod_date + ' р.' : null);
    addTableRow(metersTableBody1, 'Температура', MetersCreateServisetypeFields(data.service_type, 'show'), data.ID, 'meters_serviceType', MetersCreateServisetypeFields(data.service_type, 'edit'));
    addTableRow(metersTableBody1, 'Показники', formatValue(data.value), data.ID, 'meters_value', valueEditMarkup);
    addTableRow(metersTableBody1, 'Розташування', MetersCreateLocationFields(data.location, 'show'), data.ID, 'meters_location', MetersCreateLocationFields(data.location, 'edit'));
    addTableRow(metersTableBody1, 'Балансоутримувач', MetersCreateBalanserFields(data.balanser, 'show'), data.ID, 'meters_balanser', MetersCreateBalanserFields(data.balanser, 'edit'));
    addTableRow(metersTableBody1, 'Повірка', data.result === 1 ? "Придатний" : data.result === 2 ? "НЕпридатний" : data.result);
    addTableRow(metersTableBody1, 'Статус', data.status);
    addTableRow(metersTableBody1, 'Адреса', MetersCreateAddressFields(data.address_id, data.address, 'show'), data.ID, 'meters_address', MetersCreateAddressFields(data.address_id, data.address, 'edit'));
    addTableRow(metersTableBody2, 'Номер протоколу', data.protocol_num);
    addTableRow(metersTableBody2, 'Номер документу', data.certificate_num);
    addTableRow(metersTableBody2, 'Дата документу', data.certificate_date ? formatDate(data.certificate_date) : null);
    addTableRow(metersTableBody2, 'Дата КЕП', data.verification_date ? formatDate(data.verification_date) : null);
    addTableRow(metersTableBody2, 'Дійсний ДО', data.validity_date ? formatDate(data.validity_date) : null);
    addTableRow(metersTableBody3, 'Заявки', MetersCreateTaskFields(data.tasks));
    
    const historyContainer = createHistoryEntries(data.history);
    metersTableBody4.appendChild(historyContainer);
    if (metersForm.classList.contains('show')) {
        metersForm.classList.remove('show');
        setTimeout(() => {
            metersForm.classList.add('show');
            openPopupsCount++;
            metersForm.style.zIndex = baseIndex + openPopupsCount;
        }, 500);
    } else {
        metersForm.classList.add('show');
        openPopupsCount++;
        metersForm.style.zIndex = baseIndex + openPopupsCount;
    }
    adjustTabs();
    MeterEscClose = createOnKeydownWrapper('closeCardForm', 'MetersForm');
    document.addEventListener('keydown', MeterEscClose);

}

let TaskEscClose;
function displayTasksForm(data, taskType = null) {
    const tasksForm = document.getElementById('TasksForm');
    const tasksTitle = document.getElementById('TasksTitle');
    const tasksTableBody1 = document.getElementById('tasksTableBody1');
    const tasksTableBody2 = document.getElementById('tasksTableBody2');
    const addressParts = data.address.split('буд.');
    const addressContent = `${addressParts[0]}<br>${addressParts[1] ? 'буд.' + addressParts[1] : ''}`;
    tasksTitle.innerHTML = addressContent;
    tasksTableBody1.innerHTML = '';
    tasksTableBody2.innerHTML = '';
    const costEditMarkup = `<input type="number" id="tasks_edit_cost" placeholder="Введіть вартість" data-old-value="${data.cost ? data.cost : ''}" value="${data.cost ? data.cost : ''}">`;
    const noteEditMarkup = `<textarea id="tasks_edit_note" rows="5" placeholder="Введіть примітки" data-old-value="${data.note ? data.note : ''}">${data.note ? data.note : ''}</textarea>`;
    addTableRow(tasksTableBody1, 'Дата', data.date ? formatDate(data.date) : null);
    addTableRow(tasksTableBody1, 'Вид робіт', data.tasks_type ? data.tasks_type : null);
    addTableRow(tasksTableBody1, 'Номер телефону', data.phone ? PhoneNumberformat(data.phone).replace(/\n/g, '<br>') : null); 
    if (taskType === 'archive') {
        addTableRow(tasksTableBody1, 'Лічильники', TasksCreateMeterFields(data.meters, data.ID));
        addTableRow(tasksTableBody1, 'Виконавець', data.brigade ? data.brigade : null);
        addTableRow(tasksTableBody1, 'Вартість', data.cost ? data.cost + '.00 грн.' : null);
        addTableRow(tasksTableBody1, 'Спосіб оплати', data.pay_method ? data.pay_method : null);
        addTableRow(tasksTableBody1, 'Статус', data.status ? data.status : null);
        addTableRow(tasksTableBody1, 'Примітки', data.note ? data.note : null);
    } else {
        addTableRow(tasksTableBody1, 'Лічильники', AddressCreateMeterFields(data.meters, 'show', data.ID), data.ID, 'tasks_meters', AddressCreateMeterFields(data.meters, 'edit', data.ID));
        addTableRow(tasksTableBody1, 'Виконавець', TasksCreateBrigadeFields(data.brigade, 'show'), data.ID, 'tasks_brigade', TasksCreateBrigadeFields(data.brigade, 'edit'));
        addTableRow(tasksTableBody1, 'Вартість', data.cost !== null ? formatCost(data.cost) : data.cost, data.ID, 'tasks_cost', costEditMarkup);
        addTableRow(tasksTableBody1, 'Спосіб оплати', TasksCreatePayMethodFields(data.pay_method, 'show'), data.ID, 'tasks_payMethod', TasksCreatePayMethodFields(data.pay_method, 'edit'));
        addTableRow(tasksTableBody1, 'Статус', data.status ? data.status : null);
        addTableRow(tasksTableBody1, 'Примітки', data.note ? data.note : null, data.ID, 'tasks_note', noteEditMarkup);
    }
    const historyContainer = createHistoryEntries(data.history);
    tasksTableBody2.appendChild(historyContainer);

    tasksForm.querySelector("#TasksTabs").style.display = "flex";
    if (document.getElementById('route-container')) {
        tasksForm.querySelector("#TasksApplyCancelContainer").style.display = "flex";
        tasksForm.querySelector("#TasksApplyCancelContainer").setAttribute('data-taskid', data.ID);
    }

    if (tasksForm.classList.contains('show')) {
        tasksForm.classList.remove('show');
        setTimeout(() => {
            tasksForm.classList.add('show');
            openPopupsCount++;
            tasksForm.style.zIndex = baseIndex + openPopupsCount;
        }, 500);
    } else {
        tasksForm.classList.add('show');
        openPopupsCount++;
        tasksForm.style.zIndex = baseIndex + openPopupsCount;
    }
    adjustTabs();
    TaskEscClose = createOnKeydownWrapper('closeCardForm', 'TasksForm');
    document.addEventListener('keydown', TaskEscClose);

}

let TasksApplyCancelEscClose;
function TasksApplyCancel(action) {
    if (!action || (action !== 'apply' && action !== 'cancel')) {
        console.error(`Unknown action for TasksApplyCancel: ${action}`);
        return;
    }
    const tasksForm = document.getElementById('TasksForm');

    if (action === 'apply') {        
        const meterContainers = tasksForm.querySelectorAll('#TasksGeneralData .tasks-meters-container [data-tasks-card-meter-id]');
        let hasNoNumberMeter = false;
        meterContainers.forEach(meter => {
            if (nonumber_meters_types.includes(meter.getAttribute('data-tasks-card-meter-id'))) {
                hasNoNumberMeter = true;
            }
        });
        if (hasNoNumberMeter) {
            showAnimation('cancel', null, animation_time/1000);
            setTimeout(() => {
                document.getElementById('TasksForm').classList.add('show');
                showModalMessage('TasksTitle', 'alert', 'В заявці присутні лічильники без номера!<br>Завершення заявки без ідентицікації лічильників забороненно!', 10000);
                hideAnimation();
            }, animation_time);

            return;
        }
    }

    let ApplyCancelText;
    let buttonClass;
    let buttonText;
    switch (action) {
        case 'apply':
            ApplyCancelText = "Завершення";
            buttonClass = 'Tasks_btn_apply';
            buttonText = 'ЗАВЕРШИТИ';
            break;
        case 'cancel':
            ApplyCancelText = "Відміна";
            buttonClass = 'Tasks_btn_cancel';
            buttonText = 'ВІДМІНИТИ';
            break;
    }

    const tasksTableBody1 = tasksForm.querySelector("#tasksTableBody1");
    let SwitchContainer;
    if (tasksTableBody1.querySelector(".tasks-meters-container")) {
        SwitchContainer = `
                            <div class="tasks-switch-container" data-mode="all">
                                <div class="tasks-switch-button active" onclick="switchMode('all')">${buttonText}</div>
                                <div class="tasks-switch-button" onclick="switchMode('separate')">РОЗДІЛИТИ</div>
                            </div>
        `;
    } else {
        SwitchContainer = '';
    }

    const TasksApplyCancelContent = document.querySelector("#TasksApplyCancelContent");
    TasksApplyCancelContent.innerHTML = `
                                    <tr>
                                        <td>
                                            <div class="tasks-apply_cancel-text">
                                                <p class="title">АВАГА ! ! !</p>
                                                <p class="text">${ApplyCancelText} заявки призведе до її видалення.</p>
                                                <p class="text">Дані про процес будуть записані в історію.</p>
                                                <p class="text">Для підтвердження, введіть коментарі:</p>
                                            </div>
                                            ${SwitchContainer}
                                            <textarea rows="5" placeholder="Введіть коментарі"></textarea>
                                            <div class="TasksApplyCancelContainer">
                                                <div class="${buttonClass}" onclick="confirmTasksApplyCancel('${action}')">${buttonText}</div>
                                                <div class="Tasks_btn_back" onclick="confirmTasksApplyCancel('back')">НАЗАД</div>
                                            </div>
                                        </td>
                                    </tr>
                                `;

    const TasksApplyCancelForm = document.getElementById('TasksApplyCancelForm')
    TasksApplyCancelForm.classList.add('show');
    openPopupsCount++;
    TasksApplyCancelForm.style.zIndex = baseIndex + openPopupsCount;

    TasksApplyCancelEscClose = createOnKeydownWrapper('CloseTasksApplyCancel');
    document.addEventListener('keydown', TasksApplyCancelEscClose);
}
window.TasksApplyCancel = TasksApplyCancel;

function switchMode(mode) {
    const switchContainer = document.querySelector('.tasks-switch-container');
    switchContainer.setAttribute('data-mode', mode);
    const buttons = switchContainer.querySelectorAll('.tasks-switch-button');
    document.querySelector('.tasks-apply_cancel-text').style.display = 'none';

    buttons.forEach(button => {
        button.classList.remove('active');
    });

    if (mode === 'all') {
        buttons[0].classList.add('active');
    } else {
        buttons[1].classList.add('active');
    }

    const existingSeparateBlock = document.getElementById('tasks-separate-block');
    if (existingSeparateBlock) {
        existingSeparateBlock.remove();
    }

    if (mode === 'separate') {
        const tasksForm = document.getElementById('TasksForm');
        const tasksTableBody1 = tasksForm.querySelector("#tasksTableBody1");
        const metersContainer = tasksTableBody1.querySelector(".tasks-meters-container");
        const tasksApplyCancelContainer = tasksForm.querySelector('.TasksApplyCancelContainer');
        const actionButton = tasksApplyCancelContainer.querySelector('.Tasks_btn_apply, .Tasks_btn_cancel');
        let actionText;
        switch (true) {
            case actionButton.classList.contains('Tasks_btn_apply'):
                actionText = 'ЗАВЕРШИТИ';
                break;
            case actionButton.classList.contains('Tasks_btn_cancel'):
                actionText = 'ВІДМІНИТИ';
                break;
            default:
                actionText = '';
        }   

        if (metersContainer) {
            const meters = metersContainer.querySelectorAll('.tasks-meter-field');
            const separateBlock = document.createElement('div');
            separateBlock.id = 'tasks-separate-block';
            separateBlock.classList.add('tasks-separate-block');

            meters.forEach(meter => {
                const meterNumber = meter.textContent;
                const meterId = meter.getAttribute('data-tasks-card-meter-id');
            
                const meterBlock = document.createElement('div');
                meterBlock.classList.add('task-meter-separate');
                meterBlock.setAttribute('data-tasks-card-meter-id', meterId);
            
                const meterNumberBlock = document.createElement('div');
                meterNumberBlock.classList.add('meter-number');
                meterNumberBlock.textContent = meterNumber;
            
                const meterActionsBlock = document.createElement('div');
                meterActionsBlock.classList.add('meter-actions');
            
                const stopActionBlock = document.createElement('div');
                stopActionBlock.classList.add('action-item', 'active');
                stopActionBlock.textContent = actionText;
                stopActionBlock.addEventListener('click', handleBlockClick);
            
                meterActionsBlock.appendChild(stopActionBlock);
            
                tasks_types.forEach(type => {
                    const actionBlock = document.createElement('div');
                    actionBlock.classList.add('action-item');
                    actionBlock.textContent = type;
                    actionBlock.addEventListener('click', handleBlockClick);
                    meterActionsBlock.appendChild(actionBlock);
                });
            
                meterBlock.appendChild(meterNumberBlock);
                meterBlock.appendChild(meterActionsBlock);
                separateBlock.appendChild(meterBlock);
            });

            switchContainer.parentNode.insertBefore(separateBlock, switchContainer.nextSibling);
        }
    }
}
window.switchMode = switchMode;

function CloseTasksApplyCancel () {
    const TasksApplyCancelForm = document.getElementById('TasksApplyCancelForm')
    TasksApplyCancelForm.querySelector('#TasksApplyCancelContent').innerHTML = '';
    TasksApplyCancelForm.classList.remove('show');
    document.removeEventListener('keydown', TasksApplyCancelEscClose);
    TasksApplyCancelEscClose = null;
}
window.CloseTasksApplyCancel = CloseTasksApplyCancel;

function confirmTasksApplyCancel(action) {
    if (!action || (action !== 'apply' && action !== 'cancel' && action !== 'back')) {
        console.error(`Unknown action for confirmTasksApplyCancel: ${action}`);
        return;
    }

    const tasksForm = document.getElementById('TasksForm');
    const TasksApplyCancelForm = document.getElementById('TasksApplyCancelForm')
    const taskID = tasksForm.querySelector('#TasksApplyCancelContainer').dataset.taskid;
    const commentBox = TasksApplyCancelForm.querySelector("#TasksApplyCancelContent textarea");
    const comment = commentBox.value.trim();
    if (action === 'back') {
        CloseTasksApplyCancel ()
        return;
    }
    if (!comment) {
        showModalMessage('TasksApplyCancelTitle', 'alert', 'Для продовження необхідно ввести коментар!', 5000);
        return;
    }

    let type = 'DellTaskChernigiv';
    let action_type = null;
    const switchContainer = TasksApplyCancelForm.querySelector('.tasks-switch-container');
    if (switchContainer && switchContainer.getAttribute('data-mode') === 'separate') {
        type = 'ChangeTaskChernigiv';
        action_type = [];
        const separateBlock = TasksApplyCancelForm.querySelector('#tasks-separate-block');
        const meterBlocks = separateBlock.querySelectorAll('.task-meter-separate');

        meterBlocks.forEach(meterBlock => {
            const meterId = meterBlock.getAttribute('data-tasks-card-meter-id');
            const activeActionItem = meterBlock.querySelector('.meter-actions .action-item.active');
            if (activeActionItem) {
                const actionTypeText = activeActionItem.textContent;
                action_type.push({ meterId, actionTypeText });
            }
        });
    }

    const formData = {
        type,
        taskID,
        action,
        action_type,
        comment
    };

    fetch('php_server_data/addnewdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch (data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time / 1000);
                setTimeout(() => {
                    hideAnimation();
                    closeCardForm('TasksForm');
                    TasksApplyCancelForm.querySelector('#TasksApplyCancelContent').innerHTML = '';
                    TasksApplyCancelForm.classList.remove('show');
                    if (document.getElementById('tasks-container')) {
                        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "tasks", table: "tasks" } }));
                    }
                    if (document.getElementById('route-container')) {
                        const routeWorker = document.querySelector('#route-top-bar .active');
                        if (!routeWorker) {
                            sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "route",criteria: { worker: null, address: [] } } }));
                        } else {
                            const routeWorkerName = routeWorker.textContent;
                            const routeCurrentDateBlock = document.getElementById('current-date-block');
                            const routeCurrentDate = routeCurrentDateBlock.getAttribute('data-curr-work-date');
                            const routeCriteria = { worker: routeWorkerName, work_date: routeCurrentDate };
                            const filter_coocie_result = checkFilterCookie(true);
                            let address_criteria = [];
                            if (filter_coocie_result.filter_cookie) {
                                address_criteria = JSON.parse(filter_coocie_result.value);
                            }
                            sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "route", criteria: { worker: routeCriteria, address: address_criteria } } }));
                        }
                    }
                    showAnimation('preloader');
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time / 1000);
                setTimeout(() => {
                    hideAnimation();
                    TasksApplyCancelForm.classList.remove('show');
                    showModalMessage('TasksTitle', 'warning', data.message, 10000);
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time / 1000);
                TasksApplyCancelForm.classList.remove('show');
                setTimeout(() => {
                    hideAnimation();
                    showModalMessage('TasksTitle', 'alert', data.message, 10000);
                }, animation_time);
                break;
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}
window.confirmTasksApplyCancel = confirmTasksApplyCancel;

function closeCardForm(pageType) {
    const window_container = document.getElementById(pageType);
    switch(pageType) {
        case 'adrCRDform':
            if (AdrCRDEscClose) {
                document.removeEventListener('keydown', AdrCRDEscClose);
                AdrCRDEscClose = null;
            }
            break;
        case 'MetersForm':
            if (MeterEscClose) {
                document.removeEventListener('keydown', MeterEscClose);
                MeterEscClose = null;
            }
            break;
        case 'TasksForm':
            if (TaskEscClose) {
                document.removeEventListener('keydown', TaskEscClose);
                TaskEscClose = null;
            }
            break;
        default:
            console.error(`Unknown pageType: ${pageType}`);
            break;
    }
    window_container.classList.remove("show");
    const temporaryMessage = window_container.querySelector('[data-temporary-block-message]');
    if (temporaryMessage) {
        temporaryMessage.remove();
    }
}
window.closeCardForm = closeCardForm;

function createPhoneEditFields(phoneNumberString, window_case) {
    let fields = '';
    let dellBTNshow = false;
    let initialPhoneCount = 0;
    if (phoneNumberString) {
        const phoneNumbers = phoneNumberString.split('|');
        initialPhoneCount = phoneNumbers.length;
        if(phoneNumbers.length > 1) {
            dellBTNshow = true;
        }
        phoneNumbers.forEach((phoneNumber, index) => {
            let code = '';
            let number = '';
            let placeholder = '';
            let formattedNumber = '';

            if (phoneNumber.length === 6) {
                code = '0462';
                number = phoneNumber;
                placeholder = 'xx-xx-xx';
            } else if (phoneNumber.length === 10) {
                code = phoneNumber.substring(0, 3);
                number = phoneNumber.substring(3);
                placeholder = 'xxx-xx-xx';
            }
            const numbers = number.replace(/\D/g, '');
            const char = code === '0462' ? {2: '-', 4: '-'} : {3: '-', 5: '-'};
            for (let i = 0; i < numbers.length; i++) {
                formattedNumber += (char[i] || '') + numbers[i];
            }
            const maxLength = code === '0462' ? 8 : 9;
            formattedNumber = formattedNumber.substr(0, maxLength);
            fields += `
                <div class="phone-edit-field">
                    <select id="phone_code_${index}" data-old-value="${code}" onchange="document.getElementById('phone_number_${index}').placeholder = this.value === '0462' ? 'xx-xx-xx' : 'xxx-xx-xx'; window.formatPhoneNumber(document.getElementById('phone_number_${index}'));">
                        ${phoneSufixArea.map(c => `<option value="${c}" ${c === code ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                    <input type="text" id="phone_number_${index}" value="${formattedNumber}" data-old-value="${number}" placeholder="${placeholder}" oninput="window.formatPhoneNumber(this);">
                </div>
            `;
        });
    } else {
        fields += `
        <div class="phone-edit-field">
            <select id="phone_code_0" data-old-value="" onchange="document.getElementById('phone_number_0').placeholder = this.value === '0462' ? 'xx-xx-xx' : 'xxx-xx-xx'; window.formatPhoneNumber(document.getElementById('phone_number_0'));">
                ${phoneSufixArea.map(c => `<option value="${c}" ${c === '039' ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
            <input type="text" id="phone_number_0" value="" data-old-value="" placeholder="xxx-xx-xx" oninput="window.formatPhoneNumber(this);">
        </div>
    `;
    }

    fields += `
        <div class="button-container" data-initial-phone-count="${initialPhoneCount}">
            <div class="add-button" onclick="window.addPhoneField('${window_case}')">
                <svg><use href="#plus_icon"></use></svg>
            </div>
            <div class="remove-button" onclick="window.removePhoneField('${window_case}')" style="display: ${dellBTNshow ? '' : 'none'};">
                <svg><use href="#minus_icon"></use></svg>
            </div>
        </div>
    `;
    return fields;
}

function AddressCreateMeterFields(metersArray, block, taskID = null) {
    let fields = '';
    switch(block) {
        case 'show':
            if (!metersArray || metersArray.length === 0) return getValueOrDefault(null);
            metersArray.forEach((meter, index) => {
                let onklick_fn = '';
                if (user_pages.split('|').includes('METERS')) {
                    if (meter.number === 'nonumber') {
                        if (document.getElementById('route-container')) {
                            onklick_fn = `identifyMeterWithNoNumber(event, ${taskID})`;
                        } else {
                            onklick_fn = '';
                        }
                    } else {
                        onklick_fn = `sendObjectRequest('METERS', ${meter.ID})`;
                    }
                } else {
                    if (document.getElementById('route-container')) {
                        onklick_fn = `showModalMessage('TasksTitle', 'alert', 'Обмеження права доступу!<br>відкриття карток лічильників заборонено!', 5000)`;
                    }
                    if (document.getElementById('addresses-container')) {
                        onklick_fn = `showModalMessage('adrCRDtitle', 'alert', 'Обмеження права доступу!<br>відкриття карток лічильників заборонено!', 5000)`;
                    }
                }
                let type_bg_color = '';
                switch (meter.service_type) {
                    case 1:
                        type_bg_color = 'cold';
                        break;
                    case 2:
                        type_bg_color = 'hot';
                        break;
                    default:
                        type_bg_color = 'unknown';
                        break;
                }
                fields += `
                            <div class="address-meter-field ${type_bg_color}" data-address-card-meters-id="${meter.ID}" onclick="${onklick_fn}">
                                ${meter.number === 'nonumber' ? 'БЕЗ НОМЕРА' : meter.number}<br>
                                <span style="font-size: 80%;">${meter.location ? meter.location.toLowerCase() : 'НЕВІДОМО'}</span>
                            </div>
                        `;
            });
            return fields;
        case 'edit':
            let meterIds = [];
            if (!metersArray || metersArray.length === 0) {
                fields += getValueOrDefault(null);
            } else {
                metersArray.forEach((meter, index) => {
                    meterIds.push(meter.ID);
                    let type_bg_color = '';
                    switch (meter.service_type) {
                        case 1:
                            type_bg_color = 'cold';
                            break;
                        case 2:
                            type_bg_color = 'hot';
                            break;
                        default:
                            type_bg_color = 'unknown';
                            break;
                    }
                    fields += `
                        <div class="address-meter-field ${type_bg_color}" data-address-card-meters-id=${meter.ID}>
                            <div class="number">
                                ${meter.number === 'nonumber' ? 'БЕЗ НОМЕРА' : meter.number}<br>
                                <span style="font-size: 80%;">${meter.location ? meter.location.toLowerCase() : 'НЕВІДОМО'}</span>
                            </div>
                            <div class="dell_btn" onclick="this.parentElement.style.display = 'none';">
                                <svg><use href="#minus_icon"></use></svg>
                            </div>
                        </div>
                    `;
                });
            }
            fields += ` <div class="address-new-meter" data-old-data-address-card-meters-id='${JSON.stringify(meterIds)}'  data-task-id='${taskID}'>
                            <svg id="address-new-meter-btn" onclick="addressAddMeterToADR('open')"><use href="#plus_icon"></use></svg>
                            <input type="text" id="address-new-meter-input" placeholder="Номер лічильника" style="display: none;">
                            <div id="address-new-meter-field" style="display: none;"></div>
                        </div>`;
            return fields;
        default:
            console.error(`Unknown block for AddressCreateMeterFields function: ${block}`);
            return fields;
    }
}

const address_meters_inputListener = function() {
    const criteria = this.value;
    addressAddMeterToADR('server_request_meters', criteria);
};

function addressAddMeterToADR(process, criteria = null, metersData = null) {
    switch(process) {
        case 'open':
            document.getElementById('address-new-meter-btn').style.display = 'none';
            document.getElementById('address-new-meter-input').style.display = 'block';
            document.getElementById('address-new-meter-field').style.display = 'block';
            document.getElementById('address-new-meter-input').addEventListener('input', address_meters_inputListener);
            sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "addresses", table: "meters", criteria: criteria } }));
            break;
        case 'server_request_meters':
            sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "addresses", table: "meters", criteria: criteria } }));
            break;
        case 'server_response_meters':
            const container = document.getElementById('address-new-meter-field');
            const query = document.getElementById('address-new-meter-input').value;
            container.innerHTML = '';

            const newMeterElement = document.createElement('div');
            newMeterElement.dataset.addressesAddMeter = 'NEW';
            newMeterElement.innerHTML = 'Новий лічильник';
            newMeterElement.addEventListener('click', () => {
                openAddNewForm('METERS');
            });
            container.appendChild(newMeterElement);

            if (metersData && Array.isArray(metersData)) {
                metersData.forEach(meter => {
                    const meterElement = document.createElement('div');
                    meterElement.dataset.addressesAddMeter = meter.ID;
                    meterElement.innerHTML = highlightMatch(meter.number, query);
                    meterElement.addEventListener('click', () => {
                        addressAddMeterToADR('result', null, { ID: meter.ID, number: meter.number, service_type: meter.service_type, location: meter.location });
                    });
                    container.appendChild(meterElement);
                });
            }
            break;
        case 'result':
            document.getElementById('address-new-meter-btn').style.display = 'block';
            document.getElementById('address-new-meter-input').style.display = 'none';
            document.getElementById('address-new-meter-field').style.display = 'none';
            if (metersData) {
                let meters_edit_container = '';
                if (document.getElementById('addresses-container')) {
                    meters_edit_container = '#addresses_meters-edit';
                }
                if (document.getElementById('route-container')) {
                    meters_edit_container = '#tasks_meters-edit';
                }
                const editFieldsContainer = document.querySelector(`${meters_edit_container} .edit-fields`);
                const existingMeterFields = editFieldsContainer.querySelectorAll('.address-meter-field');
                const existingIds = Array.from(existingMeterFields).map(field => field.dataset.addressCardMetersId);
                const noDataBlock = editFieldsContainer.querySelector('.no-data');
                if (noDataBlock) {
                    noDataBlock.remove();
                }
                if (existingIds.includes(metersData.ID.toString())) {
                    alert('Такий лічильник вже існує!');
                    break;
                }
                let type_bg_color = '';
                switch (metersData.service_type) {
                    case 1:
                        type_bg_color = 'cold';
                        break;
                    case 2:
                        type_bg_color = 'hot';
                        break;
                    default:
                        type_bg_color = 'unknown';
                        break;
                }
                const newMeterElement = document.querySelector(`${meters_edit_container} .edit-fields .address-new-meter`);
                const meterElement = document.createElement('div');
                meterElement.classList.add('address-meter-field', type_bg_color);
                meterElement.dataset.addressCardMetersId = metersData.ID;
                meterElement.innerHTML = `
                    <div class="number">
                        ${metersData.number}<br>
                        <span style="font-size: 80%;">${metersData.location ? metersData.location.toLowerCase() : 'НЕВІДОМО'}</span>
                    </div>
                    <div class="dell_btn" onclick="this.parentElement.style.display = 'none';">
                        <svg><use href="#minus_icon"></use></svg>
                    </div>
                `;
                editFieldsContainer.insertBefore(meterElement, newMeterElement);
            }
            break;
        default:
            console.error(`Unknown process for addressAddMeterToADR function: ${process}`);
            break;
    }
}
window.addressAddMeterToADR = addressAddMeterToADR;

function AddressCreateTaskFields(tasksArray) {
    let fields = '';
    if (tasksArray && tasksArray.length > 0) {
        fields += `<div class="address-task-container">`;
        tasksArray.forEach((task, index) => {
            let onklick_fn;
            if (user_pages.split('|').includes('ROUTE')) {
                onklick_fn = `sendObjectRequest('ROUTE', ${task.ID})`;
            } else {
                onklick_fn = `showModalMessage('adrCRDtitle', 'alert', 'Обмеження права доступу!<br>відкриття карток заявок заборонено!', 5000)`;
            }
            fields += `
                <div class="address-task-field" data-address-card-task-id="${task.ID}" onclick="${onklick_fn}">
                    <div class="task-date">${formatDate(task.date)}</div>
                    <div class="task-type">${task.tasks_type}</div>
                </div>
            `;
        });
        fields += `</div>`;
    } else {
        fields = getValueOrDefault(null);
    }
    return fields;
}

function MetersCreateServisetypeFields(type, process) {
    let fields = '';
    let service_type = '';
    let cold_condition = '';
    let hot_condition = '';
    switch (type) {
        case 1:
            service_type = 'Холодний';
            cold_condition = 'active';
            break;
        case 2:
            service_type = 'Гарячий';
            hot_condition = 'active';
            break;
        default:
            service_type = getValueOrDefault(null);
    }
    switch (process) {
        case 'show':
            return service_type;
        case 'edit':
            fields += ` <div id="meters-servisetype-edit" class="meters-servisetype-field" data-old-value="${type}">
                            <div class="meters-servisetype-value ${cold_condition}" onclick="handleBlockClick(event)">
                                <div>Холодний</div>
                            </div>
                            <div class="meters-servisetype-value ${hot_condition}" onclick="handleBlockClick(event)">
                                <div>Гарячий</div>
                            </div>
                        </div>`
            return fields;
        default:
            return console.error(`Unknown process for MetersCreateServisetypeFields function: ${process}`);

    }
}

function MetersCreateLocationFields(type, process) {
    let fields = '';
    let conditions = new Array(locations.length).fill('');

    for (let i = 0; i < locations.length; i++) {
        if (type === locations[i]) {
            conditions[i] = 'active';
        }
    }

    switch (process) {
        case 'show':
            return type;
        case 'edit':
            fields += `<div id="meters-location-field" class="meters-location-field" data-old-value="${type}">`;
            for (let i = 0; i < locations.length; i++) {
                fields += `<div class="meters-location-value ${conditions[i]}" onclick="handleBlockClick(event)">
                               <div>${locations[i]}</div>
                           </div>`;
            }
            fields += `</div>`;
            return fields;
        default:
            console.error(`Unknown process for MetersCreateLocationFields function: ${process}`);
            return '';
    }
}

function MetersCreateBalanserFields(type, process) {
    let fields = '';
    let conditions = new Array(balansers.length).fill('');

    for (let i = 0; i < balansers.length; i++) {
        if (type === balansers[i]) {
            conditions[i] = 'active';
            break;
        }
    }

    switch (process) {
        case 'show':
            return type;
        case 'edit':
            fields += `<div id="meters-balanser-field" class="meters-balanser-field" data-old-value='${type}'>`;
            for (let i = 0; i < balansers.length; i++) {
                fields += `<div class="meters-balanser-value ${conditions[i]}" onclick="handleBlockClick(event)">
                               <div>${balansers[i]}</div>
                           </div>`;
            }
            fields += `</div>`;
            return fields;
        default:
            console.error(`Unknown process for MetersCreateLocationFields function: ${process}`);
            return '';
    }
}

function MetersCreateAddressFields(id, address, process) {
    let fields = '';
    switch (process) {
        case 'show':
            if (id && address) {
                let onklick_fn;
                if (user_pages.split('|').includes('ADDRESSES')) {
                    onklick_fn = `sendObjectRequest('ADDRESSES', ${id})`;
                } else {
                    onklick_fn = `showModalMessage('MetersTitle', 'alert', 'Обмеження права доступу!<br>відкриття карток адрес заборонено!', 5000)`;
                }
                const [firstPart, secondPart] = address.split('буд.');
                fields += ` <div class="meters-address-container">
                                <div class="meters-address-field" data-meters-card-address-id="${id}" onclick="${onklick_fn}">
                                    <div>${firstPart.trim()}</div>
                                    <div>буд. ${secondPart.trim()}</div>
                                </div>
                            </div>`;
            } else {
                fields = getValueOrDefault(null);
            }
            break;
        case 'edit':
            let address_id = '';
            let address_val = '';
            if (id && address) {
                address_id = id;
                address_val = address;
            }
            fields += ` <div class="meters-new-address">
                            <textarea id="meters-new-adress-input" placeholder="Адреса" value="${address_val}" onclick="metersAddAddressToMeter('open')" data-old-data-meters-card-address-id='${address_id}'></textarea>
                            <div id="meters-new-adress-field" style="display: none"></div>
                        </div>`;
            break;
        default:
            console.error(`Unknown process for MetersCreateAddressFields function: ${process}`);
    }
    return fields;
}

const meters_address_inputListener = function() {
    const criteria = this.value;
    metersAddAddressToMeter('server_request_addresses', criteria);
};

function metersAddAddressToMeter(process, criteria = null, addressData = null) {
    switch(process) {
        case 'open':
            document.getElementById('meters-new-adress-field').style.display = 'block';
            document.getElementById('meters-new-adress-input').value = '';
            document.getElementById('meters-new-adress-input').addEventListener('input', meters_address_inputListener);
            sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "meters", table: "addresses_edit", criteria: criteria } }));
            break;
        case 'server_request_addresses':
            sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "meters", table: "addresses_edit", criteria: criteria } }));
            break;
        case 'server_response_addresses':
            const container = document.getElementById('meters-new-adress-field');
            const query = document.getElementById('meters-new-adress-input').value;
            container.innerHTML = '';

            const newAddressElement = document.createElement('div');
            newAddressElement.dataset.metersAddAddress = 'NEW';
            newAddressElement.innerHTML = 'Нова адреса';
            newAddressElement.addEventListener('click', () => {
                openAddNewForm('ADDRESSES');
            });
            container.appendChild(newAddressElement);

            if (addressData && addressData.length > 0) {
                addressData.forEach(address => {
                    const addressElement = document.createElement('div');
                    addressElement.dataset.metersAddAddress = address.id;
                    addressElement.innerHTML = highlightMatch(address.address, query);
                    addressElement.addEventListener('click', () => {
                        document.getElementById('meters-new-adress-field').style.display = 'none';
                        document.getElementById('meters-new-adress-input').value = address.address;
                        document.getElementById('meters-new-adress-input').setAttribute('data-new-data-meters-card-address-id', address.id);
                    });
                    container.appendChild(addressElement);
                });
            }
            break;
        default:
            console.error(`Unknown process for metersAddAddressToMeter function: ${process}`);
            break;
    }
}
window.metersAddAddressToMeter = metersAddAddressToMeter;

function MetersCreateTaskFields(task) {
    let fields = '';
    if (task) {
        fields += `<div class="meters-task-container">`;
        let onklick_fn;
        if (user_pages.split('|').includes('ROUTE')) {
            onklick_fn = `sendObjectRequest('ROUTE', ${task.ID})`;
        } else {
            onklick_fn = `showModalMessage('MetersTitle', 'alert', 'Обмеження права доступу!<br>відкриття карток заявок заборонено!', 5000)`;
        }
        fields += `
            <div class="meters-task-field" data-meters-card-task-id="${task.ID}" onclick="${onklick_fn}">
                <div class="task-date">${formatDate(task.date)}</div>
                <div class="task-type">${task.tasks_type}</div>
            </div>
        `;
        fields += `</div>`;
    } else {
        fields = getValueOrDefault(null);
    }
    return fields;
}

function TasksCreateMeterFields (metersArray, taskID) {
    let fields = '';
    if (metersArray && metersArray.length > 0) {
        fields += `<div class="tasks-meters-container">`;
        metersArray.forEach((meter, index) => {
            let onklick_fn = '';
            if (user_pages.split('|').includes('METERS')) {
                if (meter.number === 'nonumber') {
                    if (document.getElementById('route-container')) {
                        onklick_fn = `identifyMeterWithNoNumber(event, ${taskID})`;
                    } else {
                        onklick_fn = '';
                    }
                    
                } else {
                    onklick_fn = `sendObjectRequest('METERS', ${meter.ID})`;
                }
            } else {
                onklick_fn = `showModalMessage('TasksTitle', 'alert', 'Обмеження права доступу!<br>відкриття карток лічильників заборонено!', 5000)`;
            }
            let type_bg_color = '';
            switch (meter.service_type) {
                case 1:
                    type_bg_color = 'cold';
                    break;
                case 2:
                    type_bg_color = 'hot';
                    break;
                default:
                    type_bg_color = 'unknown';
                    break;
            }
            fields += `
                <div class="tasks-meter-field ${type_bg_color}" data-tasks-card-meter-id="${meter.ID}" onclick="${onklick_fn}">
                    ${meter.number === 'nonumber' ? 'БЕЗ НОМЕРА' : meter.number}<br>
                    <span style="font-size: 80%;">${meter.location ? meter.location.toLowerCase() : 'НЕВІДОМО'}</span>
                </div>
            `;
        });
        fields += `</div>`;
    } else {
        fields = getValueOrDefault(null);
    }
    return fields;
}

function identifyMeterWithNoNumber(event, taskID) {
    if (document.getElementById('tasks-identify_meters-block')) {
        console.error('identifyMeterWithNoNumber: block already exists');
        return;
    }
    const metersContainer = document.querySelector('#TasksForm #TasksGeneralData #tasks_meters-display .value-text');
    const meterFields = metersContainer.querySelectorAll('.address-meter-field');
    metersContainer.setAttribute('data-task-id', taskID);
    meterFields.forEach(meterField => {
        meterField.classList.add('hiden');
    });
    setTimeout(() => {
        if (event && event.target) {
            event.target.classList.remove('hiden');
        }
    }, 0);

    let metersBlock = document.createElement('div');
    metersBlock.className = 'tasks-identify_meters-block';
    metersBlock.id = 'tasks-identify_meters-block';
    metersBlock.innerHTML = `
        <input type="text" class="tasks-identify_meters-input" id="tasks-identify_meters-input" placeholder="Номер лічильника">
        <div class="tasks-identify_meters-field" id="tasks-identify_meters-field"></div>
    `;

    metersContainer.appendChild(metersBlock);

    const inputField = document.getElementById('tasks-identify_meters-input');
    inputField.addEventListener('input', function() {
        const criteria = inputField.value;
        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "meters", criteria: criteria } }));
    });

    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "meters", criteria: null } }));
}
window.identifyMeterWithNoNumber = identifyMeterWithNoNumber;

function identifyMeterWithNoNumberServerResponse(metersData) {
    const metersContainer = document.querySelector('#TasksForm #TasksGeneralData #tasks_meters-display .value-text');
    const identifyMetersContainer = metersContainer.querySelector('#tasks-identify_meters-block');
    const container = identifyMetersContainer.querySelector('.tasks-identify_meters-field');
    const query = identifyMetersContainer.querySelector('.tasks-identify_meters-input').value;
    container.innerHTML = '';

    const newMeterElement = document.createElement('div');
    newMeterElement.dataset.addressesAddMeter = 'NEW';
    newMeterElement.innerHTML = 'Новий лічильник';
    newMeterElement.addEventListener('click', () => {
        openAddNewForm('METERS');
    });
    container.appendChild(newMeterElement);

    if (metersData && Array.isArray(metersData)) {
        metersData.forEach(meter => {
            const meterElement = document.createElement('div');
            meterElement.dataset.addressesAddMeter = meter.ID;
            meterElement.innerHTML = highlightMatch(meter.number, query);
            meterElement.addEventListener('click', () => {
                const TaskID = metersContainer.getAttribute('data-task-id');
                identifyMeterWithNoNumberSubmit(TaskID, meter);
            });
            container.appendChild(meterElement);
        });
    }
}

function identifyMeterWithNoNumberSubmit(TaskID, meter) {
    const confirmation = confirm(`  Ви впевнені, що хочете ідентификувати лічильник як:\n
                                    НОМЕР: ${meter.number}\n
                                    Температура: ${meter.service_type === 1 ? 'Холодний' : meter.service_type === 2 ? 'Гарячий' : 'Невідомо'}\n
                                    Місце встановлення: ${meter.location ? meter.location : 'Невідомо'}\n
                                    ЗМІНИ ВІДМІНИТИ БУДЕ НЕ МОЖЛИВО!`);
    if (confirmation) {
        const undefined_meter = document.querySelector('#TasksForm #TasksGeneralData #tasks_meters-display .value-text .address-meter-field:not(.hiden)').getAttribute('data-address-card-meters-id');
        const formData = {
            type: "EditDataChernigiv",
            DataId: TaskID,
            edit_field: "identify_meters",
            edit_values: [undefined_meter, meter.ID, meter.number]
        };
        
        fetch('php_server_data/editdata.php', {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: {'Content-Type': 'application/json'}
        })
        .then(response => response.json())
        .then(data => {
            switch(data.status) {
                case 'success':
                    showAnimation('confirm', null, animation_time/1000);
                    setTimeout(() => {
                        hideAnimation();
                        showAnimation('preloader');
                        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "object", DataId: TaskID } }));
                        showModalMessage('TasksTitle', 'info', data.message, 10000);
                        const taskColumn = document.querySelector(`.page_column[data-task-id="${TaskID}"]`);
                        if (taskColumn) {
                            const noNomberMeterDiv = taskColumn.querySelector('.page_card_value[data-label="Лічильники:"]');
                            if (noNomberMeterDiv) {
                                const noNumberDiv = Array.from(noNomberMeterDiv.querySelectorAll('div')).find(div => div.textContent.includes('БЕЗ НОМЕРА'));
                                if (noNumberDiv) {
                                    noNumberDiv.innerHTML = meter.number;
                                }
                            }
                        }
                    }, animation_time);
                    break;
                case 'warning':
                    showAnimation('warning', null, animation_time/1000);
                    setTimeout(() => {
                        document.getElementById('TasksForm').classList.add('show');
                        showModalMessage('TasksTitle', 'warning', data.message, 10000);
                        hideAnimation();
                    }, animation_time);
                    break;
                case 'error':
                    showAnimation('cancel', null, animation_time/1000);
                    setTimeout(() => {
                        document.getElementById('TasksForm').classList.add('show');
                        showModalMessage('TasksTitle', 'alert', data.message, 10000);
                        hideAnimation();
                    }, animation_time);
                    break;
            }
        })
        .catch(error => {
            alert('Помилка при відправці даних на сервер: ' + error.message);
        });
    }
}

function TasksCreateBrigadeFields (type, process) {
    let fields = '';
    let conditions = new Array(workers.length).fill('');
    let empty_active = '';
    if (type === null) {
        empty_active = 'active';
    }
    for (let i = 0; i < workers.length; i++) {
        if (type === workers[i]) {
            conditions[i] = 'active';
            break;
        }
    }
    switch (process) {
        case 'show':
            return type;
        case 'edit':
            fields += `<div id="tasks-brigade-field" class="tasks-brigade-field" data-old-value='${type}'>`;
            for (let i = 0; i < workers.length; i++) {
                fields += `<div class="tasks-brigade-value ${conditions[i]}" onclick="handleBlockClick(event)">
                               <div>${workers[i]}</div>
                           </div>`;
            }
            fields += ` <hr style="width: 100%;">
                        <div class="tasks-brigade-value ${empty_active}" onclick="handleBlockClick(event)">
                               <div>ВІДСУТНІЙ</div>
                        </div>`;
            fields += `</div>`;
            return fields;
        default:
            console.error(`Unknown process for TasksCreateBrigadeFields function: ${process}`);
            return '';
    }
}

function TasksCreatePayMethodFields (type, process) {
    let fields = '';
    let conditions = new Array(pay_methods.length).fill('');

    for (let i = 0; i < pay_methods.length; i++) {
        if (type === pay_methods[i]) {
            conditions[i] = 'active';
            break;
        }
    }

    switch (process) {
        case 'show':
            return type;
        case 'edit':
            fields += `<div id="tasks-pay_methods-field" class="tasks-pay_methods-field" data-old-value='${type}'>`;
            for (let i = 0; i < pay_methods.length; i++) {
                fields += `<div class="tasks-pay_methods-value ${conditions[i]}" onclick="handleBlockClick(event)">
                               <div>${pay_methods[i]}</div>
                           </div>`;
            }
            fields += `</div>`;
            return fields;
        default:
            console.error(`Unknown process for TasksCreatePayMethodFields function: ${process}`);
            return '';
    }
}

// ========== Зміна даних об'єктів ==========
function saveEdit(objectId, fieldId) {
    const valueContainer = document.getElementById(`${fieldId}-display`);
    const editContainer = document.getElementById(`${fieldId}-edit`);
    valueContainer.style.display = 'flex';
    editContainer.style.display = 'none';
    switch(fieldId) {
        case 'addresses_phones':
            saveAddress_phones(objectId);
            break;
        case 'addresses_fml':
            saveAddress_fml(objectId);
            break;
        case 'addresses_meters':
            saveAddress_meters(objectId);
            break;
        case 'meters_serviceType':
            saveMeters_serviceType(objectId);
            break;
        case 'meters_value':
            saveMeters_value(objectId);
            break;
        case 'meters_location':
            saveMeters_location(objectId);
            break;
        case 'meters_balanser':
            saveMeters_balanser(objectId);
            break;
        case 'meters_address':
            saveMeters_address(objectId);
            break;
        case 'tasks_meters':
            saveTasks_meters(objectId);
            break;
        case 'tasks_brigade':
            saveTasks_brigade(objectId);
            break;
        case 'tasks_cost':
            saveTasks_cost(objectId);
            break;
        case 'tasks_payMethod':
            saveTasks_payMethod(objectId);
            break;
        case 'tasks_note':
            saveTasks_note(objectId);
            break;
        default:
            console.error(`Unknown fieldId for saveEdit: ${fieldId}`);
            break;
    }
}
window.saveEdit = saveEdit;

function cancelEdit(fieldId) {
    const valueContainer = document.getElementById(`${fieldId}-display`);
    const editContainer = document.getElementById(`${fieldId}-edit`);
    valueContainer.style.display = 'flex';
    editContainer.style.display = 'none';
    switch(fieldId) {
        case 'addresses_phones':
            break;
        case 'addresses_fml':
            break;
        case 'addresses_meters':
            document.getElementById('address-new-meter-input').removeEventListener('input', address_meters_inputListener);
            document.getElementById('address-new-meter-btn').style.display = 'block';
            document.getElementById('address-new-meter-input').style.display = 'none';
            document.getElementById('address-new-meter-input').value = '';
            document.getElementById('address-new-meter-field').style.display = 'none';
            break;
        case 'meters_serviceType':
            break;
        case 'meters_value':
            break;
        case 'meters_location':
            break;
        case 'meters_balanser':
            break;
        case 'meters_address':
            break;
        case 'tasks_meters':
            break;
        case 'tasks_brigade':
            break;
        case 'tasks_cost':
            break;
        case 'tasks_payMethod':
            break;
        case 'tasks_note':
            break;
        default:
            console.error(`Unknown fieldId for cancelEdit: ${fieldId}`);
            break;
    }
}
window.cancelEdit = cancelEdit;

function saveAddress_fml(objectId) {
    const fmlEditContainer = document.getElementById('addresses_fml-edit');
    const textarea = fmlEditContainer.querySelector('textarea');
    const fml = textarea.value.trim() === '' ? null : textarea.value.trim();
    const oldFml = textarea.getAttribute('data-old-value');
    const isOldFmlEmpty = oldFml === '' || oldFml === null || oldFml === undefined;
    const isFmlEmpty = fml === null || fml === undefined;

    if ((isOldFmlEmpty && isFmlEmpty) || oldFml === fml) {
        showModalMessage('adrCRDtitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
        return;
    }
    document.getElementById('adrCRDform').classList.remove('show');

    const formData = {
        type: "EditDataChernigiv",
        DataId: objectId,
        edit_field: "fml",
        edit_values: fml
    };
    
    fetch('php_server_data/editdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch(data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    showAnimation('preloader');
                    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "addresses", table: "object", DataId: objectId } }));
                    showModalMessage('adrCRDtitle', 'info', data.message, 10000);
                    const addressColumn = document.querySelector(`.page_column[data-address-id="${objectId}"]`);
                    if (addressColumn) {
                        const subscriberNameDiv = addressColumn.querySelector('.page_card_value[data-label="ПІБ абонента:"]');
                        if (subscriberNameDiv) {
                            subscriberNameDiv.innerHTML = getValueOrDefault(fml);
                        }
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('adrCRDform').classList.add('show');
                    showModalMessage('adrCRDtitle', 'warning', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('adrCRDform').classList.add('show');
                    showModalMessage('adrCRDtitle', 'alert', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
        }
    })

                

    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

function saveAddress_phones(objectId) {
    const phoneFieldContainer = document.getElementById('addresses_phones-edit');
    const phoneFields = phoneFieldContainer.getElementsByClassName('phone-edit-field');
    const buttonContainer = phoneFieldContainer.querySelector('.button-container');
    const initialPhoneCount = parseInt(buttonContainer.getAttribute('data-initial-phone-count'), 10);
    let hasChanges = false;
    let phoneNumbers = [];
    let invalidInput = false;
    const phoneFieldsWithAttribute = Array.from(phoneFields).filter(field => field.querySelector('select').hasAttribute('data-old-value'));
    if (phoneFieldsWithAttribute.length !== initialPhoneCount) {
        hasChanges = true;
        console.log('Значення не змінювались, але номери видалені!');
    }

    if (phoneFields.length === 1) {
        const input = phoneFields[0].querySelector('input');
        const select = phoneFields[0].querySelector('select');
        const number = input.value.replace(/\D/g, '');
        const oldNumber = input.getAttribute('data-old-value');
        const oldCode = select.getAttribute('data-old-value');
        if ((oldNumber === '' || oldNumber === null) && number === '' && (oldCode === '' || oldCode === null)) {
            showModalMessage('adrCRDtitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
            return;
        }
    }
    for (let i = 0; i < phoneFields.length; i++) {
        const select = phoneFields[i].querySelector('select');
        const input = phoneFields[i].querySelector('input');
        const code = select.value;
        const oldCode = select.getAttribute('data-old-value');
        const number = input.value.replace(/\D/g, '');
        const oldNumber = input.getAttribute('data-old-value');

        if ((code === '0462' && number.length !== 6) || (code !== '0462' && number.length !== 7)) {
            if (number.length > 0) {
                invalidInput = true;
            }
        }
        if (code !== oldCode || number !== oldNumber) {
            hasChanges = true;
        }

        if (number.length > 0) {
            const phoneNumber = code === '0462' ? number : code + number;
            phoneNumbers.push(phoneNumber);
        }
    }
    if (!hasChanges) {
        showModalMessage('adrCRDtitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
        return;
    }
    if (invalidInput) {
        alert('Некорректный номер телефона. Проверьте введенные данные.');
        showModalMessage('adrCRDtitle', 'warning', 'Невырний формат номеру телефону.', 5000);
        return;
    }

    document.getElementById('adrCRDform').classList.remove('show');

    const phoneNumbersString = phoneNumbers.length > 0 ? phoneNumbers.join('|') : null;
    const formData = {
        type: "EditDataChernigiv",
        DataId: objectId,
        edit_field: "phones",
        edit_values: phoneNumbersString
    };

    fetch('php_server_data/editdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch(data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    showAnimation('preloader');
                    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "addresses", table: "object", DataId: objectId } }));
                    showModalMessage('adrCRDtitle', 'info', data.message, 10000);
                    const addressColumn = document.querySelector(`.page_column[data-address-id="${objectId}"]`);
                    if (addressColumn) {
                        const phonesDiv = addressColumn.querySelector('.page_card_value[data-label="Телефон:"]');
                        if (phonesDiv) {
                            if (phoneNumbersString) {
                                phonesDiv.innerHTML = PhoneNumberformat(phoneNumbersString).replace(/\n/g, '<br>');
                            } else {
                                phonesDiv.innerHTML = getValueOrDefault(phoneNumbersString);
                            }
                            
                        }
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('adrCRDform').classList.add('show');
                    showModalMessage('adrCRDtitle', 'warning', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('adrCRDform').classList.add('show');
                    showModalMessage('adrCRDtitle', 'alert', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
        }


    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

function saveAddress_meters(objectId) {
    const editContainer = document.getElementById('addresses_meters-edit');
    const visibleMeters = editContainer.querySelectorAll('.address-meter-field:not([style*="display: none"])');
    let currentIds = Array.from(visibleMeters).map(meter => Number(meter.dataset.addressCardMetersId));
    const oldDataAttr = editContainer.querySelector('.address-new-meter').dataset.oldDataAddressCardMetersId;
    let oldIds = JSON.parse(oldDataAttr);
    if (currentIds.length === oldIds.length && currentIds.sort().every((val, index) => val === oldIds.sort()[index])) {
        showModalMessage('adrCRDtitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
        return;
    }
    document.getElementById('adrCRDform').classList.remove('show');

    let changes = [];
    currentIds.forEach(id => {
        if (!oldIds.includes(id)) {
            changes.push({ id: id, action: 'add' });
        }
    });
    oldIds.forEach(id => {
        if (!currentIds.includes(id)) {
            changes.push({ id: id, action: 'dell' });
        }
    });
    const formData = {
        type: "EditDataChernigiv",
        DataId: objectId,
        edit_field: "meters",
        edit_values: changes
    };
    fetch('php_server_data/editdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch(data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    showAnimation('preloader');
                    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "addresses", table: "object", DataId: objectId } }));
                    showModalMessage('adrCRDtitle', 'info', data.message, 10000);
                    const addressColumn = document.querySelector(`.page_column[data-address-id="${objectId}"]`);
                    if (addressColumn) {
                        const meterField = addressColumn.querySelector('.page_card_value[data-label="Лічильники:"]');
                        if (meterField) {
                            meterField.innerHTML = currentIds.length > 0 ? currentIds.length : getValueOrDefault(null);
                        }
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('adrCRDform').classList.add('show');
                    showModalMessage('adrCRDtitle', 'warning', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('adrCRDform').classList.add('show');
                    showModalMessage('adrCRDtitle', 'alert', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
        }


    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

function saveMeters_serviceType(objectId) {
    const container = document.getElementById('MetersForm');
    const fields = container.getElementsByClassName('meters-servisetype-field');
    let newValue = null;

    for (let field of fields) {
        const oldValue = field.getAttribute('data-old-value');
        const values = field.getElementsByClassName('meters-servisetype-value');

        if (values[0].classList.contains('active')) {
            newValue = '1';
        } else if (values[1].classList.contains('active')) {
            newValue = '2';
        }

        if (oldValue === newValue) {
            showModalMessage('MetersTitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
            return;
        }
    }
    document.getElementById('MetersForm').classList.remove('show');

    const formData = {
        type: "EditDataChernigiv",
        DataId: objectId,
        edit_field: "serviceType",
        edit_values: newValue
    };

    fetch('php_server_data/editdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch(data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    showAnimation('preloader');
                    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "meters", table: "object", DataId: objectId } }));
                    showModalMessage('MetersTitle', 'info', data.message, 10000);
                    const meterColumn = document.querySelector(`.page_column[data-meter-id="${objectId}"]`);
                    if (meterColumn) {
                        const serviceTypeDiv = meterColumn.querySelector('.page_card_value[data-label="Температура:"]');
                        if (serviceTypeDiv) {
                            if (newValue === '1') {
                                serviceTypeDiv.innerHTML = 'Холодний';
                            }
                            if (newValue === '2') {
                                serviceTypeDiv.innerHTML = 'Гарячий';
                            }
                        }
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('MetersForm').classList.add('show');
                    showModalMessage('MetersTitle', 'warning', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('MetersForm').classList.add('show');
                    showModalMessage('MetersTitle', 'alert', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

function saveMeters_value(objectId) {
    const meterEditContainer = document.getElementById('MetersForm');
    const input = meterEditContainer.querySelector('#meters_edit_value');
    const newValue = input.value.trim() === '' ? null : input.value.trim();
    const oldValue = input.getAttribute('data-old-value');
    const isOldValueEmpty = oldValue === '' || oldValue === null || oldValue === undefined;
    const isNewValueEmpty = newValue === null || newValue === undefined;
    if ((isOldValueEmpty && isNewValueEmpty) || oldValue === newValue) {
        showModalMessage('MetersTitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
        return;
    }
    document.getElementById('MetersForm').classList.remove('show');

    const formData = {
        type: "EditDataChernigiv",
        DataId: objectId,
        edit_field: "value",
        edit_values: newValue
    };
    
    fetch('php_server_data/editdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch(data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    showAnimation('preloader');
                    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "meters", table: "object", DataId: objectId } }));
                    showModalMessage('MetersTitle', 'info', data.message, 10000);
                    const meterColumn = document.querySelector(`.page_column[data-meter-id="${objectId}"]`);
                    if (meterColumn) {
                        const ValueDiv = meterColumn.querySelector('.page_card_value[data-label="Показники:"]');
                        ValueDiv.innerHTML = formatValue(newValue);
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('MetersForm').classList.add('show');
                    showModalMessage('MetersTitle', 'warning', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('MetersForm').classList.add('show');
                    showModalMessage('MetersTitle', 'alert', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
        }


    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

function saveMeters_location(objectId) {
    const container = document.getElementById('MetersForm');
    const fields = container.getElementsByClassName('meters-location-field');
    let newValue = null;

    for (let field of fields) {
        const oldValue = field.getAttribute('data-old-value');
        const values = field.getElementsByClassName('meters-location-value');
        for (let i = 0; i < values.length; i++) {
            if (values[i].classList.contains('active')) {
                newValue = locations[i];
                break;
            }
        }
        if (oldValue === newValue) {
            showModalMessage('MetersTitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
            return;
        }
    }
    document.getElementById('MetersForm').classList.remove('show');

    const formData = {
        type: "EditDataChernigiv",
        DataId: objectId,
        edit_field: "location",
        edit_values: newValue
    };

    fetch('php_server_data/editdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
        } 
        
        switch(data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    showAnimation('preloader');
                    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "meters", table: "object", DataId: objectId } }));
                    showModalMessage('MetersTitle', 'info', data.message, 10000);
                    const meterColumn = document.querySelector(`.page_column[data-meter-id="${objectId}"]`);
                    if (meterColumn) {
                        const locationDiv = meterColumn.querySelector('.page_card_value[data-label="Розташування:"]');
                        if (locationDiv) {
                            locationDiv.innerHTML = newValue;
                        }
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('MetersForm').classList.add('show');
                    showModalMessage('MetersTitle', 'warning', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('MetersForm').classList.add('show');
                    showModalMessage('MetersTitle', 'alert', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

function saveMeters_balanser(objectId) {
    const container = document.getElementById('MetersForm');
    const fields = container.getElementsByClassName('meters-balanser-field');
    let newValue = null;

    for (let field of fields) {
        const oldValue = field.getAttribute('data-old-value');
        const values = field.getElementsByClassName('meters-balanser-value');

        for (let i = 0; i < values.length; i++) {
            if (values[i].classList.contains('active')) {
                newValue = balansers[i];
                break;
            }
        }

        if (oldValue === newValue) {
            showModalMessage('MetersTitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
            return;
        }
    }
    document.getElementById('MetersForm').classList.remove('show');

    const formData = {
        type: "EditDataChernigiv",
        DataId: objectId,
        edit_field: "balanser",
        edit_values: newValue
    };

    fetch('php_server_data/editdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch(data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    showAnimation('preloader');
                    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "meters", table: "object", DataId: objectId } }));
                    showModalMessage('MetersTitle', 'info', data.message, 10000);
                    const meterColumn = document.querySelector(`.page_column[data-meter-id="${objectId}"]`);
                    if (meterColumn) {
                        const balanserDiv = meterColumn.querySelector('.page_card_value[data-label="Балансоутримувач:"]');
                        if (balanserDiv) {
                            balanserDiv.innerHTML = newValue;
                        }
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('MetersForm').classList.add('show');
                    showModalMessage('MetersTitle', 'warning', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('MetersForm').classList.add('show');
                    showModalMessage('MetersTitle', 'alert', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

function saveMeters_address(objectId) {
    const addressInput = document.getElementById('meters-new-adress-input');
    const newAddressId = addressInput.getAttribute('data-new-data-meters-card-address-id');
    const oldAddressId = addressInput.getAttribute('data-old-data-meters-card-address-id');
    if ((newAddressId === oldAddressId) || (addressInput.value.trim() === '' && !oldAddressId) || (addressInput.value.trim() != '' && !newAddressId && oldAddressId)) {
        showModalMessage('MetersTitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
        return;
    }
    document.getElementById('MetersForm').classList.remove('show');

    const formData = {
        type: "EditDataChernigiv",
        DataId: objectId,
        edit_field: "address",
        edit_values: newAddressId
    };

    fetch('php_server_data/editdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch(data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    showAnimation('preloader');
                    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "meters", table: "object", DataId: objectId } }));
                    showModalMessage('MetersTitle', 'info', data.message, 10000);
                    const meterColumn = document.querySelector(`.page_column[data-meter-id="${objectId}"]`);
                    if (meterColumn) {
                        const addressField = meterColumn.querySelector('.page_card_value[data-label="Адреса:"]');
                        const addressVal =addressInput.value;
                        const [firstPart, secondPart] = addressVal.split('буд.');
                        if (addressField) {
                            if (addressInput.value != '') {
                                addressField.innerHTML = `${firstPart.trim()}<br>буд. ${secondPart.trim()}`;
                            } else {
                                addressField.innerHTML = getValueOrDefault(null);
                            }
                            
                        }
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('MetersForm').classList.add('show');
                    showModalMessage('MetersTitle', 'warning', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('MetersForm').classList.add('show');
                    showModalMessage('MetersTitle', 'alert', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

function saveTasks_meters(objectId) {
    const editContainer = document.getElementById('tasks_meters-edit');
    const visibleMeters = editContainer.querySelectorAll('.address-meter-field:not([style*="display: none"])');
    
    // Фильтруем текущие значения: настоящие ID (числа) и заглушки
    let currentIds = Array.from(visibleMeters)
        .map(meter => meter.dataset.addressCardMetersId);

    // Приводим все идентификаторы к строкам, чтобы избежать ошибок
    currentIds = currentIds.map(id => String(id));

    // Разделяем на числовые ID и заглушки
    let currentNumericIds = currentIds
        .filter(id => !isNaN(id))  // Оставляем только числовые идентификаторы
        .map(id => Number(id));    // Приводим к числам

    let currentNonumberIds = currentIds.filter(id => id.startsWith('nonumber'));  // Заглушки

    // Получаем старые данные (учитываем и настоящие ID, и заглушки)
    const oldDataAttr = editContainer.querySelector('.address-new-meter').dataset.oldDataAddressCardMetersId;
    let oldIds = JSON.parse(oldDataAttr);

    // Приводим старые идентификаторы к строкам
    oldIds = oldIds.map(id => String(id));

    // Разделяем на числовые ID и заглушки
    let oldNumericIds = oldIds
        .filter(id => !isNaN(id))  // Оставляем только числовые идентификаторы
        .map(id => Number(id));    // Приводим к числам

    let oldNonumberIds = oldIds.filter(id => id.startsWith('nonumber'));  // Заглушки

    // Этап 1: Проверка числовых ID (реальные счетчики)
    const numericIdsChanged = currentNumericIds.length !== oldNumericIds.length ||
        currentNumericIds.sort().some((val, index) => val !== oldNumericIds.sort()[index]);

    // Этап 2: Проверка изменений в заглушках по количеству
    const nonumberIdsChanged = currentNonumberIds.length !== oldNonumberIds.length;

    // Если изменений не было ни в числовых ID, ни в заглушках
    if (!numericIdsChanged && !nonumberIdsChanged) {
        showModalMessage('TasksTitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
        return;
    }

    let changes = [];
    // Добавляем новые счетчики, если они появились (заглушки не добавляются)
    currentNumericIds.forEach(id => {
        if (!oldNumericIds.includes(id)) {
            changes.push({ id: id, action: 'add' });
        }
    });

    // Добавляем счетчики для удаления, включая заглушки, только если их нет в текущем наборе
    oldIds.forEach(id => {
        // Если старый ID (числовой или заглушка) не найден среди текущих, добавляем на удаление
        if (!currentIds.includes(id)) {
            changes.push({ id: id, action: 'dell' });
        }
    });

    // Проверка, не удалены ли все счетчики
    const allMeterBlocks = editContainer.querySelectorAll('.address-meter-field');
    const allHidden = Array.from(allMeterBlocks).every(meter => meter.style.display === 'none');

    if (allHidden) {
        showModalMessage('TasksTitle', 'alert', 'В заявці не можуть бути видалені всі лічильники.', 5000);
        return;
    }

    // Формируем данные для отправки
    document.getElementById('TasksForm').classList.remove('show');
    const formData = {
        type: "EditDataChernigiv",
        DataId: objectId,
        edit_field: "task_meters",
        edit_values: changes
    };

    fetch('php_server_data/editdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch(data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    showAnimation('preloader');
                    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "object", DataId: objectId } }));
                    showModalMessage('TasksTitle', 'info', data.message, 10000);
                    const routeWorker = document.querySelector('#route-top-bar .active');
                    if (!routeWorker) {
                        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "route",criteria: { worker: null, address: [] } } }));
                    } else {
                        const routeWorkerName = routeWorker.textContent;
                        const routeCurrentDateBlock = document.getElementById('current-date-block');
                        const routeCurrentDate = routeCurrentDateBlock.getAttribute('data-curr-work-date');
                        const routeCriteria = { brigade: routeWorkerName, select_date: routeCurrentDate };
                        const filter_coocie_result = checkFilterCookie(true);
                        let address_criteria = [];
                        if (filter_coocie_result.filter_cookie) {
                            address_criteria = JSON.parse(filter_coocie_result.value);
                        }
                        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "route", criteria: { worker: routeCriteria, address: address_criteria } } }));
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('TasksForm').classList.add('show');
                    showModalMessage('TasksTitle', 'warning', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('TasksForm').classList.add('show');
                    showModalMessage('TasksTitle', 'alert', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

function saveTasks_brigade(objectId) {
    const container = document.getElementById('TasksForm');
    const fields = container.getElementsByClassName('tasks-brigade-field');
    let newValue = null;

    for (let field of fields) {
        const oldValue = field.getAttribute('data-old-value');
        const values = field.getElementsByClassName('tasks-brigade-value');
        for (let i = 0; i < values.length; i++) {
            if (values[i].classList.contains('active')) {
                if (values[i].innerText === "ВІДСУТНІЙ") {
                    newValue = null;
                } else if (workers[i] !== undefined) {
                    newValue = workers[i];
                }
                break;
            }
        }
        if (oldValue === newValue || (oldValue === 'null' && newValue === null)) {
            showModalMessage('TasksTitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
            return;
        }
    }
    document.getElementById('TasksForm').classList.remove('show');

    const formData = {
        type: "EditDataChernigiv",
        DataId: objectId,
        edit_field: "brigade",
        edit_values: newValue
    };

    fetch('php_server_data/editdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch(data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    showAnimation('preloader');
                    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "object", DataId: objectId } }));
                    showModalMessage('TasksTitle', 'info', data.message, 10000);
                    const routeWorker = document.querySelector('#route-top-bar .active');
                    if (!routeWorker) {
                        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "route",criteria: { worker: null, address: [] } } }));
                    } else {
                        const routeWorkerName = routeWorker.textContent;
                        const routeCurrentDateBlock = document.getElementById('current-date-block');
                        const routeCurrentDate = routeCurrentDateBlock.getAttribute('data-curr-work-date');
                        const routeCriteria = { worker: routeWorkerName, work_date: routeCurrentDate };
                        const filter_coocie_result = checkFilterCookie(true);
                        let address_criteria = [];
                        if (filter_coocie_result.filter_cookie) {
                            address_criteria = JSON.parse(filter_coocie_result.value);
                        }
                        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "route", criteria: { worker: routeCriteria, address: address_criteria } } }));
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('TasksForm').classList.add('show');
                    showModalMessage('TasksTitle', 'warning', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('TasksForm').classList.add('show');
                    showModalMessage('TasksTitle', 'alert', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

function saveTasks_cost(objectId) {
    const taskEditContainer = document.getElementById('TasksForm');
    const input = taskEditContainer.querySelector('#tasks_edit_cost');
    const newValue = input.value.trim() === '' ? null : input.value.trim();
    const oldValue = input.getAttribute('data-old-value');
    const isOldValueEmpty = oldValue === '' || oldValue === null || oldValue === undefined;
    const isNewValueEmpty = newValue === null || newValue === undefined;
    if ((isOldValueEmpty && isNewValueEmpty) || oldValue === newValue) {
        showModalMessage('TasksTitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
        return;
    }
    document.getElementById('TasksForm').classList.remove('show');

    const formData = {
        type: "EditDataChernigiv",
        DataId: objectId,
        edit_field: "cost",
        edit_values: newValue
    };

    fetch('php_server_data/editdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch(data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    showAnimation('preloader');
                    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "tasks", table: "object", DataId: objectId } }));
                    showModalMessage('TasksTitle', 'info', data.message, 10000);
                    const taskColumn = document.querySelector(`.page_column[data-task-id="${objectId}"]`);
                    if (taskColumn) {
                        const costDiv = taskColumn.querySelector('.page_card_value[data-label="Вартість:"]');
                        if (costDiv) {
                            costDiv.innerHTML = newValue !== null ? formatCost(parseFloat(newValue)) : getValueOrDefault(newValue);
                        }
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('TasksForm').classList.add('show');
                    showModalMessage('TasksTitle', 'warning', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('TasksForm').classList.add('show');
                    showModalMessage('TasksTitle', 'alert', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

function saveTasks_payMethod(objectId) {
    const container = document.getElementById('TasksForm');
    const fields = container.getElementsByClassName('tasks-pay_methods-field');
    let newValue = null;

    for (let field of fields) {
        const oldValue = field.getAttribute('data-old-value');
        const values = field.getElementsByClassName('tasks-pay_methods-value');

        for (let i = 0; i < values.length; i++) {
            if (values[i].classList.contains('active')) {
                newValue = pay_methods[i];
                break;
            }
        }

        if (oldValue === newValue) {
            showModalMessage('TasksTitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
            return;
        }
    }
    document.getElementById('TasksForm').classList.remove('show');

    const formData = {
        type: "EditDataChernigiv",
        DataId: objectId,
        edit_field: "pay_method",
        edit_values: newValue
    };

    fetch('php_server_data/editdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch(data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    showAnimation('preloader');
                    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "tasks", table: "object", DataId: objectId } }));
                    showModalMessage('TasksTitle', 'info', data.message, 10000);
                    const taskColumn = document.querySelector(`.page_column[data-task-id="${objectId}"]`);
                    if (taskColumn) {
                        const payMethodDiv = taskColumn.querySelector('.page_card_value[data-label="Спосіб оплати:"]');
                        if (payMethodDiv) {
                            payMethodDiv.innerHTML = newValue !== null ? newValue : getValueOrDefault(newValue);
                        }
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('TasksForm').classList.add('show');
                    showModalMessage('TasksTitle', 'warning', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('TasksForm').classList.add('show');
                    showModalMessage('TasksTitle', 'alert', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

function saveTasks_note(objectId) {
    const noteEditContainer = document.getElementById('tasks_note-edit');
    const textarea = noteEditContainer.querySelector('textarea');
    const note = textarea.value.trim() === '' ? null : textarea.value.trim();
    const oldNote = textarea.getAttribute('data-old-value');
    const isOldNoteEmpty = oldNote === '' || oldNote === null || oldNote === undefined;
    const isNoteEmpty = note === null || note === undefined;

    if ((isOldNoteEmpty && isNoteEmpty) || oldNote === note) {
        showModalMessage('TasksTitle', 'warning', 'Значення не змінювалось. Операцію припинено.', 5000);
        return;
    }
    document.getElementById('TasksForm').classList.remove('show');

    const formData = {
        type: "EditDataChernigiv",
        DataId: objectId,
        edit_field: "note",
        edit_values: note
    };
    
    fetch('php_server_data/editdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch(data.status) {
            case 'success':
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    showAnimation('preloader');
                    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "tasks", table: "object", DataId: objectId } }));

                    const routeWorker = document.querySelector('#route-top-bar .active');
                    if (!routeWorker) {
                        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "route",criteria: { worker: null, address: [] } } }));
                    } else {
                        const routeWorkerName = routeWorker.textContent;
                        const routeCurrentDateBlock = document.getElementById('current-date-block');
                        const routeCurrentDate = routeCurrentDateBlock.getAttribute('data-curr-work-date');
                        const routeCriteria = { brigade: routeWorkerName, select_date: routeCurrentDate };
                        const filter_coocie_result = checkFilterCookie(true);
                        let address_criteria = [];
                        if (filter_coocie_result.filter_cookie) {
                            address_criteria = JSON.parse(filter_coocie_result.value);
                        }
                        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "route", criteria: { worker: routeCriteria, address: address_criteria } } }));
                    }

                    showModalMessage('TasksTitle', 'info', data.message, 10000);
                    const taskColumn = document.querySelector(`.page_column[data-task-id="${objectId}"]`);
                    if (taskColumn) {
                        const noteDiv = taskColumn.querySelector('.page_card_value[data-label="Примітки:"]');
                        if (noteDiv) {
                            noteDiv.innerHTML = getValueOrDefault(note);
                        }
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('TasksForm').classList.add('show');
                    showModalMessage('TasksTitle', 'warning', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                setTimeout(() => {
                    document.getElementById('TasksForm').classList.add('show');
                    showModalMessage('TasksTitle', 'alert', data.message, 10000);
                    hideAnimation();
                }, animation_time);
                break;
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

// ========== Додавання нових об'єктів ==========
// ========== Додавання нової адреси ==========
let NewADREscClose;
function openAddNewADRForm() {
    openPopupsCount++;
    var AddNewADR = document.getElementById("AddNewADR");
    AddNewADR.style.zIndex = baseIndex + openPopupsCount;
    AddNewADR.style.display = "block";
    setTimeout(function() {
        AddNewADR.classList.add("show");
    }, 10);

    let streetInput = document.getElementById('street');
    if (streetInput) {
        streetInput.focusHandler = function() {
            updateStreetAutocomplete(streetInput);
        };
        streetInput.inputHandler = function() {
            updateStreetAutocomplete(streetInput);
        };
        streetInput.addEventListener('focus', streetInput.focusHandler);
        streetInput.addEventListener('input', streetInput.inputHandler);
    }

    let inputs = AddNewADR.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', clearFieldError);
    });

    document.addEventListener('click', outsideClickListener);

    NewADREscClose = createOnKeydownWrapper('closeAddNewADRForm');
    document.addEventListener('keydown', NewADREscClose);

    addPhoneField('addNewADR');
    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "addresses", table: "streets" } }));
}

function closeAddNewADRForm() {
    var AddNewADR = document.getElementById("AddNewADR");
    AddNewADR.classList.remove("show");

    if (NewADREscClose) {
        document.removeEventListener('keydown', NewADREscClose);
        NewADREscClose = null;
    }

    setTimeout(function() {
        AddNewADR.style.display = "none";
        var inputs = AddNewADR.querySelectorAll('input');
        inputs.forEach(input => {
            input.removeEventListener('focus', input.focusHandler);
            input.removeEventListener('input', input.inputHandler);
            input.removeEventListener('input', clearFieldError);
            input.value = '';
        });

        let autocompletePopup = document.getElementById('street-autocomplete');
        if (autocompletePopup) {
            autocompletePopup.innerHTML = '';
            autocompletePopup.style.display = 'none';
        }

        clearAllErrors();
        document.removeEventListener('click', outsideClickListener);

        var phoneFieldContainer = document.querySelector('.phone-field-container');
        var phoneFieldDivs = phoneFieldContainer.getElementsByClassName('phoneField');
        while (phoneFieldDivs.length > 0) {
            phoneFieldContainer.removeChild(phoneFieldDivs[phoneFieldDivs.length - 1]);
        }

        document.querySelector('#phoneFields .button-container .remove-button').style.display = 'none';

        const temporaryMessage = AddNewADR.querySelector('[data-temporary-block-message]');
        if (temporaryMessage) {
            temporaryMessage.remove();
        }
    }, 300);
}
window.closeAddNewADRForm = closeAddNewADRForm;

function outsideClickListener(event) {
    let streetInput = document.getElementById('street');
    let autocompletePopup = document.getElementById('street-autocomplete');
    if (!streetInput.contains(event.target) && !autocompletePopup.contains(event.target)) {
        autocompletePopup.style.display = 'none';
    }
}

function clearFieldError(event) {
    let input = event.target;
    input.classList.remove('error-field');
    let errorMsg = input.parentNode.querySelector('.error-message');
    if (errorMsg) {
        errorMsg.remove();
    }
}

function clearAllErrors() {
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(msg => msg.remove());

    const errorFields = document.querySelectorAll('.error-field');
    errorFields.forEach(field => field.classList.remove('error-field'));
}

window.addPhoneField = function(context) {
    switch(context) {
        case 'addNewADR':
            var phoneFieldContainer = document.querySelector('.phone-field-container');
            var phoneFieldDivs = phoneFieldContainer.getElementsByClassName('phoneField');

            // Проверяем количество существующих блоков
            if (phoneFieldDivs.length >= 5) {
                break;
            }

            var newPhoneField = document.createElement('div');
            newPhoneField.className = 'phoneField';

            var select = document.createElement('select');
            for (var i = 0; i < phoneSufixArea.length; i++) {
                var option = document.createElement('option');
                option.value = phoneSufixArea[i];
                option.textContent = phoneSufixArea[i];
                select.appendChild(option);
            }
            newPhoneField.appendChild(select);

            var input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'xxx-xx-xx';
            input.oninput = function() { window.formatPhoneNumber(this); };
            newPhoneField.appendChild(input);
            input.addEventListener('input', clearFieldError);
            input.className = 'optional normal-field';

            select.onchange = function() {
                input.placeholder = this.value === '0462' ? 'xx-xx-xx' : 'xxx-xx-xx';
                window.formatPhoneNumber(input);
            };

            phoneFieldContainer.appendChild(newPhoneField);
            const phoneButtonContainer = document.querySelector('#phoneFields .button-container');
            var removeButton = phoneButtonContainer.querySelector('.remove-button');
            if (phoneFieldDivs.length > 1) {
                removeButton.style.display = '';
            }

            var addButton = phoneButtonContainer.querySelector('.add-button');
            if (phoneFieldDivs.length >= 5) {
                addButton.style.display = 'none';
            }
            select.onchange();
            break;
        case 'ADR_Card':
            var phoneFieldContainer = document.querySelector('.edit-fields');
            var phoneFieldDivs = phoneFieldContainer.getElementsByClassName('phone-edit-field');

            if (phoneFieldDivs.length >= 5) {
                break;
            }
        
            var newPhoneField = document.createElement('div');
            newPhoneField.className = 'phone-edit-field';
        
            var select = document.createElement('select');
            for (var i = 0; i < phoneSufixArea.length; i++) {
                var option = document.createElement('option');
                option.value = phoneSufixArea[i];
                option.textContent = phoneSufixArea[i];
                select.appendChild(option);
            }
            newPhoneField.appendChild(select);
        
            var input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'xxx-xx-xx';
            input.oninput = function() { window.formatPhoneNumber(this); };
            newPhoneField.appendChild(input);
            input.addEventListener('input', clearFieldError);
        
            select.onchange = function() {
                input.placeholder = this.value === '0462' ? 'xx-xx-xx' : 'xxx-xx-xx';
                window.formatPhoneNumber(input);
            };
        
            // Находим блок кнопок и вставляем перед ним новый блок
            var buttonContainer = phoneFieldContainer.querySelector('.button-container');
            phoneFieldContainer.insertBefore(newPhoneField, buttonContainer);
        
            var removeButton = phoneFieldContainer.querySelector('.remove-button');
            if (phoneFieldDivs.length > 1) {
                removeButton.style.display = '';
            }

            var addButton = phoneFieldContainer.querySelector('.add-button');
            if (phoneFieldDivs.length >= 5) {
                addButton.style.display = 'none';
            }
            select.onchange();
            break;
        case 'addNewTask':
            var phoneFieldContainer = document.querySelector('.phones-selection');
            var phoneFieldDivs = phoneFieldContainer.getElementsByClassName('phone-edit-field');

            if (phoneFieldDivs.length >= 5) {
                break;
            }
        
            var newPhoneField = document.createElement('div');
            newPhoneField.className = 'phone-edit-field';
        
            var select = document.createElement('select');
            for (var i = 0; i < phoneSufixArea.length; i++) {
                var option = document.createElement('option');
                option.value = phoneSufixArea[i];
                option.textContent = phoneSufixArea[i];
                select.appendChild(option);
            }
            newPhoneField.appendChild(select);
        
            var input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'xxx-xx-xx';
            input.oninput = function() { window.formatPhoneNumber(this); };
            newPhoneField.appendChild(input);
            input.addEventListener('input', clearFieldError);
        
            select.onchange = function() {
                input.placeholder = this.value === '0462' ? 'xx-xx-xx' : 'xxx-xx-xx';
                window.formatPhoneNumber(input);
            };
        
            // Находим блок кнопок и вставляем перед ним новый блок
            var buttonContainer = phoneFieldContainer.querySelector('.button-container');
            phoneFieldContainer.insertBefore(newPhoneField, buttonContainer);
        
            var removeButton = phoneFieldContainer.querySelector('.remove-button');
            if (phoneFieldDivs.length > 1) {
                removeButton.style.display = '';
            }

            var addButton = phoneFieldContainer.querySelector('.add-button');
            if (phoneFieldDivs.length >= 5) {
                addButton.style.display = 'none';
            }
            select.onchange();
            break;
        default:
            console.warn('Unknown variable for addPhoneField function: ' + context);
            break;
    }
};

window.removePhoneField = function(context) {
    switch(context) {
        case 'addNewADR':
            var phoneFieldContainer = document.querySelector('.phone-field-container');
            var phoneFieldDivs = phoneFieldContainer.getElementsByClassName('phoneField');
        
            if (phoneFieldDivs.length > 1) {
                phoneFieldContainer.removeChild(phoneFieldDivs[phoneFieldDivs.length - 1]);
            }
        
            const phoneButtonContainer = document.querySelector('#phoneFields .button-container');
            var removeButton = phoneButtonContainer.querySelector('.remove-button');
            if (phoneFieldDivs.length === 1) {
                removeButton.style.display = 'none';
            }
        
            var addButton = phoneButtonContainer.querySelector('.add-button');
            if (phoneFieldDivs.length < 5) {
                addButton.style.display = '';
            }
            break;
        case 'ADR_Card':
            var phoneFieldContainer = document.querySelector('.edit-fields');
            var phoneFieldDivs = phoneFieldContainer.getElementsByClassName('phone-edit-field');
        
            if (phoneFieldDivs.length > 1) {
                phoneFieldContainer.removeChild(phoneFieldDivs[phoneFieldDivs.length - 1]);
            }
        
            var removeButton = phoneFieldContainer.querySelector('.remove-button');
            if (phoneFieldDivs.length === 1) {
                removeButton.style.display = 'none';
            }
        
            var addButton = phoneFieldContainer.querySelector('.add-button');
            if (phoneFieldDivs.length < 5) {
                addButton.style.display = '';
            }
            break;
        case 'addNewTask':
            var phoneFieldContainer = document.querySelector('.phones-selection');
            var phoneFieldDivs = phoneFieldContainer.getElementsByClassName('phone-edit-field');
        
            if (phoneFieldDivs.length > 1) {
                phoneFieldContainer.removeChild(phoneFieldDivs[phoneFieldDivs.length - 1]);
            }
        
            var removeButton = phoneFieldContainer.querySelector('.remove-button');
            if (phoneFieldDivs.length === 1) {
                removeButton.style.display = 'none';
            }
        
            var addButton = phoneFieldContainer.querySelector('.add-button');
            if (phoneFieldDivs.length < 5) {
                addButton.style.display = '';
            }
            break;
        default:
            console.log('Unknown variable for removePhoneField function: ' + context);
            break;
    }
};

window.formatPhoneNumber = function(input) {
    var prefix = input.previousElementSibling.value;
    var numbers = input.value.replace(/\D/g, '');
    var char = {};

    if (prefix === '0462') {
        char = {2: '-', 4: '-'};
    } else {
        char = {3: '-', 5: '-'};
    }

    var phoneNumber = '';
    for (var i = 0; i < numbers.length; i++) {
        phoneNumber += (char[i] || '') + numbers[i];
    }

    var maxLength = prefix === '0462' ? 8 : 9;
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
    let autocompletePopup = document.getElementById('street-autocomplete');
    autocompletePopup.innerHTML = '';
    autocompletePopup.style.display = 'block';

    let searchTerms = inputValue.split(' ').filter(term => term.length > 0);

    let filteredStreets = streetsFromDB.filter(street => {
        let streetName = street.street.toLowerCase();
        return searchTerms.every(term => streetName.includes(term));
    });

    if (filteredStreets.length === 0) {
        let noMatchDiv = document.createElement("div");
        noMatchDiv.textContent = "Збігів не знайдено";
        noMatchDiv.className = 'not-selectable';
        autocompletePopup.appendChild(noMatchDiv);
    } else {
        filteredStreets.forEach(street => {
            let listItem = document.createElement("div");
            listItem.className = 'autocomplete-item';
            
            let newStreetName = document.createElement("div");
            newStreetName.innerHTML = highlightMatch(street.street.split(' (')[0], inputValue);
            listItem.appendChild(newStreetName);

            if (street.street.includes('(')) {
                let oldStreetName = document.createElement("div");
                oldStreetName.innerHTML = highlightMatch('(' + street.street.split(' (')[1], inputValue);
                oldStreetName.className = 'old-street-name';
                listItem.appendChild(oldStreetName);
            }

            listItem.addEventListener("click", function() {
                inputElement.value = street.street;
                autocompletePopup.style.display = 'none';
                clearFieldError({ target: inputElement });
            });

            autocompletePopup.appendChild(listItem);
        });
    }
}

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

    const streetInput = document.querySelector('input[placeholder="Вулиця"]');
    const streetName = streetInput.value.trim();
    const streetId = getStreetIdByName(streetName);
    if (!streetName || streetId === null) {
        showError(streetInput, "Дані відсутні або введені некорректно");
        isValid = false;
    }
    const buildingInput = document.querySelector('input[placeholder="Будинок"]');
    const buildingValue = buildingInput.value.trim();
    if (!buildingValue) {
        showError(buildingInput, "Дані відсутні або введені некорректно");
        isValid = false;
    } else if (!/^\d+$/.test(buildingValue)) {
        showError(buildingInput, "Номер будинку може містити тільки цифри");
        isValid = false;
    }
    const apartmentInput = document.querySelector('input[placeholder="Квартира"]');
    const privateSectorCheckbox = document.querySelector('#newADRnoflat');
    if (privateSectorCheckbox.checked) {
        apartmentInput.value = 'п/сектор';
    } else {
        if (!apartmentInput.value.trim()) {
            showError(apartmentInput, "Дані відсутні або введені некорректно");
            isValid = false;
        }
    }
    const phoneFields = document.querySelectorAll('.phoneField input[type="text"]');
    for (let i = 0; i < phoneFields.length; i++) {
        const select = phoneFields[i].previousElementSibling;
        const suffix = select.value;
        if (phoneFields[i].value && !validatePhoneNumber(phoneFields[i].value, suffix)) {
            showError(phoneFields[i], "Дані відсутні або введені некорректно");
            isValid = false;
        }
    }
    return isValid;
}

function getStreetIdByName(name) {
    const street = streetsFromDB.find(s => s.street === name);
    return street ? street.ID : null;
}

function validatePhoneNumber(number, suffix) {
    const pattern = suffix.length === 4 ? /^\d{2}-\d{2}-\d{2}$/ : /^\d{3}-\d{2}-\d{2}$/;
    return pattern.test(number);
}

function submitFormData() {
    const streetName = document.getElementById('street').value.trim();
    const street = streetsFromDB.find(s => s.street.trim() === streetName);
    const adrStreetId = street ? street.ID : null;
    const adrBuilding = document.querySelector('input[placeholder="Будинок"]').value.trim();
    const adrBuilding2Input = document.querySelector('input[placeholder="Корпус"]');
    const adrBuilding2 = adrBuilding2Input && adrBuilding2Input.value.trim() !== '' ? adrBuilding2Input.value.trim() : null;
    const adrFlOf = document.querySelector('input[placeholder="Квартира"]').value.trim();
    const FMLvalue = document.querySelector('input[placeholder="ФІО споживача"]').value.trim() || null;
    const phoneFields = document.getElementsByClassName('phoneField');
    let phones = [];
    for (const field of phoneFields) {
        const phoneCode = field.querySelector('select').value;
        const phoneNumber = field.querySelector('input[type="text"]').value.replace(/\D/g, '');
        if (phoneNumber.length === 7) {
            phones.push(phoneCode + phoneNumber);
        }
        if (phoneCode === '0462' && phoneNumber.length === 6) {
            phones.push(phoneNumber);
        }
    }
    let phone = null;
    if(phones.length > 0) {
        phone = phones.join('|');
    }

    const formData = {
        type: "NewAddressChernigiv",
        adrStreetId,
        adrBuilding,
        adrBuilding2,
        adrFlOf,
        FMLvalue,
        phone
    };

    fetch('php_server_data/addnewdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch (data.status) {
            case 'success':
                let korp = '';
                let flat = '';
                let phoneformaned_phone = '';
                let owner = '';
                if (adrBuilding2 && adrBuilding2 !== '0') {
                    korp = `, корп. ${adrBuilding2}`;
                }
                if (adrFlOf === 'п/сектор') {
                    flat = `${adrFlOf}`;
                } else {
                    flat = `кв. ${adrFlOf}`;
                }
                if (phone) {
                    let formattedPhone = PhoneNumberformat(phone);
                    formattedPhone = formattedPhone.replace(/\n/g, ' ');
                    phoneformaned_phone = `, тел. ${formattedPhone}`;
                }
                if (FMLvalue) {
                    owner = `, споживач ${FMLvalue}`;
                }
                logMessage('database', 'NewDATA', '[INFO]', `Нова адреса ${streetName}, буд. ${adrBuilding}${korp}, ${flat}${phoneformaned_phone}${owner} додана до БД користувачем [${data.user}].`);
                showAnimation('confirm', null, animation_time/1000);
                closeAddNewADRForm();
                setTimeout(() => {
                    hideAnimation();
                    const AddNewMeter = document.getElementById("AddNewMeter");
                    const MetersForm = document.getElementById("MetersForm");
                    const AddNewTask = document.getElementById("AddNewTask");



                    const newADRid = data.newADRid;
                    let newAddress;
                    switch (true) {
                        case AddNewMeter && AddNewMeter.style.display === "block":
                            const newADRinput = document.getElementById('meter_address');
                            if (adrBuilding2 === '0' || adrBuilding2 === null || adrBuilding2 === undefined) {
                                newAddress = `${streetName} буд. ${adrBuilding}, кв. ${adrFlOf}`;
                            } else {
                                newAddress = `${streetName} буд. ${adrBuilding} корп. ${adrBuilding2}, кв. ${adrFlOf}`;
                            }
                            newADRinput.value = newAddress;
                            newADRinput.dataset.selectedId = newADRid;
                            sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "meters", table: "addresses" } }));
                            break;
                        case MetersForm && MetersForm.classList.contains("show"):
                            const editADRinput = document.getElementById('meters-new-adress-input');
                            if (adrBuilding2 === '0' || adrBuilding2 === null || adrBuilding2 === undefined) {
                                newAddress = `${streetName} буд. ${adrBuilding}, кв. ${adrFlOf}`;
                            } else {
                                newAddress = `${streetName} буд. ${adrBuilding} корп. ${adrBuilding2}, кв. ${adrFlOf}`;
                            }
                            editADRinput.value = newAddress;
                            editADRinput.setAttribute('data-new-data-meters-card-address-id', newADRid);
                            sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "meters", table: "addresses_edit" } }));
                            break;
                        case AddNewTask && AddNewTask.classList.contains("show"):
                            const filterCriteria = `${streetName} ${adrBuilding} ${adrFlOf}`;
                            sendWebSocketMessage(JSON.stringify({ 
                                action: "chernigiv", 
                                parameters: { 
                                    page: "route", 
                                    table: "addresses", 
                                    criteria: filterCriteria 
                                }
                            }));
                            
                            const taskAddressInput = document.getElementById('tasks_address');
                            taskAddressInput.value = filterCriteria;
                            taskAddressInput.dataset.selectedId = newADRid;
                            taskAddressInput.focus();
                            taskAddressInput.click();
                            break;
                        default:
                            sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "addresses", table: "addresses" } }));
                            showAnimation('preloader');
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                document.getElementById('street').value = '';
                document.querySelector('input[placeholder="Будинок"]').value = '';
                document.querySelector('input[placeholder="Корпус"]').value = '';
                document.querySelector('input[placeholder="Квартира"]').value = '';
                document.querySelector('input[placeholder="ФІО споживача"]').value = '';
                const phoneFields = document.querySelectorAll('.phoneField');
                if (phoneFields.length > 0) {
                    phoneFields.forEach((field, index) => {
                        if (index === 0) {
                            field.querySelector('input[type="text"]').value = '';
                        } else {
                            field.remove();
                        }
                    });
                }
                setTimeout(() => {
                    hideAnimation();
                    showModalMessage('add_address_title', 'warning', data.message, 10000);
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                document.getElementById('street').value = '';
                document.querySelector('input[placeholder="Будинок"]').value = '';
                document.querySelector('input[placeholder="Корпус"]').value = '';
                document.querySelector('input[placeholder="Квартира"]').value = '';
                document.querySelector('input[placeholder="ФІО споживача"]').value = '';
                const phoneFields2 = document.querySelectorAll('.phoneField');
                if (phoneFields2.length > 0) {
                    phoneFields2.forEach((field, index) => {
                        if (index === 0) {
                            field.querySelector('input[type="text"]').value = '';
                        } else {
                            field.remove();
                        }
                    });
                }
                setTimeout(() => {
                    hideAnimation();
                    showModalMessage('add_address_title', 'alert', data.message, 10000);
                }, animation_time);
                break;
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

// ========== Додавання нового лічильника ==========
let NewMeterEscClose;
let addressInputChanged = false;
function openAddNewMeterForm() {
    openPopupsCount++;
    var AddNewMeter = document.getElementById("AddNewMeter");
    AddNewMeter.style.zIndex = baseIndex + openPopupsCount;
    AddNewMeter.style.display = "block";
    setTimeout(function() {
        AddNewMeter.classList.add("show");
    }, 10);

    let meterAddressInput = document.getElementById('meter_address');
    if (meterAddressInput) {
        meterAddressInput.focusHandler = function() {
            addressInputChanged = false;
            displayNewMeterPopup(meterAddressInput, meterAddressInput.value, true);
        };
        meterAddressInput.inputHandler = function() {
            addressInputChanged = true;
            displayNewMeterPopup(meterAddressInput, meterAddressInput.value);
        };
        meterAddressInput.addEventListener('focus', meterAddressInput.focusHandler);
        meterAddressInput.addEventListener('input', meterAddressInput.inputHandler);
    }

    let inputs = AddNewMeter.querySelectorAll('input[type="text"], input[type="number"]');
    inputs.forEach(input => {
        if (input.id !== 'meter_address') {
            input.focusHandler = function() { displayNewMeterPopup(input, input.value, true); };
            input.inputHandler = function() {
                displayNewMeterPopup(input, input.value);
                hideError(input);
            };
            input.addEventListener('focus', input.focusHandler);
            input.addEventListener('input', input.inputHandler);
        }
    });

    document.addEventListener('click', clickOutsideHandler);
 
    NewMeterEscClose = createOnKeydownWrapper('closeAddNewMeterForm');
    document.addEventListener('keydown', NewMeterEscClose);

    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "meters", table: "meter_types" } }));
    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "meters", table: "addresses" } }));
    prepareProdDateData();
}

function closeAddNewMeterForm() {
    var AddNewMeter = document.getElementById("AddNewMeter");
    AddNewMeter.classList.remove("show");

    if (NewMeterEscClose) {
        document.removeEventListener('keydown', NewMeterEscClose);
        NewMeterEscClose = null;
    }

    setTimeout(function() {
        AddNewMeter.style.display = "none";

        var inputs = AddNewMeter.querySelectorAll('input[type="text"], input[type="number"]');
        inputs.forEach(input => {
            input.removeEventListener('focus', input.focusHandler);
            input.removeEventListener('input', input.inputHandler);
            input.value = '';
            delete input.dataset.selectedId;
        });

        var selects = AddNewMeter.querySelectorAll('select');
        selects.forEach(select => {
            select.selectedIndex = 0;
        });

        autocompleteData.meter_type_name = [];
        autocompleteData.meter_address = [];
        autocompleteData.prod_date = [];

        let popups = AddNewMeter.querySelectorAll('.autocomplete-list');
        popups.forEach(popup => {
            popup.style.display = 'none';
            popup.innerHTML = '';
        });

        clearMeterValidationErrors();
        document.removeEventListener('click', clickOutsideHandler);

        const temporaryMessage = AddNewMeter.querySelector('[data-temporary-block-message]');
        if (temporaryMessage) {
            temporaryMessage.remove();
        }
    }, 300);
}
window.closeAddNewMeterForm = closeAddNewMeterForm;

function clickOutsideHandler(event) {
    let popups = document.querySelectorAll('.autocomplete-list');
    let isClickInsideAnyPopup = false;

    popups.forEach(popup => {
        if (popup.contains(event.target)) {
            isClickInsideAnyPopup = true;
        } else if (popup.previousElementSibling && popup.previousElementSibling.contains(event.target)) {
            isClickInsideAnyPopup = true;
        } else {
            popup.style.display = 'none';
        }
    });
}

function prepareProdDateData() {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 1990; year--) {
        autocompleteData.prod_date.push(year.toString());
    }
}

function displayNewMeterPopup(input, filterText = "", showPopup = false) {
    const popup = document.getElementById(`${input.id}-autocomplete`);
    let data = autocompleteData[input.id];
    if (input.id === 'meter_address' && addressInputChanged && filterText) {
        sendWebSocketMessage(JSON.stringify({ 
            action: "chernigiv", 
            parameters: { 
                page: "meters", 
                table: "addresses", 
                criteria: filterText 
            } 
        }));
        addressInputChanged = false;
    }
    if (data) {
        popup.innerHTML = '';
        let filterParts = filterText.toLowerCase().split(' ').filter(Boolean);
        let filteredData = data.filter(item => {
            let itemText = typeof item === 'object' ? item.text.toLowerCase() : item.toLowerCase();
            return filterParts.every(part => itemText.includes(part));
        });
        if (filteredData.length === 0) {
            let notFoundDiv = document.createElement('div');
            notFoundDiv.textContent = "ЕЛЕМЕНТ НЕ ЗНАЙДЕНО";
            notFoundDiv.className = 'autocomplete-item not-selectable';
            popup.appendChild(notFoundDiv);
        } else {
            filteredData.forEach(item => {
                let div = document.createElement('div');
                div.className = 'autocomplete-item';
                if (typeof item === 'object' && item.text && item.id) {
                    div.innerHTML = highlightMatch(item.text, filterText);
                    div.onclick = function() {
                        input.value = item.text;
                        input.dataset.selectedId = item.id;
                        popup.style.display = 'none';
                        hideError(input);
                    };
                } else {
                    div.innerHTML = highlightMatch(item, filterText);
                    div.onclick = function() {
                        input.value = item;
                        popup.style.display = 'none';
                        hideError(input);
                    };
                }
                popup.appendChild(div);
            });
        }
        if (showPopup) {
            popup.style.display = 'block';
        }
    }
}

window.saveNewMeter = function() {
    if (validateMeterFormData()) {
        submitMeterFormData();
    } else {
        console.log("Форма заповнена некоректно.");
    }
};

function validateMeterFormData() {
    let isValid = true;
    clearMeterValidationErrors();
    const numberInput = document.getElementById('number');
    const number = numberInput.value.trim();
    if (!number) {
        showError(numberInput, "Поле номера не може бути пустим");
        isValid = false;
    } else if (!/^[0-9 .]+$/.test(number)) {
        showError(numberInput, "Номер може містити тільки цифри, пробіли та точки");
        isValid = false;
    }
    const meterTypeInput = document.getElementById('meter_type_name');
    const meterTypeName = meterTypeInput.value.trim();
    const meterTypeNames = autocompleteData.meter_type_name.map(item => item ? item.text : null).filter(text => text !== null);
    if (!meterTypeNames.includes(meterTypeName)) {
        showError(meterTypeInput, "Дані відсутні або введені некорректно");
        isValid = false;
    }
    const prodDateInput = document.getElementById('prod_date');
    const prodDate = prodDateInput.value.trim();
    if (!autocompleteData.prod_date.includes(prodDate)) {
        showError(prodDateInput, "Дані відсутні або введені некорректно");
        isValid = false;
    }
    const serviceTypeInput = document.getElementById('service_type');
    const serviceType = serviceTypeInput.value.trim();
    if (!autocompleteData.service_type.includes(serviceType)) {
        showError(serviceTypeInput, "Дані відсутні або введені некорректно");
        isValid = false;
    }
    const balanserInput = document.getElementById('balanser');
    const balanser = balanserInput.value.trim();
    if (!autocompleteData.balanser.includes(balanser)) {
        showError(balanserInput, "Дані відсутні або введені некорректно");
        isValid = false;
    }
    return isValid;
}

function submitMeterFormData() {
    const number = document.getElementById('number').value.trim();
    const meterTypeName = document.getElementById('meter_type_name').value.trim();
    const meter = autocompleteData.meter_type_name.find(m => m.text === meterTypeName);
    const meterId = meter ? meter.id : null;
    const prodDate = document.getElementById('prod_date').value.trim();
    const rawServiceType = document.getElementById('service_type').value.trim();
    const serviceType = rawServiceType === "Холодний" ? 1 : (rawServiceType === "Гарячий" ? 2 : 0);
    const value = document.getElementById('value').value.trim() || "0";
    const meter_location = document.getElementById('meter_location').value.trim() || null;
    const balanser = document.getElementById('balanser').value.trim();
    const meter_addressInput = document.getElementById('meter_address').value.trim();
    const meter_address = document.getElementById('meter_address').getAttribute('data-selected-id');
    const meter_addressId = meter_address ? meter_address : null;

    const formData = {
        type: "NewMeterChernigiv",
        number,
        meterId,
        prodDate,
        serviceType,
        value,
        meter_location,
        balanser,
        meter_addressId
    };

    fetch('php_server_data/addnewdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch (data.status) {
            case 'success':
                let placement = '';
                let address = '';
                if (meter_location) {
                    placement += `, розташування: ${meter_location}`;
                }
                if (meter_addressInput) {
                    address += `, адреса: ${meter_addressInput}`;
                }
                logMessage('database', 'NewDATA', '[INFO]', `Новий лічильник номер: ${number}, тип: ${meterTypeName}, рік випуску: ${prodDate}, показники: ${value}${placement}, балансоутримувач: ${balanser}${address} додано до БД користувачем [${data.user}].`);
                showAnimation('confirm', null, animation_time/1000);
                closeAddNewMeterForm();
                setTimeout(() => {
                    hideAnimation();
                    const ADRForm = document.getElementById("adrCRDform");
                    const TaskForm = document.getElementById("TasksForm");
                    const newMeterid = data.newMeterid;
                    const meter = { ID: newMeterid,
                                    number: number,
                                    service_type: serviceType,
                                    location: meter_location
                    }
                    switch (true) {
                        case ADRForm && ADRForm.classList.contains("show"):
                            addressAddMeterToADR('result', null, meter);
                            // const editADRinput = document.getElementById('address-new-meter-input');
                            // editADRinput.value = number;
                            // editADRinput.setAttribute('data-new-data-meters-card-address-id', newMeterid);
                            // sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "addresses", table: "meters"} }));
                            break;
                        case TaskForm && TaskForm.classList.contains("show"):
                            const NewMeterNumderIdentifyContainer = document.querySelector('#TasksForm #TasksGeneralData #tasks_meters-display');
                            const NewMeterNumderAddContainer = document.querySelector('#TasksForm #TasksGeneralData #tasks_meters-edit');
                            if (NewMeterNumderIdentifyContainer && NewMeterNumderIdentifyContainer.offsetParent !== null) {
                                const NewMeterNumderIdentify = document.querySelector('#TasksForm #TasksGeneralData #tasks-identify_meters-input');
                                NewMeterNumderIdentify.value = number;
                                sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "meters", criteria: number } })); 
                            }
                            if (NewMeterNumderAddContainer && NewMeterNumderAddContainer.offsetParent !== null) {
                                const NewMeterNumderAdd = document.querySelector('#TasksForm #TasksGeneralData #address-new-meter-input');
                                NewMeterNumderAdd.value = number;
                                sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "addresses", table: "meters", criteria: number } }));
                            }
                            break;
                        default:
                            sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "meters", table: "meters" } }));
                            showAnimation('preloader');
                    }
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                document.getElementById('number').value = '';
                document.getElementById('meter_type_name').value = '';
                document.getElementById('prod_date').value = '';
                document.getElementById('service_type').value = '';
                document.getElementById('value').value = '';
                document.getElementById('meter_location').value = '';
                document.getElementById('balanser').value = '';
                document.getElementById('meter_address').value = '';
                setTimeout(() => {
                    hideAnimation();
                    showModalMessage('add_meter_title', 'warning', data.message, 10000);
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                document.getElementById('number').value = '';
                document.getElementById('meter_type_name').value = '';
                document.getElementById('prod_date').value = '';
                document.getElementById('service_type').value = '';
                document.getElementById('value').value = '';
                document.getElementById('meter_location').value = '';
                document.getElementById('balanser').value = '';
                document.getElementById('meter_address').value = '';
                setTimeout(() => {
                    hideAnimation();
                    showModalMessage('add_meter_title', 'alert', data.message, 10000);
                }, animation_time);
                break;
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}

// ========== Додавання нової заявки ==========
let NewTaskEscClose;
function openAddNewTaskForm() {
    openPopupsCount++;
    var AddNewTask = document.getElementById("AddNewTask");
    AddNewTask.style.zIndex = baseIndex + openPopupsCount;
    AddNewTask.style.display = "block";
    adjustTabs();
    setTimeout(function() {
        AddNewTask.classList.add("show");
    }, 10);

    let taskAddressInput = document.getElementById('tasks_address');
    if (taskAddressInput) {
        taskAddressInput.focusHandler = function() {
            addressInputChanged = false;
            displayNewTaskPopup(taskAddressInput, taskAddressInput.value, true);
            clearPhoneMetersSelection();
        };
        taskAddressInput.inputHandler = function() {
            addressInputChanged = true;
            displayNewTaskPopup(taskAddressInput, taskAddressInput.value);
        };
        taskAddressInput.addEventListener('focus', taskAddressInput.focusHandler);
        taskAddressInput.addEventListener('input', taskAddressInput.inputHandler);
    }

    let inputs = AddNewTask.querySelectorAll('input[type="text"]');
    inputs.forEach(input => {
        if (input.id !== 'tasks_address') {
            input.focusHandler = function() { displayNewTaskPopup(input, input.value, true); };
            input.inputHandler = function() { displayNewTaskPopup(input, input.value); };

            input.addEventListener('focus', input.focusHandler);
            input.addEventListener('input', input.inputHandler);
        }
    });

    // Форматування поля вартості.
    let costInput = document.getElementById('cost');
    if (costInput) {
        costInput.inputHandler = function() {
            let value = costInput.value.replace(/[^\d]/g, '');
            costInput.dataset.value = value;
        };

        costInput.blurHandler = function() {
            let value = costInput.dataset.value || '';
            if (value) {
                costInput.value = value + ' грн.';
            }
        };

        costInput.focusHandler = function() {
            let value = costInput.dataset.value || '';
            costInput.value = value;
        };

        costInput.addEventListener('input', costInput.inputHandler);
        costInput.addEventListener('blur', costInput.blurHandler);
        costInput.addEventListener('focus', costInput.focusHandler);
    }
    // Кінець форматування поля вартості.

    document.addEventListener('click', clickOutsideTaskHandler);

    NewTaskEscClose = createOnKeydownWrapper('closeAddNewTaskForm');
    document.addEventListener('keydown', NewTaskEscClose);

    clearPhoneMetersSelection();
    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "addresses" } }));
}

function closeAddNewTaskForm() {
    var AddNewTask = document.getElementById("AddNewTask");
    AddNewTask.classList.remove("show");

    if (NewTaskEscClose) {
        document.removeEventListener('keydown', NewTaskEscClose);
        NewTaskEscClose = null;
    }

    setTimeout(function() {
        AddNewTask.style.display = "none";

        var inputs = AddNewTask.querySelectorAll('input[type="text"], input[type="number"]');
        inputs.forEach(input => {
            input.removeEventListener('focus', input.focusHandler);
            input.removeEventListener('input', input.inputHandler);
            input.value = '';
            delete input.dataset.selectedId;
        });
        document.getElementById('note').value = '';

        var selects = AddNewTask.querySelectorAll('select');
        selects.forEach(select => {
            select.selectedIndex = 0;
        });

        autocompleteTasksData.tasks_address = [];

        let popups = AddNewTask.querySelectorAll('.autocomplete-list');
        popups.forEach(popup => {
            popup.style.display = 'none';
            popup.innerHTML = '';
        });

        clearValidationErrors();

        // Форматування поля вартості.
        let costInput = document.getElementById('cost');
        if (costInput) {
            costInput.removeEventListener('input', costInput.inputHandler);
            costInput.removeEventListener('blur', costInput.blurHandler);
            costInput.removeEventListener('focus', costInput.focusHandler);
        }
        // Кінець форматування поля вартості.

        clearPhoneMetersSelection();
        document.removeEventListener('click', clickOutsideTaskHandler);
        
        const temporaryMessage = AddNewTask.querySelector('[data-temporary-block-message]');
        if (temporaryMessage) {
            temporaryMessage.remove();
        }
    }, 300);
}
window.closeAddNewTaskForm = closeAddNewTaskForm;

function clickOutsideTaskHandler(event) {
    let popups = document.querySelectorAll('.autocomplete-list');
    let isClickInsideAnyPopup = false;

    popups.forEach(popup => {
        if (popup.contains(event.target)) {
            isClickInsideAnyPopup = true;
        } else if (popup.previousElementSibling && popup.previousElementSibling.contains(event.target)) {
            isClickInsideAnyPopup = true;
        } else {
            popup.style.display = 'none';
        }
    });
}

function displayNewTaskPopup(input, filterText = "", showPopup = false) {
    const popup = document.getElementById(`${input.id}-autocomplete`);
    let data = autocompleteTasksData[input.id];
    if (!data) {
        return;
    }
    if (input.id === 'tasks_address' && addressInputChanged && filterText) {
        sendWebSocketMessage(JSON.stringify({ 
            action: "chernigiv", 
            parameters: { 
                page: "route", 
                table: "addresses", 
                criteria: filterText 
            } 
        }));
        addressInputChanged = false;
    }
    if (data) {
        popup.innerHTML = '';
        let filterParts = filterText.toLowerCase().split(' ').filter(Boolean);
        let filteredData = data.filter(item => {
            let itemText = typeof item === 'object' ? item.text.toLowerCase() : item.toLowerCase();
            return filterParts.every(part => itemText.includes(part));
        });
        if (filteredData.length === 0) {
            let notFoundDiv = document.createElement('div');
            notFoundDiv.textContent = "ЕЛЕМЕНТ НЕ ЗНАЙДЕНО";
            notFoundDiv.className = 'autocomplete-item not-selectable';
            popup.appendChild(notFoundDiv);
        } else {
            filteredData.forEach(item => {
                let div = document.createElement('div');
                div.className = 'autocomplete-item';
                if (typeof item === 'object' && item.text && item.id) {
                    div.innerHTML = highlightMatch(item.text, filterText);
                    div.onclick = function() {
                        input.value = item.text;
                        input.dataset.selectedId = item.id;
                        popup.style.display = 'none';
                        hideError(input);
                        if (input.id === 'tasks_address') {
                            displayPhonesMetersSelection(item.id);
                        }
                    };
                } else {
                    div.innerHTML = highlightMatch(item, filterText);
                    div.onclick = function() {
                        input.value = item;
                        popup.style.display = 'none';
                        hideError(input);
                    };
                }
                popup.appendChild(div);
            });
        }
        if (showPopup) {
            popup.style.display = 'block';
        }
    }
}

function displayPhonesMetersSelection(addressId) {
    const metersSelection = document.getElementById('meters-selection');
    const phonesSelection = document.getElementById('phones-selection');
    metersSelection.innerHTML = '';
    phonesSelection.innerHTML = '';

    const selectedAddress = autocompleteTasksData.tasks_address.find(addr => addr.id === addressId);
    if (selectedAddress) {
        phonesSelection.innerHTML = createPhoneEditFields(selectedAddress.phone || null, 'addNewTask');

        if (selectedAddress.meters && selectedAddress.meters.length > 0) {
            selectedAddress.meters.forEach(meter => {
                let type_bg_color = '';
                switch (meter.service_type) {
                    case 1:
                        type_bg_color = 'cold';
                        break;
                    case 2:
                        type_bg_color = 'hot';
                        break;
                    default:
                        type_bg_color = 'unknown';
                        break;
                }
                let meterBlock = document.createElement('div');
                meterBlock.className = `meter-block ${type_bg_color}`;
                meterBlock.innerHTML = `    ${meter.number}<br>
                                            <span style="font-size: 80%;">${meter.location ? meter.location.toLowerCase() : 'НЕВІДОМО'}</span>`;
                meterBlock.dataset.meterId = meter.id;
                if (meter.tasks === 'enable') {
                    meterBlock.classList.add('neutral');
                    meterBlock.dataset.selected = 'neutral';
                } else {
                    meterBlock.dataset.selected = 'false';
                    meterBlock.onclick = function() {
                        let isSelected = meterBlock.dataset.selected === 'true';
                        meterBlock.dataset.selected = isSelected ? 'false' : 'true';
                        meterBlock.classList.toggle('selected', !isSelected);
                    };
                }

                metersSelection.appendChild(meterBlock);
            });
        }
        
        let addBlock = document.createElement('div');
        addBlock.className = 'add_new_meter-block';
        addBlock.id = 'NewTaskaddNewMeterBtn';
        addBlock.innerHTML = `  <svg>
                                    <use href="#new_meter_icon"></use>
                                </svg>
                                <span>БЕЗ НОМЕРА</span>`;
        addBlock.onclick = function(event) {
            addEmptyMeter(event);
        };
        metersSelection.appendChild(addBlock);

    }
}

function addEmptyMeter(event) {

    let popup = document.createElement('div');
    popup.className = 'new_task_add_meter-popup';
    popup.id = 'new_task_add_meter-popup';
    popup.style.position = 'absolute';
    popup.style.zIndex = '1500';
    popup.style.top = event.clientY + 'px';
    popup.style.left = event.clientX + 'px';

    let kitchenTitle = document.createElement('div');
    kitchenTitle.className = 'new_meter-kitchen_title';
    kitchenTitle.textContent = 'К У Х Н Я';
    popup.appendChild(kitchenTitle);

    let kitchenElements = document.createElement('div');
    kitchenElements.className = 'new_meter-kitchen_elements';
    let kitchenCold = document.createElement('div');
    kitchenCold.className = 'new_meter-kitchen_cold';
    kitchenCold.innerHTML = `<svg>
                                <use href="#new_meter_icon"></use>
                            </svg>`;
    kitchenCold.onclick = function() {
        createNoNumberMeterBlock('cold', 'кухня', 'nonumber_cold_kitchen');
    };
    let kitchenHot = document.createElement('div');
    kitchenHot.className = 'new_meter-kitchen_hot';
    kitchenHot.innerHTML = `<svg>
                                <use href="#new_meter_icon"></use>
                            </svg>`;
    kitchenHot.onclick = function() {
        createNoNumberMeterBlock('hot', 'кухня', 'nonumber_hot_kitchen');
    };
    let kitchenUnknown = document.createElement('div');
    kitchenUnknown.className = 'new_meter-kitchen_unknown';
    kitchenUnknown.innerHTML = `<svg>
                                <use href="#new_meter_icon"></use>
                            </svg>`;
    kitchenUnknown.onclick = function() {
        createNoNumberMeterBlock('unknown', 'кухня', 'nonumber_unknown_kitchen');
    };
    kitchenElements.appendChild(kitchenCold);
    kitchenElements.appendChild(kitchenHot);
    kitchenElements.appendChild(kitchenUnknown);
    popup.appendChild(kitchenElements);

    let hr = document.createElement('hr');
    popup.appendChild(hr);

    let bathTitle = document.createElement('div');
    bathTitle.className = 'new_meter-bath_title';
    bathTitle.textContent = 'В А Н Н А';
    popup.appendChild(bathTitle);

    let bathElements = document.createElement('div');
    bathElements.className = 'new_meter-bath_elements';
    let bathCold = document.createElement('div');
    bathCold.className = 'new_meter-bath_cold';
    bathCold.innerHTML = `  <svg>
                                <use href="#new_meter_icon"></use>
                            </svg>`;
    bathCold.onclick = function() {
        createNoNumberMeterBlock('cold', 'ванна', 'nonumber_cold_bath');
    };
    let bathHot = document.createElement('div');
    bathHot.className = 'new_meter-bath_hot';
    bathHot.innerHTML = `   <svg>
                                <use href="#new_meter_icon"></use>
                            </svg>`;
    bathHot.onclick = function() {
        createNoNumberMeterBlock('hot', 'ванна', 'nonumber_hot_bath');
    };
    let bathUnknown = document.createElement('div');
    bathUnknown.className = 'new_meter-bath_unknown';
    bathUnknown.innerHTML = `   <svg>
                                <use href="#new_meter_icon"></use>
                            </svg>`;
    bathUnknown.onclick = function() {
        createNoNumberMeterBlock('unknown', 'ванна', 'nonumber_unknown_bath');
    };
    bathElements.appendChild(bathCold);
    bathElements.appendChild(bathHot);
    bathElements.appendChild(bathUnknown);
    popup.appendChild(bathElements);

    document.body.appendChild(popup);

    function closePopup(event) {
        if (!popup.contains(event.target)) {
            popup.remove();
            document.removeEventListener('click', closePopup);
        }
    }

    setTimeout(() => document.addEventListener('click', closePopup), 0);
}

function createNoNumberMeterBlock(temperature, location, data_attribute) {
    const metersSelection = document.querySelector('#AddNewTaskDiv #tasksFormTableRequired #meters-selection');

    if (metersSelection) {
        let meterBlock = document.createElement('div');
        meterBlock.className = `meter-block ${temperature}`;
        meterBlock.dataset.meterId = data_attribute;
        meterBlock.dataset.selected = "false";
        meterBlock.onclick = function() {
            let isSelected = meterBlock.dataset.selected === 'true';
            meterBlock.dataset.selected = isSelected ? 'false' : 'true';
            meterBlock.classList.toggle('selected', !isSelected);
        };
        meterBlock.innerHTML = `БЕЗ НОМЕРА<br>
                                <span style="font-size: 80%;">${location}</span>`;

        const addButton = metersSelection.querySelector('.add_new_meter-block');
        metersSelection.insertBefore(meterBlock, addButton);
    }

    document.getElementById('new_task_add_meter-popup').remove();
}

function clearPhoneMetersSelection() {
    const phonesSelection = document.getElementById('phones-selection');
    const metersSelection = document.getElementById('meters-selection');

    if (metersSelection) {
        const cloneMeters = metersSelection.cloneNode(false);
        metersSelection.parentNode.replaceChild(cloneMeters, metersSelection);
        cloneMeters.innerHTML = '<span style="color: gray;">Для вибору лічильників<br>необхідно обрати адресу.</span>';
    }

    if (phonesSelection) {
        const clonePhones = phonesSelection.cloneNode(false);
        phonesSelection.parentNode.replaceChild(clonePhones, phonesSelection);
        clonePhones.innerHTML = '<span style="color: gray;">Для роботи з номерами телефонів<br>необхідно обрати адресу.</span>';
    }
}

window.saveNewTask = function() {
    if (validateTaskFormData()) {
        submitTaskFormData();
    } else {
        console.log("Форма заповнена некоректно.");
    }
};

function validateTaskFormData() {
    let isValid = true;
    clearValidationErrors();
    const NewTaskContainer = document.getElementById('AddNewTask');

    const taskAddressInput = NewTaskContainer.querySelector('#tasks_address');
    const taskAddress = taskAddressInput.value.trim();
    const taskAddresses = autocompleteTasksData.tasks_address.map(item => item ? item.text : null).filter(text => text !== null);
    if (!taskAddresses.includes(taskAddress)) {
        showError(taskAddressInput, "Дані відсутні або введені некорректно");
        isValid = false;
    }

    const taskTypeInput = NewTaskContainer.querySelector('#tasks_type');
    const taskType = taskTypeInput.value.trim();
    const taskTypes = autocompleteTasksData.tasks_type;
    if (!taskTypes.includes(taskType)) {
        showError(taskTypeInput, "Дані відсутні або введені некорректно");
        isValid = false;
    }

    const metersSelection = NewTaskContainer.querySelector('#meters-selection');
    const meterBlocks = metersSelection.querySelectorAll('.meter-block');

    if (meterBlocks.length > 0) {
        const neutralMeters = Array.from(meterBlocks).filter(meter => meter.dataset.selected === 'neutral');
        const selectedlMeters = Array.from(meterBlocks).filter(meter => meter.dataset.selected === 'true');

        if (neutralMeters.length === meterBlocks.length) {
            showAnimation('warning', null, animation_time/1000);
            clearPhoneMetersSelection();
            setTimeout(() => {
                showModalMessage('add_task_title', 'warning', 'Усі лічильники за цією адресою<br>вже закріплені за заявками.<br>Створення нової заявки неможливе.', 10000);
                hideAnimation();
            }, animation_time);
            isValid = false;
        } else if (selectedlMeters.length === 0) {
            showAnimation('warning', null, animation_time/1000);
            clearPhoneMetersSelection();
            setTimeout(() => {
                showModalMessage('add_task_title', 'warning', 'Для створення нової заявки<br>необхідно обрати хоча б один лічильник.<br>Створення нової заявки неможливе.', 10000);
                hideAnimation();
            }, animation_time);
            isValid = false;
        }

    } else {
        showAnimation('cancel', null, animation_time/1000);
        clearPhoneMetersSelection();
        setTimeout(() => {
            showModalMessage('add_task_title', 'alert', 'Створення нової заявки<br>без лічильників заборонено!', 10000);
            hideAnimation();
        }, animation_time);
        isValid = false;
    }
    return isValid;
}

function submitTaskFormData() {
    const taskAddress = document.getElementById('tasks_address').value.trim();
    const selectedAddress = autocompleteTasksData.tasks_address.find(a => a.text === taskAddress);
    const taskAddressId = selectedAddress ? selectedAddress.id : null;
    const taskAddressText = selectedAddress ? selectedAddress.text : null;
    const taskType = document.getElementById('tasks_type').value.trim() || null;
    const brigade = document.getElementById('brigade').value.trim() || null;
    const cost = document.getElementById('cost').dataset.value || document.getElementById('cost').value.trim() || null;
    const payMethod = document.getElementById('pay_method').value.trim() || null;
    const note = document.getElementById('note').value.trim() || null;

    if (!taskAddressId || !taskType) {
        alert("Будь ласка, заповніть усі обовʼязкові поля.");
        return;
    }

    const selectedMeters = document.querySelectorAll('#meters-selection .meter-block.selected[data-selected="true"]');
    const taskMetersId = selectedMeters.length > 0 ? Array.from(selectedMeters).map(meter => meter.dataset.meterId).join('|') : null;
    const selectedMeterNumbers = selectedMeters.length > 0 
        ? Array.from(selectedMeters).map(meter => {
            const content = meter.innerHTML.split('<br>')[0].trim();
            return content;
        }).join(', ')
        : null;

    // Логика проверки изменений телефонных номеров
    const phoneFieldContainer = document.querySelector('.phones-selection');
    const phoneFields = phoneFieldContainer.getElementsByClassName('phone-edit-field');
    const buttonContainer = phoneFieldContainer.querySelector('.button-container');
    const initialPhoneCount = parseInt(buttonContainer.getAttribute('data-initial-phone-count'), 10);
    let hasChanges = false;
    let phoneNumbers = [];
    let invalidInput = false;
    const phoneFieldsWithAttribute = Array.from(phoneFields).filter(field => field.querySelector('select').hasAttribute('data-old-value'));
    if (phoneFieldsWithAttribute.length !== initialPhoneCount) {
        hasChanges = true;
    }

    for (let i = 0; i < phoneFields.length; i++) {
        const select = phoneFields[i].querySelector('select');
        const input = phoneFields[i].querySelector('input');
        const code = select.value;
        const oldCode = select.getAttribute('data-old-value');
        const number = input.value.replace(/\D/g, '');
        const oldNumber = input.getAttribute('data-old-value');

        if ((code === '0462' && number.length !== 6) || (code !== '0462' && number.length !== 7)) {
            if (number.length > 0) {
                invalidInput = true;
            }
        }
        if (code !== oldCode || number !== oldNumber) {
            hasChanges = true;
        }

        if (number.length > 0) {
            const phoneNumber = code === '0462' ? number : code + number;
            phoneNumbers.push(phoneNumber);
        }
    }

    if (invalidInput) {
        alert('Некорректный номер телефона. Проверьте введенные данные.');
        return;
    }
    const phoneNumbersString = hasChanges ? (phoneNumbers.length > 0 ? phoneNumbers.join('|') : null) : null;

    const formData = {
        type: "NewTaskChernigiv",
        taskAddressId,
        taskAddressText,
        taskMetersId,
        taskType,
        brigade,
        cost,
        payMethod,
        note,
        phones: phoneNumbersString
    };

    fetch('php_server_data/addnewdata.php', {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        switch (data.status) {
            case 'success':
                let log_meters = '';
                let log_brigade = '';
                let log_cost = '';
                let log_payMethod = '';
                let log_note = '';
                if (selectedMeterNumbers) {
                    const meterNumbers = selectedMeterNumbers.split(', ');
                    const numbers = [];
                    let withoutNumberCount = 0;
                
                    meterNumbers.forEach(meter => {
                        if (meter === 'БЕЗ НОМЕРА') {
                            withoutNumberCount++;
                        } else {
                            numbers.push(meter);
                        }
                    });
                
                    let logMessage = '';
                    if (numbers.length > 0) {
                        logMessage += `, лічильники: ${numbers.join(', ')}`;
                    }
                    if (withoutNumberCount > 0) {
                        logMessage += (numbers.length > 0 ? ', ' : ', лічильники: ') + `БЕЗ НОМЕРА - ${withoutNumberCount} шт.`;
                    }
                
                    log_meters += logMessage;
                }
                if (brigade) {
                    log_brigade += `, виконавець: ${brigade}`;
                }
                if (cost) {
                    log_cost += `, вартість: ${cost} грн.`;
                }
                if (payMethod) {
                    log_payMethod += `, спосіб оплати: ${payMethod}`;
                }
                if (note) {
                    log_note += `, примітки: ${note}`;
                }
                logMessage('database', 'NewDATA', '[INFO]', `Нова заявка ${taskType}, адреса: ${taskAddress}${log_meters}${log_brigade}${log_cost}${log_payMethod}${log_note} додано до БД користувачем [${data.user}].`);
                showAnimation('confirm', null, animation_time/1000);
                setTimeout(() => {
                    hideAnimation();
                    closeAddNewTaskForm();
                    const routeWorker = document.querySelector('#route-top-bar .active');
                    if (!routeWorker) {
                        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "route",criteria: { worker: null, address: [] } } }));
                    } else {
                        const routeWorkerName = routeWorker.textContent;
                        const routeCurrentDateBlock = document.getElementById('current-date-block');
                        const routeCurrentDate = routeCurrentDateBlock.getAttribute('data-curr-work-date');
                        const routeCriteria = { brigade: routeWorkerName, select_date: routeCurrentDate };
                        const filter_coocie_result = checkFilterCookie(true);
                        let address_criteria = [];
                        if (filter_coocie_result.filter_cookie) {
                            address_criteria = JSON.parse(filter_coocie_result.value);
                        }
                        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "route", criteria: { worker: routeCriteria, address: address_criteria } } }));
                    }
                    showAnimation('preloader');
                }, animation_time);
                break;
            case 'warning':
                showAnimation('warning', null, animation_time/1000);
                document.getElementById('tasks_address').value = '';
                document.getElementById('tasks_type').value = '';
                document.getElementById('brigade').value = '';
                document.getElementById('cost').value = '';
                document.getElementById('pay_method').value = '';
                document.getElementById('note').value = '';
                clearPhoneMetersSelection();
                setTimeout(() => {
                    hideAnimation();
                    showModalMessage('add_task_title', 'warning', data.message, 10000);
                }, animation_time);
                break;
            case 'error':
                showAnimation('cancel', null, animation_time/1000);
                document.getElementById('tasks_address').value = '';
                document.getElementById('tasks_type').value = '';
                document.getElementById('brigade').value = '';
                document.getElementById('cost').value = '';
                document.getElementById('pay_method').value = '';
                document.getElementById('note').value = '';
                clearPhoneMetersSelection();
                setTimeout(() => {
                    hideAnimation();
                    showModalMessage('add_task_title', 'alert', data.message, 10000);
                }, animation_time);
                break;
        }
    })
    .catch(error => {
        alert('Помилка при відправці даних на сервер: ' + error.message);
    });
}