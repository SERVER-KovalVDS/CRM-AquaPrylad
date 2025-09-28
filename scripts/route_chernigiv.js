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

let animation_time = 0;

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
    } catch (error) {
      console.error('Error loading JSON data:', error);
    }
}

async function initialize() {
    await fetchSessionData();
    try {

        let address_criteria = [];
        const filter_cookie_result = checkFilterCookie(true);
        if (filter_cookie_result.filter_cookie) {
            document.querySelector('.navi.navi_grid3 .icon_navi').classList.add('active');
            address_criteria = JSON.parse(filter_cookie_result.value);
        }

        await connectWebSocket(token, 'CHERNIGIV-ROUTE', handleServerData, handleConnectionClose);
        showAnimation('preloader');
        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "route", criteria: { worker: null, address: address_criteria } } }));
    } catch (error) {
        console.error('Failed to connect:', error);
        hideAnimation();
    }
    addWorkerButtons();
}
initialize();

function checkFilterCookie(cookie_value = false) {
    const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
        const [name, value] = cookie.split('=');
        acc[name] = value;
        return acc;
    }, {});

    if (cookie_value) {
        return cookies['filter_criteria'] ? { filter_cookie: true, value: cookies['filter_criteria'] } : { filter_cookie: false };
    } else {
        return cookies['filter_criteria'] ? { filter_cookie: true } : { filter_cookie: false };
    }
}
window.checkFilterCookie = checkFilterCookie;

function handleServerData(event) {
    const data = JSON.parse(event.data);
    switch (data.action) {        
        case "routeResponse":
            // console.log("Received routeResponse data:", data);
            if (data.data && data.data.statistic) {
                let statistics = data.data.statistic;
                const infoContainer = document.querySelector('.info');
                const warningContainer = document.querySelector('.warning');
                const infoMessage = document.getElementById('infoMessage');
                const warningMessage = document.getElementById('warningMessage');
            
                if (!statistics || statistics.length === 0) {
                    const warningMsg = `Помилка у підрахунку кількості даних.`;
                    warningContainer.style.display = 'flex';
                    createMarquee(warningMessage, warningMsg);
                    return;
                }
            
                const totalTasks = statistics.find(item => item.name === 'total_tasks');
                const brigadeStats = statistics.filter(item => item.name !== 'total_tasks' && !item.hasOwnProperty('filter'));
                if (totalTasks) {
                    let infoMsg = '';
                    if (brigadeStats.length > 0) {
                        infoMsg += `Всього заявок: <strong>[ ${totalTasks.value} ]</strong>. => `;
                        brigadeStats.forEach((item, index) => {
                            infoMsg += `<strong>${item.name}</strong>: [ ${item.value} ]`;
                            if (index < brigadeStats.length - 1) {
                                infoMsg += ', => ';
                            }
                        });
                        infoMsg += '.';
                    } else {
                        infoMsg += `Всього заявок: <strong>[ ${totalTasks.value} ]</strong>. За виконавцями на закріплено жодної заявки.`;
                    }
                    const filterApplied = statistics.find(item => item.hasOwnProperty('filter'));
                    if (filterApplied && filterApplied.filter) {
                        infoMsg += ` <span style="background-color: orange; padding: 0 15px; margin-left: 20px">Дані відфільтровано!</span>`;
                    } else {
                        infoMsg += ` Фільтрація відсутня.`;
                    }

                    infoContainer.style.display = 'flex';
                    createMarquee(infoMessage, infoMsg);
                } else {
                    const warningMsg = `Помилка у підрахунку кількості даних.`;
                    warningContainer.style.display = 'flex';
                    createMarquee(warningMessage, warningMsg);
                }
            }
            const routeDisplay = new RouteDisplay();
            routeDisplay.displayRoutes(data.data);
            initDragAndDrop();
            hideAnimation();
            break;
        case "routeFilterResponse":
            // console.log("Received data:", event.data);
            displayAutocompleteList(data.field, data.data);
            hideAnimation();
            break;
        case "routePrintResponse":
            // console.log("Received routePrintResponse data:", data);
            renderTable(data.data)
            break;
        case "routeExcelResponse":
            // console.log("Received routeExcelResponse data:", data);
            downloadExcelFile(data)
            break;
        default:
            handleServerDataGeneral(event);
            break;
    }
}

function handleConnectionClose(code) {
    const RouteContainer = document.getElementById('route-container');
    const NoSmallScreen = document.getElementById('no-small-screen');

    RouteContainer.innerHTML = '';
    RouteContainer.style.display = 'none';
    NoSmallScreen.innerHTML = '';
    NoSmallScreen.style.display = 'flex';
    NoSmallScreen.style.justifyContent = 'center';

    handleConnectionCloseMessage(code, 'no-small-screen');
    hideAnimation();
    closeAllAlerts();
    closeAllCards('ROUTE');
}

async function addWorkerButtons() {
    const topBar = document.getElementById('route-top-bar');
    if (!topBar) return;
    try {
        const response = await fetch('vocabulary.json');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        const workers = data.chernigiv.workers;
        if (workers.length > 0) {
            workers.forEach(worker => {
                const topBarButton = document.createElement('div');
                topBarButton.className = 'route-worker-button';
                topBarButton.textContent = worker;
                topBarButton.setAttribute('onclick', 'WorkerServerRequest(event)');
                topBar.appendChild(topBarButton);
            });
        } else {
            console.error('workers is not defined or empty');
        }
    } catch (error) {
        console.error('Error loading JSON data for route_chernigiv.js:', error);
    }
}

