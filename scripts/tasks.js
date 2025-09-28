import { connectWebSocket, sendWebSocketMessage } from './websocket.js';

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

connectWebSocket(token, 'SUMY-TASKS', handleServerData, handleConnectionClose).then(() => {
    showAnimation('preloader');
    sendWebSocketMessage(JSON.stringify({ action: "sumy", parameters: { page: "tasks", table: "tasks" } }));
}).catch(error => {
    console.error('Failed to connect:', error);
    hideAnimation();
});

var dataFromDB = [];

function handleServerData(event) {
    const data = JSON.parse(event.data);
    dataFromDB = data.data;
    // console.info('Server: '+event.data)

    if (data.action === "tasksResponse") {
        dataFromDB.sort((a, b) => new Date(a.date) - new Date(b.date));
        displayDataOnPage(dataFromDB);
    }
}

function handleConnectionClose(page) {
    const container = document.getElementById('task-container');
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
                                    Спробуйте перейти на ГОЛОВНУ сторінку, а потім повернутися на сторінку Зявок.<br>Якщо проблема не знакає, зверніться до адміністратора.
                                </div>
                            </div>`;
    hideAnimation();
}

const tasksFieldLabels = {
    date: 'Дата',
    type: 'Вид робіт',
    address: 'Адреса',
    phone: 'Телефон',
    district: 'Район',
    brigade: 'Працівники',
    date_working: 'Виконання',
    date_uninstall: 'Демонтаж',
    date_install: 'Монтаж',
    date_verification: 'Повірка',
    cost: 'Вартість',
    pay_method: 'Спосіб оплати',
    status: 'Статус',
    note: 'Примітки'
};

function displayDataOnPage(data) {
    const container = document.getElementById('task-container');
    if (!container) {
        console.error('Container element not found');
        return;
    }

    container.innerHTML = '';

    data.forEach(task => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'page_column';

        const cardDiv = document.createElement('div');
        cardDiv.classList.add('page_card', 'tasks_page_card');

        // Создаем блок для date и type
        const headerDiv = document.createElement('div');
        headerDiv.className = 'page_card_title';

        // Обработка поля date
        const dateDiv = document.createElement('div');
        dateDiv.textContent = task.date ? formatDate(task.date) : 'Не вказано';
        dateDiv.style.fontWeight = 'bold';
        dateDiv.style.fontSize = '120%';
        dateDiv.style.textAlign = 'center';
        headerDiv.appendChild(dateDiv);

        // Обработка поля type
        const typeDiv = document.createElement('div');
        typeDiv.textContent = task.type || 'Не вказано';
        typeDiv.style.fontWeight = 'bold';
        typeDiv.style.fontSize = '120%';
        typeDiv.style.textAlign = 'center';
        headerDiv.appendChild(typeDiv);

        cardDiv.appendChild(headerDiv);

        // Перебор и отображение всех остальных полей задач
        Object.keys(tasksFieldLabels).forEach(field => {
            if (field !== 'date' && field !== 'type') {
                const fieldDiv = document.createElement('div');
                fieldDiv.className = 'page_card_value';
                fieldDiv.setAttribute('data-label', tasksFieldLabels[field] + ':');
                
                // Обработка остальных полей по их типу
                switch (field) {
                    case 'address':
                        // Обработка поля 'address' с разделением на улицу и детали
                        const streetDiv = document.createElement('div');
                        streetDiv.className = 'task_card_address_street';
                        streetDiv.textContent = task.address.new_name || 'Не вказано';

                        const detailsDiv = document.createElement('div');
                        detailsDiv.className = 'task_card_address_details';
                        let addressDetails = `буд. ${task.address.adr_building}`;
                        if (task.address.adr_building2 && task.address.adr_building2 !== "0") {
                            addressDetails += `, корп. ${task.address.adr_building2}`;
                        }
                        if (task.address.adr_fl_of) {
                            addressDetails += task.address.adr_fl_of !== "п/сектор" ? `, кв. ${task.address.adr_fl_of}` : `, ${task.address.adr_fl_of}`;
                        }
                        detailsDiv.textContent = addressDetails;
                        fieldDiv.appendChild(streetDiv);
                        fieldDiv.appendChild(detailsDiv);
                        break;
                    case 'phone':
                        fieldDiv.textContent = task.address && task.address.phone ? formatPhoneNumber(task.address.phone) : 'Не вказано';
                        break;
                    case 'district':
                        fieldDiv.textContent = task.address && task.address.district ? task.address.district : 'Не вказано';
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
                            fieldDiv.textContent = 'Не вказано';
                        }
                        break;
                    default:
                        fieldDiv.textContent = task[field] || 'Не вказано';
                }

                cardDiv.appendChild(fieldDiv);
            }
        });

        columnDiv.appendChild(cardDiv);
        container.appendChild(columnDiv);
    });

    hideAnimation();
}

function formatDate(dateString) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', options);
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
    return formattedNumbers.join(', ');
}