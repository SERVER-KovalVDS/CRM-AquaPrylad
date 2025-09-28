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

let messageInterval;
async function initialize() {
    await fetchSessionData();
    try {
        showAnimation('preloader');
        await connectWebSocket(token, 'SETTINGS', handleServerData, handleConnectionClose);
        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "settings", table: "connected_users" } }));
        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "settings", table: "blocked_ips" } }));
        hideAnimation();
        messageInterval = setInterval(() => {
            sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "settings", table: "connected_users" } }));
        }, 5000);
    } catch (error) {
        console.error('Failed to connect:', error);
        hideAnimation();
    }
}
initialize();

function handleServerData(event) {
    const data = JSON.parse(event.data);
    switch (data.action) {
        case "connected_usersResponse":
            // console.log("Received Users:", event.data);
            DisplayConnectedUsers(data.data);
            break;
        case "blocked_ipsResponse":
            // console.log("Received Blocked IPs:", event.data);
            DisplayBlockedIPs(data.data);
            break;
        default:
            handleServerDataGeneral(event);
            break;
    }
}

function handleConnectionClose(code) {
    handleConnectionCloseMessage(code, 'main_block');
    hideAnimation();
    closeAllAlerts();
    clearInterval(messageInterval);
}

function DisplayConnectedUsers(users) {
    const container = document.getElementById('connected_users-container');
    container.innerHTML = '';

    const table = document.createElement('table');
    table.classList.add('blink');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['№', 'Користувач', 'Статус', 'Сторінки', 'В системі'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    users.forEach((user, index) => {
        const currentTime = new Date();
        const globalTime = user.globalStartTime ? new Date(user.globalStartTime) : null;

        const globalTimeDiff = globalTime ? Math.floor((currentTime - globalTime) / 60000) : null;

        const formatTime = (minutes) => {
            const hrs = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return `${hrs} год. ${mins} хв.`;
        };

        const row = document.createElement('tr');
        const cellIndex = document.createElement('td');
        cellIndex.textContent = index + 1;
        row.appendChild(cellIndex);

        const cellName = document.createElement('td');
        cellName.textContent = user.fullName;
        row.appendChild(cellName);

        const cellStatus = document.createElement('td');
        const statusSpan = document.createElement('span');
        statusSpan.textContent = user.status === 'connected' ? '🧑‍💻' : '💤';
        cellStatus.appendChild(statusSpan);
        row.appendChild(cellStatus);

        const cellPages = document.createElement('td');
        if (user.pages && user.pages.length > 0) {
            user.pages.forEach((pageData, pageIndex) => {
                const pageTime = Math.floor((currentTime - new Date(pageData.currentStartTime)) / 60000);
                
                // Создание div для отображения страницы и времени на странице
                const pageDiv = document.createElement('div');
                const pageNameDiv = document.createElement('div');
                const pageTimeDiv = document.createElement('div');

                pageNameDiv.textContent = pageData.page;
                pageTimeDiv.textContent = formatTime(pageTime);

                pageDiv.appendChild(pageNameDiv);
                pageDiv.appendChild(pageTimeDiv);
                
                // Добавление линии <hr> между страницами, кроме последней
                if (user.pages.length > 1 && pageIndex < user.pages.length - 1) {
                    const hr = document.createElement('hr');
                    pageDiv.appendChild(hr);
                }

                cellPages.appendChild(pageDiv);
            });
        } else {
            cellPages.textContent = '';
        }
        row.appendChild(cellPages);

        const cellGlobalTime = document.createElement('td');
        cellGlobalTime.textContent = globalTimeDiff !== null ? formatTime(globalTimeDiff) : '';
        row.appendChild(cellGlobalTime);
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    setTimeout(() => {
        table.classList.remove('blink');
    }, 500);
}

function DisplayBlockedIPs(ips) {
    const container = document.getElementById('blocked_ip-container');
    container.innerHTML = '';  // Очищаем контейнер перед добавлением новых данных

    // Словарь с флагами стран
    const countryFlags = {
        'United States': '🇺🇸',
        'United Kingdom': '🇬🇧',
        'France': '🇫🇷',
        'Germany': '🇩🇪',
        'Canada': '🇨🇦',
        'The Netherlands': '🇳🇱',
        'Ireland': '🇮🇪',
        'India': '🇮🇳',
        'Philippines': '🇵🇭',
        'Russia': '🇷🇺',
        'Cyprus': '🇨🇾',
        'Lithuania': '🇱🇹',
        'Uzbekistan': '🇺🇿',
        'Switzerland': '🇨🇭',
        'Indonesia': '🇮🇩',
        'Singapore': '🇸🇬',
        'Poland': '🇵🇱',
        'China': '🇨🇳',
        'Hong Kong': '🇭🇰',
        'Italy': '🇮🇹',
    };

    // Встроенная функция для проверки значения и добавления класса, если данных нет
    function checkValue(value, element) {
        if (!value) {
            element.classList.add('no-data');  // Добавляем класс, если значение отсутствует
            return 'Невідомо';
        }
        return value;
    }

    // Функция для получения флага страны и её названия
    function getCountryWithFlag(country) {
        const flag = countryFlags[country] || '';  // Получаем флаг страны из словаря, если нет - пустая строка
        return flag ? `<span style="font-size: 300%;">"${flag}</span><br>${country}` : country;  // Возвращаем флаг с переносом строки или только страну
    }

    // Создаем таблицу
    const table = document.createElement('table');
    table.classList.add('blink');

    // Создаем заголовки таблицы
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = ['№', 'IP адреса', 'User Agent', 'Країна', 'Місто', 'Причина', 'Опис'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Создаем тело таблицы
    const tbody = document.createElement('tbody');

    ips.forEach((ipData, index) => {
        const row = document.createElement('tr');

        // Порядковый номер
        const cellIndex = document.createElement('td');
        cellIndex.textContent = index + 1;
        row.appendChild(cellIndex);

        // IP адрес
        const cellIP = document.createElement('td');
        let ipAddress = `${ipData.ip1}.${ipData.ip2}.${ipData.ip3}`;
        if (ipData.ip4 !== null) {
            ipAddress += `.${ipData.ip4}`;  // Стандартный IP адрес
        } else {
            ipAddress += `.0/24`;  // Пул IP адресов
        }
        cellIP.textContent = ipAddress;
        row.appendChild(cellIP);

        // User Agent
        const cellUserAgent = document.createElement('td');
        cellUserAgent.textContent = checkValue(ipData.user_agent, cellUserAgent);  // Используем функцию checkValue
        row.appendChild(cellUserAgent);

        // Страна с флагом
        const cellCountry = document.createElement('td');
        cellCountry.innerHTML = getCountryWithFlag(checkValue(ipData.country, cellCountry));  // Добавляем страну с флагом
        row.appendChild(cellCountry);

        // Город
        const cellCity = document.createElement('td');
        cellCity.textContent = checkValue(ipData.city, cellCity);  // Используем функцию checkValue
        row.appendChild(cellCity);

        // Причина блокировки
        const cellBlockReason = document.createElement('td');
        cellBlockReason.textContent = checkValue(ipData.block_reason, cellBlockReason);  // Используем функцию checkValue
        row.appendChild(cellBlockReason);

        // Описание
        const cellDescription = document.createElement('td');
        cellDescription.textContent = checkValue(ipData.description, cellDescription);  // Используем функцию checkValue
        row.appendChild(cellDescription);

        // Добавляем строку в тело таблицы
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    // Убираем класс "blink" после 500 мс для анимации
    setTimeout(() => {
        table.classList.remove('blink');
    }, 500);
}