function WorkerServerRequest(event) {
    handleBlockClick(event);
    document.getElementById('route-personal-content').style.display = 'flex';
    const worker = event.target.textContent;
    const currentDateBlock = document.getElementById('current-date-block');
    let SelectDate;
    if (currentDateBlock) {
        SelectDate = currentDateBlock.getAttribute('data-curr-work-date');
    } else {
        const today = new Date();
        SelectDate = today.toISOString().split('T')[0];
    }

    let address_criteria = [];
    const filter_coocie_result = checkFilterCookie(true);
    if (filter_coocie_result.filter_cookie) {
        address_criteria = JSON.parse(filter_coocie_result.value);
    }

    const criteria = { 
        worker: { brigade: worker, select_date: SelectDate }, 
        address: address_criteria
    };
    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "route", criteria: criteria } }));
    showAnimation('preloader');
}
window.WorkerServerRequest = WorkerServerRequest;

class RouteDisplay {
    constructor() {
        this.personalContainer = document.getElementById('route-personal-content');
        this.commonContainer = document.getElementById('route-common-content');
        this.dateContainer = document.getElementById('route-date-bar');
    }

    displayRoutes(data) {
        if (!data) return;

        // Обработка personal_tasks
        if (data.personal_tasks && this.personalContainer) {
            this.personalContainer.innerHTML = '';
            this.createCards(data.personal_tasks, this.personalContainer);
            RouteCreation(data.calendar_dates);
        }

        // Обработка common_tasks
        if (data.common_tasks && this.commonContainer) {
            this.commonContainer.innerHTML = '';
            this.createCards(data.common_tasks, this.commonContainer);
        }

        // Обработка date_tasks
        if (data.date_tasks && this.dateContainer) {
            this.clearDateContainerExceptCalendar();
            this.createCards(data.date_tasks, this.dateContainer);
            countAdressesMeters(data.date_tasks);
        }
    }

    createCards(tasks, container) {
        if (tasks.length === 0) {
            const noDataDiv = document.createElement('div');
            noDataDiv.className = 'no_data';
            if (container === this.personalContainer || container === this.commonContainer) {
                noDataDiv.innerHTML = 'З А Я В К И<BR>В І Д С У Т Н І';
            }
            container.appendChild(noDataDiv);
            return;
        }
    
        tasks.forEach(task => {
            const columnDiv = document.createElement('div');
            columnDiv.className = 'page_column';
            columnDiv.setAttribute('data-route-id', task.ID);
            columnDiv.setAttribute('data-work-date', task.work_date ? task.work_date : null);
            columnDiv.setAttribute('draggable', true);
    
            const cardDiv = document.createElement('div');
            cardDiv.classList.add('page_card');
            if (container === this.personalContainer) {
                cardDiv.classList.add(task.work_date ? 'on-route' : 'not-route');
            }
            cardDiv.addEventListener('dblclick', () => {
                this.handleDoubleClick(task.ID);
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
    
            if (task.date) {
                const dateDiv = document.createElement('div');
                dateDiv.className = 'page_card_value_route';
                dateDiv.innerHTML = getValueOrDefault(task.date ? formatDate(task.date) : null);
                cardDiv.appendChild(dateDiv);
            }
    
            const typeDiv = document.createElement('div');
            typeDiv.className = 'page_card_value_route';
            typeDiv.innerHTML = getValueOrDefault(task.tasks_type);
            cardDiv.appendChild(typeDiv);
    
            if (task.phone) {
                const phoneDiv = document.createElement('div');
                phoneDiv.className = 'page_card_value_route';
                phoneDiv.innerHTML = PhoneNumberformat(task.phone).replace(/\n/g, '<br>');
                cardDiv.appendChild(phoneDiv);
            }
    
            if (task.meters !== undefined) {
                const metersDiv = document.createElement('div');
                metersDiv.className = 'page_card_value_route';
                metersDiv.innerHTML = `Лічильники: ${getValueOrDefault(task.meters)}`;
                if (task.meters !== null) {
                    metersDiv.setAttribute('data-meters', task.meters);
                }
                cardDiv.appendChild(metersDiv);
            }

            if (task.note) {
                const noteDiv = document.createElement('div');
                noteDiv.className = 'page_card_value_route';
                noteDiv.innerHTML = getValueOrDefault(task.note).replace(/\n/g, '<br>');
                cardDiv.appendChild(noteDiv);
            }
            columnDiv.appendChild(cardDiv);
            container.appendChild(columnDiv);
        });
    }

    clearDateContainerExceptCalendar() {
        const elementsToKeep = ['route-calendar', 'current-date-block', 'statistic-block', 'route-calendar-hr-line'];
        Array.from(this.dateContainer.children).forEach(child => {
            if (!elementsToKeep.includes(child.id)) {
                this.dateContainer.removeChild(child);
            }
        });
    }

    handleDoubleClick(routeId) {
        sendObjectRequest("ROUTE", routeId);
    }
}

// ========== Функції роботи з переміщеннями блоків між контейнерами ==========
document.addEventListener('DOMContentLoaded', function() {
    const personalContent = document.getElementById('route-personal-content');
    const commonContent = document.getElementById('route-common-content');
    const requestsBlock = document.getElementById('route-date-bar');

    if (personalContent) {
        personalContent.addEventListener('dragover', handleDragOver);
        personalContent.addEventListener('drop', (event) => handleDrop(event, 'route-personal-content'));
        personalContent.addEventListener('dragleave', () => removeTargetClass(personalContent));
    }

    if (commonContent) {
        commonContent.addEventListener('dragover', handleDragOver);
        commonContent.addEventListener('drop', (event) => handleDrop(event, 'route-common-content'));
        commonContent.addEventListener('dragleave', () => removeTargetClass(commonContent));
    }

    if (requestsBlock) {
        requestsBlock.addEventListener('dragover', handleDragOver);
        requestsBlock.addEventListener('drop', (event) => handleDrop(event, 'route-date-bar'));
        requestsBlock.addEventListener('dragleave', () => removeTargetClass(requestsBlock));
    }
});

function handleDragStart(event) {
    if (event.target.classList.contains('page_column')) {
        event.dataTransfer.setData('text/plain', event.target.getAttribute('data-route-id'));
        event.target.classList.add('dragging');
        
        const sourceContainer = event.target.closest('.route-content');
        if (sourceContainer) {
            sourceContainer.classList.add('dragging-container');
        }
    }
}

function handleDragEnd(event) {
    if (event.target.classList.contains('page_column')) {
        event.target.classList.remove('dragging');
        
        const sourceContainer = event.target.closest('.route-content');
        if (sourceContainer) {
            sourceContainer.classList.remove('dragging-container');
            removeTargetClass(sourceContainer);
        }
    }
}

function handleDragOver(event) {
    event.preventDefault();
    const targetContainer = event.currentTarget;
    if (targetContainer && !targetContainer.classList.contains('target-container')) {
        targetContainer.classList.add('target-container');
    }
}

function removeTargetClass(container) {
    container.classList.remove('target-container');
}

function handleDrop(event, targetContainerId) {
    event.preventDefault();
    const data = event.dataTransfer.getData('text/plain');
    const draggableElement = document.querySelector(`[data-route-id='${data}']`);
    if (!draggableElement) return;

    const currentDateBlock = document.getElementById('current-date-block');
    const targetContainer = document.getElementById(targetContainerId);
    const sourceContainer = draggableElement.closest('.route-content');

    if (!sourceContainer || sourceContainer.id === targetContainerId) return;

    const TaskDateErrorText = 'Додавання заявок в маршрут<br>для дат, які пройшли,<br>З А Б О Р О Н Е Н О!';
    const TaskDateErrorShowTime = 10000;

    targetContainer.classList.remove('target-container');
    sourceContainer.classList.remove('dragging-container');

    if (targetContainerId === 'route-date-bar') {
        const calendarBlock = document.getElementById('route-calendar');
        if (!currentDateBlock || !calendarBlock) {
            showAnimation('cancel', null, animation_time/1000);
            setTimeout(() => {
                hideAnimation();
                showModalMessage('no-worker-selected', 'alert', 'Для перенесення заявки в маршрут<br>необхідно обрати виконавця.', TaskDateErrorShowTime);
            }, animation_time);
            return;
        }
    }

    let worker;
    const activeWorkerButton = document.querySelector('#route-top-bar .route-worker-button.active');
    if (activeWorkerButton) {
        worker = activeWorkerButton.textContent;
    }

    const currentWorkDate = currentDateBlock ? currentDateBlock.getAttribute('data-curr-work-date') : null;
    const today = new Date().toISOString().split('T')[0];
    let change = {
        id: data,
        user: user_name,
        brigade: worker,
        select_date: currentWorkDate
    };

    switch (sourceContainer.id) {
        case 'route-common-content':
            switch (targetContainerId) {
                case 'route-personal-content':
                    change.worker = worker;
                    break;
                case 'route-date-bar':
                    if (currentWorkDate < today) {
                        showAnimation('cancel', null, animation_time/1000);
                        setTimeout(() => {
                            hideAnimation();
                            showModalMessage('route-calendar', 'alert', TaskDateErrorText, TaskDateErrorShowTime);
                        }, animation_time);
                        return;
                    }
                    change.worker = worker;
                    change.work_date = currentWorkDate;
                    break;
                default:
                    return;
            }
            break;
        case 'route-personal-content':
            switch (targetContainerId) {
                case 'route-common-content':
                    change.worker = null;
                    change.work_date = null;
                    break;
                case 'route-date-bar':
                    if (currentWorkDate < today) {
                        showAnimation('cancel', null, animation_time/1000);
                        setTimeout(() => {
                            hideAnimation();
                            showModalMessage('route-calendar', 'alert', TaskDateErrorText, TaskDateErrorShowTime);
                        }, animation_time);
                        return;
                    }
                    change.work_date = currentWorkDate;
                    break;
                default:
                    return;
            }
            break;
        case 'route-date-bar':
            switch (targetContainerId) {
                case 'route-common-content':
                    change.worker = null;
                    change.work_date = null;
                    break;
                case 'route-personal-content':
                    change.work_date = null;
                    break;
                default:
                    return;
            }
            break;
        default:
            return;
    }

    let address_criteria = [];
    const filter_coocie_result = checkFilterCookie(true);
    if (filter_coocie_result.filter_cookie) {
        address_criteria = JSON.parse(filter_coocie_result.value);
    }

    const request_criteria = { 
        worker: change, 
        address: address_criteria
    };
    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "change", criteria: request_criteria } }));
    showAnimation('preloader');

    targetContainer.appendChild(draggableElement);
}

function initDragAndDrop() {
    const columns = document.querySelectorAll('.page_column');
    columns.forEach(column => {
        column.addEventListener('dragstart', handleDragStart);
        column.addEventListener('dragend', handleDragEnd);
    });
}

// ========== Заповнення блоку для складання маршруту ==========
function RouteCreation(calendarDates) {
    const calendarContainer = document.getElementById('route-date-bar');
    if (!calendarContainer) return;

    let calendarDiv = document.getElementById('route-calendar');
    let currentDateBlock = document.getElementById('current-date-block');
    let statisticBlock = document.getElementById('current-date-block');

    let currentWorkDate = new Date();

    if (!calendarDiv || !currentDateBlock || !statisticBlock) {
        calendarContainer.innerHTML = '';

        calendarDiv = document.createElement('div');
        calendarDiv.id = 'route-calendar';
        calendarDiv.className = 'calendar-container';
        calendarContainer.appendChild(calendarDiv);

        currentDateBlock = document.createElement('div');
        currentDateBlock.id = 'current-date-block';
        currentDateBlock.className = 'current-date-block';
        currentDateBlock.innerText = currentWorkDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
        currentDateBlock.setAttribute('data-curr-work-date', currentWorkDate.toISOString().split('T')[0]);
        calendarContainer.appendChild(currentDateBlock);

        statisticBlock = document.createElement('div');
        statisticBlock.id = 'statistic-block';
        statisticBlock.className = 'statistic-block';
        statisticBlock.style.display = 'block';
        calendarContainer.appendChild(statisticBlock);

        const hrLine = document.createElement('hr');
        hrLine.style.width = '100%';
        hrLine.id = 'route-calendar-hr-line';
        calendarContainer.appendChild(hrLine);

        currentDateBlock.addEventListener('dateSelected', function(event) {
            filterAndMoveBlocks(event.detail.date);
        });
    }

    const availableDates = calendarDates.map(item => new Date(item));

    if (currentDateBlock && currentDateBlock.dataset.currWorkDate) {
        currentWorkDate = new Date(currentDateBlock.dataset.currWorkDate);
    }
    
    const singleDateCalendar = new SingleDateSelectionCalendar(
        calendarDiv,
        currentDateBlock.id,
        'ALL',
        availableDates,
        currentWorkDate
    );
    
    singleDateCalendar.buildCalendar();
    calendarDiv.style.display = 'block';
}

function filterAndMoveBlocks(selectedDate) {
    const personalContent = document.getElementById('route-personal-content');
    const requestsBlock = document.getElementById('route-date-bar');
    const currentDateBlock = document.getElementById('current-date-block');

    if (personalContent.querySelector('.no_data')) {
        personalContent.removeChild(personalContent.querySelector('.no_data'));
    }

    if (!personalContent || !requestsBlock) {
        console.error('Required containers not found.');
        return;
    }
    const formattedSelectedDate = new Date(selectedDate).toISOString().split('T')[0];
    const movedColumns = requestsBlock.getElementsByClassName('page_column');
    Array.from(movedColumns).forEach(column => {
        personalContent.appendChild(column);
        column.querySelector('.page_card').classList.add('on-route');
    });
    currentDateBlock.setAttribute('data-curr-work-date', formattedSelectedDate);

    const pageColumns = personalContent.getElementsByClassName('page_column');
    Array.from(pageColumns).forEach(column => {
        const workDate = column.getAttribute('data-work-date');
        if (workDate && workDate.split('T')[0] === formattedSelectedDate) {
            requestsBlock.appendChild(column);
            column.querySelector('.page_card').classList.remove('on-route');
        }
    });

    if (personalContent.children.length === 0) {
        const noDataDiv = document.createElement('div');
        noDataDiv.className = 'no_data';
        noDataDiv.innerHTML = 'З А Я В К И<BR>В І Д С У Т Н І';
        personalContent.appendChild(noDataDiv);
    }
    countAdressesMeters();
}

// ========== Форма друку маршруту ==========
function PrintRoute() {
    if (window.innerWidth < 1200) {
        alert('Для друкування маршруту ширина сторінки повинна бути не менше 1200 пікселів!');
        return;
    }
    const topBar = document.getElementById("route-top-bar");
    const currentDateBlock = document.getElementById("current-date-block");
    const activeWorkerElement = topBar.querySelector('.active');
    if (!activeWorkerElement) {
        showAnimation('cancel', null, animation_time/1000);
            setTimeout(() => {
                hideAnimation();
                showModalMessage('no-worker-selected', 'alert', 'Для друкування маршруту<br>необхідно обрати виконавця.', 5000);
            }, animation_time);
        return;
    }
    const workerName = activeWorkerElement.textContent;
    const workDate = currentDateBlock.getAttribute('data-curr-work-date');
    const criteria = { worker: workerName, work_date: workDate };
    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "print", criteria: criteria }}));
}
window.PrintRoute = PrintRoute;

function renderTable(data) {
    if (!data || data.length === 0) {
        showAnimation('warning', null, animation_time/1000);
        setTimeout(() => {
            hideAnimation();
            showModalMessage('route-calendar', 'warning', 'Для цього виконавця<br>за обраною датою<br>маршрут відсутній.', 5000);
        }, animation_time);
        return;
    }
    const workerElement = document.querySelector("#route-top-bar .active");
    const workerName = workerElement ? workerElement.innerText : "";
    const dateElement = document.getElementById("current-date-block");
    const workDate = dateElement ? dateElement.innerText : "";
    let content = `
        <div class="table-title">${workerName} => ${workDate}</div>
        <table>
            <tr>
                <th>№</th>
                <th>Адреса</th>
                <th>Кільк.</th>
                <th>Вартість</th>
                <th>Замовник</th>
                <th>Телефон</th>
                <th>Примітки</th>
            </tr>`;
    data.forEach((item, index) => {
        const addressParts = item.address.split('буд.');
        const address = `${addressParts[0]}<br>буд.${addressParts[1] || ""}`;
        const metersCount = item.meters_count || "<span class='no-data'>X</span>";
        const costPayMethod = (item.cost ? item.cost + " грн." : "<span class='no-data'>Не вказано</span>") + "<br>" + (item.pay_method || "<span class='no-data'>Не вказано</span>");
        const fml = item.fml || "<span class='no-data'>Не вказано</span>";
        const phone = item.phone ? PhoneNumberformat(item.phone) : "<span class='no-data'>Не вказано</span>";
        const note = item.note || "<span class='no-data'>Відсутні</span>";
        content += `
            <tr>
                <td>${index + 1}</td>
                <td>${address}</td>
                <td>${metersCount}</td>
                <td>${costPayMethod}</td>
                <td>${fml}</td>
                <td>${phone}</td>
                <td>${note}</td>
            </tr>`;
    });
    content += `</table>`;

    printContent(content, workerName, workDate);
}

function printContent(content, workerName, workDate) {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>${workerName} => ${workDate}</title>
            <style>
                @page {
                    margin: 0;
                }
                body {
                    font-family: 'Calibri', sans-serif;
                    margin: 1cm 1cm 1cm 2cm;
                    background-color: white;
                }
                .table-title {
                    text-align: center;
                    font-weight: bold;
                    font-size: 150%;
                    margin-bottom: 5px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    border: 1px solid black;
                    font-size: 80%;
                }
                th, td {
                    border: 1px solid black;
                    padding: 8px;
                }
                th {
                    font-weight: bold;
                }
                td {
                    vertical-align: middle;
                }
                th:nth-child(1), td:nth-child(1) {
                    width: 0.5cm;
                    text-align: center;
                }
                th:nth-child(2), td:nth-child(2) {
                    width: 5cm;
                }
                th:nth-child(3), td:nth-child(3) {
                    width: 1cm;
                    text-align: center;
                }
                th:nth-child(4), td:nth-child(4) {
                    width: 2cm;
                    text-align: center;
                }
                th:nth-child(5), td:nth-child(5) {
                    width: 4cm;
                }
                th:nth-child(6), td:nth-child(6) {
                    width: 3.3cm;
                }
                th:nth-child(7), td:nth-child(7) {
                    width: auto;
                }
                .no-data {
                    color: gray;
                }
                header, footer, nav, aside {
                    display: none;
                }
            </style>
        </head>
        <body>
            <div class="print-container">
                ${content}
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    }
                }
            </script>
        </body>
        </html>
    `);

    // Закрываем документ для печати
    printWindow.document.close();
}
window.printContent = printContent;

// ========== Фільтрування ==========
function openRouteFilter(container_count, cookie_value = null) {
    const container = document.getElementById('RouteFilterContainer');
    container.innerHTML = '';

    
    cookie_value ? createTaskTypeBlock(cookie_value[0]?.task_type) : createTaskTypeBlock();
    for (let i = 1; i <= container_count; i++) {
        const subArray = cookie_value ? cookie_value[i - 1] : null;
        createAutocompleteBlock(i, subArray);
    }

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'controlButtons';

    const addButton = document.createElement('div');
    addButton.className = 'add-button';
    if (container_count === 5) {
        addButton.style.display = 'none';
    }
    addButton.setAttribute('onclick', 'handleControlClick("add")');
    addButton.innerHTML = '<svg><use href="#plus_icon"></use></svg>';

    const removeButton = document.createElement('div');
    removeButton.className = 'remove-button';
    if (container_count === 1) {
        removeButton.style.display = 'none';
    }
    removeButton.setAttribute('onclick', 'handleControlClick("dell")');
    removeButton.innerHTML = '<svg><use href="#minus_icon"></use></svg>';

    buttonContainer.appendChild(addButton);
    buttonContainer.appendChild(removeButton);

    container.appendChild(buttonContainer);

    const hrElement = document.createElement('hr');
    hrElement.style.width = '100%';

    const filterButton = document.createElement('div');
    filterButton.className = 'filter_btn';
    filterButton.setAttribute('onclick', "applyFilter()");
    filterButton.textContent = 'Фільтрувати';

    const clearFilter = document.createElement('div');
    clearFilter.className = 'filter_btn';
    clearFilter.setAttribute('onclick', "clearFilter()");
    clearFilter.textContent = 'Скинути';

    container.appendChild(hrElement);
    container.appendChild(filterButton);
    container.appendChild(clearFilter);
}
window.openRouteFilter = openRouteFilter;

window.closeRouteFilter = function() {
    const container = document.getElementById('RouteFilterContainer');
    container.innerHTML = '';
}

window.clearFilter = function() {
    document.cookie = `${'filter_criteria'}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.querySelector('.navi.navi_grid3 .icon_navi').classList.remove('active');
    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "route", criteria: { worker: null, address: [] } } }));
    openRouteFilter(1)
}

window.applyFilter = function() {
    sendFilterRequest('all');
    closeFilterForm('ROUTE');
}

const specialColumnMapping = {
    spFilterTaskTypeInput0: '0TaskType',
    spFilterStreetInput1: '1StreetSpesial',
    spFilterArrayInput1: '1ArrBuildingSpesial',
    spFilterRangeStartInput1: '1StartBuildingSpesial',
    spFilterRangeEndInput1: '1EndBuildingSpesial',
    spFilterStreetInput2: '2StreetSpesial',
    spFilterArrayInput2: '2ArrBuildingSpesial',
    spFilterRangeStartInput2: '2StartBuildingSpesial',
    spFilterRangeEndInput2: '2EndBuildingSpesial',
    spFilterStreetInput3: '3StreetSpesial',
    spFilterArrayInput3: '3ArrBuildingSpesial',
    spFilterRangeStartInput3: '3StartBuildingSpesial',
    spFilterRangeEndInput3: '3EndBuildingSpesial',
    spFilterStreetInput4: '4StreetSpesial',
    spFilterArrayInput4: '4ArrBuildingSpesial',
    spFilterRangeStartInput4: '4StartBuildingSpesial',
    spFilterRangeEndInput4: '4EndBuildingSpesial',
    spFilterStreetInput5: '5StreetSpesial',
    spFilterArrayInput5: '5ArrBuildingSpesial',
    spFilterRangeStartInput5: '5StartBuildingSpesial',
    spFilterRangeEndInput5: '5EndBuildingSpesial'
};

function sendFilterRequest(activeField) {
    let criteria = {};
    let list;

    const taskTypeInput = document.getElementById('spFilterTaskTypeInput0');
    const taskTypeValue = taskTypeInput.value || '';

    if (activeField === 'all') {
        criteria = [];
        const specialFilterTab = document.getElementById('RouteFilterContainer');
        const autocompleteBlocks = specialFilterTab.querySelectorAll('.autocomplete');

        autocompleteBlocks.forEach(block => {
            const streetInput = block.querySelector('.addressInput');
            const streetId = streetInput.dataset.selectedId || '';
            
            const filterCriteria = block.querySelector('.filterCriteria');
            const arrayBlock = filterCriteria.querySelector('.filterCriteriaArray');
            const rangeBlock = filterCriteria.querySelector('.filterCriteriaRange');

            let criteriaObject = {
                task_type: taskTypeValue,
                street: streetId
            };
            switch (true) {
                case !!arrayBlock:
                    const displayTextarea = arrayBlock.querySelector('textarea[id*="spFilterArrayDisplayTextarea"]');
                    const arrayValue = displayTextarea ? displayTextarea.value : '';
                    criteriaObject.building_array = arrayValue;
                    break;
                case !!rangeBlock:
                    const startField = rangeBlock.querySelector('input[id*="spFilterRangeStartInput"]');
                    const endField = rangeBlock.querySelector('input[id*="spFilterRangeEndInput"]');
                    const startValue = startField.value || '';
                    const endValue = endField.value || '';
                    criteriaObject.building_start = startValue;
                    criteriaObject.building_end = endValue;
                    break;
                default:
                    console.error('Unknown filter criteria type');
            }
            criteria.push(criteriaObject);
        });
        list = 'all';

        const cookieName = 'filter_criteria';
        const cookieValue = JSON.stringify(criteria);
        const now = new Date();
        let expiryDate = new Date();
        if (now.getHours() < 7 || (now.getHours() === 7 && now.getMinutes() < 30)) {
            expiryDate.setHours(7, 30, 0, 0);
        } else if (now.getHours() < 18) {
            expiryDate.setHours(18, 0, 0, 0);
        } else if (now.getHours() < 23) {
            expiryDate.setHours(23, 0, 0, 0);
        } else {
            expiryDate = new Date(now.getTime() + (24 * 60 * 60 * 1000));
            expiryDate.setHours(7, 30, 0, 0);
        }
        const isEmpty = criteria.every(subCriteria => 
            ['task_type', 'street', 'building_array', 'building_start', 'building_end']
            .every(key => !subCriteria[key])
        );
        if (isEmpty) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            return;
        } else {
            document.cookie = `${cookieName}=${cookieValue}; expires=${expiryDate.toUTCString()}; path=/`;
            document.querySelector('.navi.navi_grid3 .icon_navi').classList.add('active');
        }
    } else {
        list = specialColumnMapping[activeField];

        if (list === '0TaskType') {
            criteria = 'task_type';
        } else {
            const parentBlock = document.getElementById(activeField).closest('.autocomplete');
            const filterButtons = parentBlock.querySelector('.filterButtons');
            const activeButtonIndex = Array.from(filterButtons.children).indexOf(filterButtons.querySelector('.filterBtn.active'));
    
            const streetField = parentBlock.querySelector('.addressInput');
            const streetValue = streetField.dataset.selectedId || '';
    
            if (activeButtonIndex === 0) {
                const displayTextarea = parentBlock.querySelector('textarea[id*="spFilterArrayDisplayTextarea"]');
                const arrayValue = displayTextarea ? displayTextarea.value : '';
                criteria = {
                    task_type: taskTypeValue,
                    street: streetValue,
                    building_array: arrayValue
                };
            } else {
                const startField = parentBlock.querySelector('input[id*="spFilterRangeStartInput"]');
                const endField = parentBlock.querySelector('input[id*="spFilterRangeEndInput"]');
                const startValue = startField.value || '';
                const endValue = endField.value || '';
                criteria = {
                    task_type: taskTypeValue,
                    street: streetValue,
                    building_start: startValue,
                    building_end: endValue
                };
            }
        }
    }

    const request_criteria = { 
        worker: null, 
        address: criteria
    };
    console.log('request_criteria', request_criteria);
    sendWebSocketMessage(JSON.stringify({
        action: "chernigiv",
        parameters: {
            page: "route",
            table: "filter",
            list: list,
            criteria: request_criteria
        }
    }));
    showAnimation('preloader');
}

function displayAutocompleteList(inputId, values) {
    let list, input;

    const mappedKey = Object.keys(specialColumnMapping).find(key => specialColumnMapping[key] === inputId);
    input = document.getElementById(mappedKey);
    list = document.getElementById(mappedKey.replace('Input', 'List'));

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
            if (input.id === 'spFilterTaskTypeInput0') {
                input.value = option.textContent;
                document.querySelectorAll('#FilterForm #RouteFilterContainer .autocomplete').forEach(block => block.remove());
                createAutocompleteBlock(1)
                list.style.display = 'none';
            } else if (input.id.startsWith('spFilterArrayInput')) {
                const displayTextareaId = input.id.replace('Input', 'DisplayTextarea');
                const displayTextarea = document.getElementById(displayTextareaId);
                if (displayTextarea) {
                    const currentValues = displayTextarea.value.split(',').map(val => val.trim());
                    if (currentValues.includes(option.textContent)) {
                        showModalMessage('RouteFilterDivDiscr', 'warning', `Номер будинку [ ${option.textContent} ] вже додано до масиву.`, 5000);
                    } else {
                        displayTextarea.value += displayTextarea.value ? `, ${option.textContent}` : option.textContent;
                    }
                } else {
                    console.error(`Textarea not found: ${displayTextareaId}`);
                }
            } else {
                input.value = option.textContent;
                if ('id' in option.dataset) {
                    input.dataset.selectedId = option.dataset.id;
                }
                list.style.display = 'none';
            }
        });
        list.appendChild(option);
    });
    
    list.style.display = 'block';
}

function createTaskTypeBlock(cookie_value = null) {
    const container = document.getElementById('RouteFilterContainer');
    const specialCriteria = document.createElement('div');
    specialCriteria.className = 'TaskTypeAutocomplete';

    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.className = 'addressInput';
    inputField.placeholder = 'Вид робіт';
    inputField.id = `spFilterTaskTypeInput0`;
    inputField.addEventListener('focus', () => {
        sendFilterRequest(inputField.id);
    });
    inputField.addEventListener('input', () => {
        filterClientSide(inputField.id, inputField.value);
    });
    if (cookie_value) {
        inputField.value = cookie_value;
    }

    const hrAfter = document.createElement('hr');
    hrAfter.style.width = '100%';

    const inputList = document.createElement('div');
    inputList.className = 'addressList autocomplete-list';
    inputList.style.display = 'none';
    inputList.id = `spFilterTaskTypeList0`;

    specialCriteria.appendChild(inputField);
    specialCriteria.appendChild(inputList);
    specialCriteria.appendChild(hrAfter);
    container.appendChild(specialCriteria);
}

function createAutocompleteBlock(index, cookie_value = null) {
    const container = document.getElementById('RouteFilterContainer');
    const specialCriteria = document.createElement('div');
    specialCriteria.className = 'autocomplete';

    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.className = 'addressInput';
    inputField.placeholder = 'Вулиця';
    inputField.id = `spFilterStreetInput${index}`;
    inputField.addEventListener('focus', () => {
        sendFilterRequest(inputField.id);
    });
    inputField.addEventListener('input', () => {
        filterClientSide(inputField.id, inputField.value);
    });

    
    if (cookie_value && cookie_value.street) {
        fetch(`php_server_data/RouteFilterGetStreet.php?streetId=${cookie_value.street}`)
            .then(response => response.json())
            .then(data => {
                if (data.street) {
                    inputField.value = data.street;
                    inputField.dataset.selectedId = cookie_value.street;
                } else {
                    console.error('Address not found');
                }
            })
            .catch(error => console.error('Error fetching address:', error));
    }


    const addressList = document.createElement('div');
    addressList.className = 'addressList autocomplete-list';
    addressList.style.display = 'none';
    addressList.id = `spFilterStreetList${index}`;

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'filterButtons';

    const filterArrayBtn = document.createElement('div');
    filterArrayBtn.textContent = 'Масив';
    filterArrayBtn.className = 'filterBtn';
    filterArrayBtn.setAttribute('onclick', 'handleBlockClick(event); toggleInputFields("array", this)');

    const filterRangeBtn = document.createElement('div');
    filterRangeBtn.textContent = 'Діапазон';
    filterRangeBtn.className = 'filterBtn';
    filterRangeBtn.setAttribute('onclick', 'handleBlockClick(event); toggleInputFields("range", this)');

    buttonContainer.appendChild(filterArrayBtn);
    buttonContainer.appendChild(filterRangeBtn);

    const filterCriteria = document.createElement('div');
    filterCriteria.className = 'filterCriteria';

    switch (true) {
        case cookie_value === null:
            filterCriteria.appendChild(createBuildingFilterBlock('array', index));
            filterArrayBtn.classList.add('active');
            break;
        case cookie_value.building_array !== undefined:
            filterCriteria.appendChild(createBuildingFilterBlock('array', index, cookie_value));
            filterArrayBtn.classList.add('active');
            break;
        case cookie_value.building_start !== undefined && cookie_value.building_end !== undefined:
            filterCriteria.appendChild(createBuildingFilterBlock('range', index, cookie_value));
            filterRangeBtn.classList.add('active');
            break;
    }

    specialCriteria.appendChild(inputField);
    specialCriteria.appendChild(addressList);
    specialCriteria.appendChild(buttonContainer);
    specialCriteria.appendChild(filterCriteria);

    const hrAfter = document.createElement('hr');
    hrAfter.style.width = '100%';
    specialCriteria.appendChild(hrAfter);

    container.insertBefore(specialCriteria, container.querySelector('.controlButtons'));
}

function createBuildingFilterBlock(type, index, values_array = null) {
    switch (type) {
        case 'array':
            const filterCriteriaArray = document.createElement('div');
            filterCriteriaArray.className = 'filterCriteriaArray';
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Діапазон номерів будинків';
            input.id = `spFilterArrayInput${index}`;
            input.addEventListener('focus', () => {
                sendFilterRequest(input.id);
            });
            input.addEventListener('input', () => {
                filterClientSide(input.id, input.value);
            });
            filterCriteriaArray.appendChild(input);

            const hiddenArrayList = document.createElement('div');
            hiddenArrayList.className = 'spFilterArray autocomplete-list';
            hiddenArrayList.style.display = 'none';
            hiddenArrayList.id = `spFilterArrayList${index}`;
            filterCriteriaArray.appendChild(hiddenArrayList);

            const displayTextarea = document.createElement('textarea');
            displayTextarea.placeholder = 'Вибрані номери будинків';
            displayTextarea.rows = 3;
            displayTextarea.id = `spFilterArrayDisplayTextarea${index}`;
            displayTextarea.readOnly = true;
            displayTextarea.style.pointerEvents = 'none';
            if (values_array) {
                displayTextarea.value = values_array.building_array;
            }
            filterCriteriaArray.appendChild(displayTextarea);

            return filterCriteriaArray
        case 'range':
            const rangeContainer = document.createElement('div');
            rangeContainer.className = 'filterCriteriaRange';

            const rangeBlockStart = document.createElement('div');
            const input1 = document.createElement('input');
            input1.type = 'text';
            input1.placeholder = 'від';
            input1.id = `spFilterRangeStartInput${index}`;
            input1.addEventListener('focus', () => {
                sendFilterRequest(input1.id);
            });
            input1.addEventListener('input', () => {
                filterClientSide(input1.id, input1.value);
            });
            if (values_array) {
                input1.value = values_array.building_start;
            }

            const hiddenRangeStartList = document.createElement('div');
            hiddenRangeStartList.className = 'spFilterRangeStartList autocomplete-list';
            hiddenRangeStartList.style.display = 'none';
            hiddenRangeStartList.id = `spFilterRangeStartList${index}`;
            hiddenRangeStartList.style.width = '100px';
            rangeBlockStart.appendChild(input1);
            rangeBlockStart.appendChild(hiddenRangeStartList);

            const rangeBlockEnd = document.createElement('div');
            const input2 = document.createElement('input');
            input2.type = 'text';
            input2.placeholder = 'до';
            input2.id = `spFilterRangeEndInput${index}`;
            input2.addEventListener('focus', () => {
                sendFilterRequest(input2.id);
            });
            input2.addEventListener('input', () => {
                filterClientSide(input2.id, input2.value);
            });
            if (values_array) {
                input2.value = values_array.building_end;
            }
            const hiddenRangeEndList = document.createElement('div');
            hiddenRangeEndList.className = 'spFilterRangeEndList autocomplete-list';
            hiddenRangeEndList.style.display = 'none';
            hiddenRangeEndList.id = `spFilterRangeEndList${index}`;
            hiddenRangeEndList.style.width = '100px';
            rangeBlockEnd.appendChild(input2);
            rangeBlockEnd.appendChild(hiddenRangeEndList);

            rangeContainer.appendChild(rangeBlockStart);
            rangeContainer.appendChild(rangeBlockEnd);

            return rangeContainer
    }
}

function toggleInputFields(type, element) {
    const specialCriteria = element.closest('.autocomplete');
    const filterCriteria = specialCriteria.querySelector('.filterCriteria');
    const index = Array.from(document.getElementById('RouteFilterContainer').querySelectorAll('.autocomplete')).indexOf(specialCriteria) + 1;

    filterCriteria.innerHTML = '';
    filterCriteria.appendChild(createBuildingFilterBlock(type, index));

    specialCriteria.querySelector('.filterBtn.active').classList.remove('active');
    element.classList.add('active');
}
window.toggleInputFields = toggleInputFields;

function handleControlClick(action) {
    const container = document.getElementById('RouteFilterContainer');
    const autocompleteBlocks = container.querySelectorAll('.autocomplete');
    const removeButton = container.querySelector('.controlButtons .remove-button');
    const addButton = container.querySelector('.controlButtons .add-button');

    switch(action) {
        case 'add':
            if (autocompleteBlocks.length < 5) {
                createAutocompleteBlock(autocompleteBlocks.length + 1);
                if (autocompleteBlocks.length === 4) {
                    addButton.style.display = 'none';
                }
                if (autocompleteBlocks.length > 0) {
                    removeButton.style.display = 'inline-block';
                }
            }
            break;
        case 'dell':
            if (autocompleteBlocks.length > 1) {
                container.removeChild(autocompleteBlocks[autocompleteBlocks.length - 1]);
                if (autocompleteBlocks.length === 2) {
                    removeButton.style.display = 'none';
                }
                if (autocompleteBlocks.length < 6) {
                    addButton.style.display = 'inline-block';
                }
            }
            break;
        default:
            console.error('Unknown action for handleControlClick:', action);
    }
}
window.handleControlClick = handleControlClick;

function countAdressesMeters(array = null) {
    const rootDateBar = document.getElementById('route-date-bar');
    const statisticBlock = document.getElementById('statistic-block');
    if (!rootDateBar || !statisticBlock) {
        console.log('RootDateBar not found!');
        return;
    }
    let address_count = '';
    let meters_count = '';
    if (array) {
        address_count = array.length;
        meters_count = array.reduce((total, item) => {
            return total + (item.meters ? item.meters : 0);
        }, 0);
    } else {
        if (!rootDateBar || !statisticBlock) {
            console.log('RootDateBar not found!');
            return;
        }
        const meterElements = rootDateBar.querySelectorAll('.page_card_value_route[data-meters]');
        address_count = rootDateBar.getElementsByClassName('page_column').length;
        meters_count = Array.from(meterElements).reduce((total, element) => {
            return total + parseInt(element.getAttribute('data-meters'), 10);
        }, 0);
    }
    statisticBlock.innerHTML = `Адрес: ${address_count}. Лічильників: ${meters_count}.`;
}

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

// ========== Форма виводу файлу EXCEL ==========
function LoadExcelRoute() {
    if (window.innerWidth < 1200) {
        alert('Для завантаження маршруту в файл EXCEL ширина сторінки повинна бути не менше 1200 пікселів!');
        return;
    }
    const topBar = document.getElementById("route-top-bar");
    const currentDateBlock = document.getElementById("current-date-block");
    const activeWorkerElement = topBar.querySelector('.active');
    if (!activeWorkerElement) {
        showAnimation('cancel', null, animation_time/1000);
        setTimeout(() => {
            hideAnimation();
            showModalMessage('no-worker-selected', 'alert', 'Для завантаження<br>маршруту у файлі EXCEL<br>необхідно обрати виконавця.', 5000);
        }, animation_time);
        return;
    }
    
    const dateBar = document.getElementById("route-date-bar");
    const activeTaskElement = dateBar.querySelector('.page_column');
    if (!activeTaskElement) {
        showAnimation('warning', null, animation_time/1000);
        setTimeout(() => {
            hideAnimation();
            showModalMessage('route-calendar', 'warning', 'Для цього виконавця<br>за обраною датою<br>маршрут відсутній.', 5000);
        }, animation_time);
        return;
    }

    const workerName = activeWorkerElement.textContent;
    const workDate = currentDateBlock.getAttribute('data-curr-work-date');
    const criteria = { worker: workerName, work_date: workDate };
    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "route", table: "excel", criteria: criteria }}));
}
window.LoadExcelRoute = LoadExcelRoute;

function downloadExcelFile(response) {
    if (response.status === 'success') {
        const byteCharacters = atob(response.file_content);
        const byteNumbers = new Array(byteCharacters.length).fill().map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = response.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        logMessage('reports', 'ROUTE', '[INFO]', `Користувачем [${user_name}] завантажено Excel файл [${response.file_name}]`);
                    
    } else if (response.status === 'error') {
        showAnimation('cancel', null, animation_time/1000);
        setTimeout(() => {
            hideAnimation();
            showModalMessage('route-calendar', 'alert', 'Error: ' + response.message, 5000);
        }, animation_time);
    } else {
        showAnimation('cancel', null, animation_time/1000);
        setTimeout(() => {
            hideAnimation();
            showModalMessage('route-calendar', 'alert', 'Unknown response status for downloadExcelFile:', response.status, 5000);
        }, animation_time);
    }
}